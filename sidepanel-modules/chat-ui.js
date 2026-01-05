// Readify Extension - Chat UI Module
// Handles the AI chat panel (slide-in) in the sidepanel

let pageContext = null;
let isStreaming = false;

// Track current voice conversation state
let pendingUserMsgEl = null;
let currentAssistantMsgEl = null;
let lastTranscript = '';
let awaitingTranscript = false;

// Initialize chat UI
function initChatUI() {
    setupChatEventListeners();
    setupVoiceCallbacks();
}

// Setup event listeners
function setupChatEventListeners() {
    const openChatBtn = document.getElementById('openChatBtn');
    const chatBackBtn = document.getElementById('chatBackBtn');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInput = document.getElementById('chatInput');
    const chatVoiceBtn = document.getElementById('chatVoiceBtn');
    const voiceOverlay = document.getElementById('voiceOverlay');
    const voiceStopBtn = document.getElementById('voiceStopBtn');
    const chatMessages = document.getElementById('chatMessages');
    
    // Open chat panel
    openChatBtn?.addEventListener('click', openChatPanel);
    
    // Close chat panel
    chatBackBtn?.addEventListener('click', closeChatPanel);
    
    // Send message
    chatSendBtn?.addEventListener('click', handleSendMessage);
    
    // Send on Enter (but not Shift+Enter)
    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Auto-resize textarea and show scrollbar when needed
    chatInput?.addEventListener('input', () => {
        // Reset height to auto to get accurate scrollHeight
        chatInput.style.height = 'auto';
        
        // Get the computed max-height from CSS
        const computedStyle = window.getComputedStyle(chatInput);
        const maxHeight = parseInt(computedStyle.maxHeight) || 200;
        
        // Set height to scrollHeight but respect max-height
        const scrollHeight = chatInput.scrollHeight;
        chatInput.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        
        // Show scrollbar only when content exceeds max height
        if (scrollHeight > maxHeight) {
            chatInput.classList.add('has-overflow');
        } else {
            chatInput.classList.remove('has-overflow');
        }
    });
    
    // Voice button
    chatVoiceBtn?.addEventListener('click', toggleVoiceMode);
    
    // Voice overlay click to stop
    voiceOverlay?.addEventListener('click', (e) => {
        if (e.target === voiceOverlay) {
            stopVoiceMode();
        }
    });
    
    // Voice stop button
    voiceStopBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        stopVoiceMode();
    });
    
    // Suggestion clicks
    chatMessages?.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-suggestion')) {
            const prompt = e.target.dataset.prompt;
            if (prompt && chatInput) {
                chatInput.value = prompt;
                handleSendMessage();
            }
        }
    });
    
    // Premium required modal buttons
    const premiumRequiredModal = document.getElementById('premiumRequiredModal');
    const premiumRequiredCancelBtn = document.getElementById('premiumRequiredCancelBtn');
    const premiumRequiredUpgradeBtn = document.getElementById('premiumRequiredUpgradeBtn');
    
    premiumRequiredCancelBtn?.addEventListener('click', hidePremiumRequiredModal);
    premiumRequiredUpgradeBtn?.addEventListener('click', handlePremiumUpgrade);
    
    // Close modal when clicking outside
    premiumRequiredModal?.addEventListener('click', (e) => {
        if (e.target === premiumRequiredModal) {
            hidePremiumRequiredModal();
        }
    });
}

// Setup voice service callbacks
function setupVoiceCallbacks() {
    if (window.ReadifyVoice) {
        window.ReadifyVoice.init({
            onStatusChange: handleVoiceStatusChange,
            onTranscript: handleVoiceTranscript,
            onAssistantText: handleAssistantText,
            onAssistantDone: handleAssistantDone,
            onError: handleVoiceError,
        });
    }
}

// Open chat panel
async function openChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    if (!chatPanel) return;
    
    // Check if user has premium access
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (!isPremium) {
            // Show upgrade prompt for non-premium users
            showPremiumRequired();
            return;
        }
    } else {
        // No subscription service - block access
        showPremiumRequired();
        return;
    }
    
    chatPanel.classList.add('open');
    
    // Load page context
    await loadPageContext();
    
    // Update welcome text
    updateWelcomeMessage();
}

// Show premium required modal
function showPremiumRequired() {
    const modal = document.getElementById('premiumRequiredModal');
    const modalText = document.getElementById('premiumRequiredText');
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Update text for non-logged in users
        if (modalText) {
            modalText.textContent = 'Please sign in and upgrade to Premium to access AI Chat.';
        }
    } else {
        // Text for logged in free users
        if (modalText) {
            modalText.textContent = 'AI Chat is a Premium feature. Upgrade to unlock unlimited AI conversations about any webpage.';
        }
    }
    
    // Show the modal
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Hide premium required modal
function hidePremiumRequiredModal() {
    const modal = document.getElementById('premiumRequiredModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle premium upgrade button click
function handlePremiumUpgrade() {
    hidePremiumRequiredModal();
    
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Show auth section for non-logged in users
        const authSection = document.getElementById('authSection');
        if (authSection) {
            authSection.style.display = 'block';
        }
    } else {
        // Trigger upgrade flow for logged in users
        if (window.ReadifyStripe) {
            window.ReadifyStripe.createCheckout();
        } else if (window.ReadifySubscription) {
            window.ReadifySubscription.createCheckoutSession();
        }
    }
}

// Close chat panel
function closeChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) {
        chatPanel.classList.remove('open');
    }
    
    // Stop voice if active
    stopVoiceMode();
}

// Load page context from current tab
async function loadPageContext() {
    try {
        if (window.ReadifyChat?.getPageContent) {
            pageContext = await window.ReadifyChat.getPageContent();
            console.log('[Chat] Page context loaded:', pageContext?.title);
        }
    } catch (e) {
        console.error('[Chat] Failed to load page context:', e);
    }
}

// Update welcome message with page title
function updateWelcomeMessage() {
    const welcomeText = document.getElementById('chatWelcomeText');
    const headerTitle = document.querySelector('.chat-header-page-title');
    
    if (pageContext?.title) {
        // Truncate title for display
        const shortTitle = pageContext.title.length > 40 
            ? pageContext.title.substring(0, 40) + '...' 
            : pageContext.title;
        
        // Update welcome text (shown before first message)
        if (welcomeText) {
            welcomeText.innerHTML = `I've read "<strong>${shortTitle}</strong>"<br>Ask me anything about it!`;
        }
        
        // Update header title (always visible, even after chat starts)
        if (headerTitle) {
            headerTitle.textContent = shortTitle;
        }
    }
}

// Toggle voice mode
async function toggleVoiceMode() {
    if (window.ReadifyVoice?.isActive()) {
        stopVoiceMode();
    } else {
        startVoiceMode();
    }
}

// Start voice mode
async function startVoiceMode() {
    const voiceOverlay = document.getElementById('voiceOverlay');
    const chatVoiceBtn = document.getElementById('chatVoiceBtn');
    
    // Refresh page context
    await loadPageContext();
    
    // Reset state
    resetVoiceState();
    
    // Show overlay
    voiceOverlay?.classList.add('active');
    chatVoiceBtn?.classList.add('active');
    
    // Start voice service
    window.ReadifyVoice?.start(pageContext);
}

// Stop voice mode
function stopVoiceMode() {
    const voiceOverlay = document.getElementById('voiceOverlay');
    const chatVoiceBtn = document.getElementById('chatVoiceBtn');
    
    // Hide overlay
    voiceOverlay?.classList.remove('active');
    chatVoiceBtn?.classList.remove('active');
    
    // Stop voice service
    if (window.ReadifyVoice?.isActive()) {
        window.ReadifyVoice.stop();
    }
    
    // Reset state
    resetVoiceState();
}

// Reset voice conversation state
function resetVoiceState() {
    pendingUserMsgEl = null;
    currentAssistantMsgEl = null;
    lastTranscript = '';
    awaitingTranscript = false;
}

// Handle send message (text mode)
async function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput?.value?.trim();
    
    if (!message || isStreaming) return;
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Remove welcome if present
    removeWelcome();
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Create assistant message container
    const assistantMsgEl = addMessageToChat('assistant', '', true);
    
    isStreaming = true;
    updateSendButton(true);
    
    // Stream response
    await window.ReadifyChat?.streamMessage(
        message,
        pageContext,
        // onChunk
        (chunk, fullText) => {
            updateMessageContent(assistantMsgEl, fullText);
        },
        // onDone
        (fullText) => {
            isStreaming = false;
            updateSendButton(false);
            scrollToBottom();
        },
        // onError
        (error) => {
            isStreaming = false;
            updateSendButton(false);
            updateMessageContent(assistantMsgEl, `Error: ${error.message}`);
            assistantMsgEl.classList.add('error');
        }
    );
}

// Remove welcome message
function removeWelcome() {
    const welcome = document.getElementById('chatWelcome');
    if (welcome) {
        welcome.remove();
    }
}

// Add message to chat container
function addMessageToChat(role, content, streaming = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;
    
    // Remove welcome
    removeWelcome();
    
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.dataset.timestamp = Date.now();
    
    if (streaming && !content) {
        msgEl.innerHTML = '<span class="typing-indicator">...</span>';
    } else {
        msgEl.textContent = content;
    }
    
    chatMessages.appendChild(msgEl);
    scrollToBottom();
    
    return msgEl;
}

// Update message content (for streaming)
function updateMessageContent(msgEl, content) {
    if (!msgEl) return;
    msgEl.innerHTML = formatMessage(content);
    scrollToBottom();
}

// Format message (basic markdown support)
function formatMessage(text) {
    if (!text) return '';
    
    // Escape HTML first
    let formatted = escapeHtml(text);
    
    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code: `text`
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll chat to bottom
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Update send button state
function updateSendButton(loading) {
    const chatSendBtn = document.getElementById('chatSendBtn');
    if (chatSendBtn) {
        chatSendBtn.disabled = loading;
        if (loading) {
            chatSendBtn.innerHTML = '<span class="loading-dots">...</span>';
        } else {
            chatSendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
        }
    }
}

// Voice status change handler
function handleVoiceStatusChange(status) {
    const voiceText = document.getElementById('voiceText');
    
    const statusMessages = {
        'connecting': 'Connecting...',
        'listening': 'Listening...',
        'processing': 'Processing...',
        'speaking': 'AI is speaking...',
        'idle': 'Tap to start',
        'disconnected': 'Disconnected',
        'error': 'Error occurred',
    };
    
    if (voiceText) {
        voiceText.textContent = statusMessages[status] || status;
    }
    
    // When processing starts (user stopped speaking), add placeholder for user message
    if (status === 'processing') {
        removeWelcome();
        if (!pendingUserMsgEl) {
            pendingUserMsgEl = addMessageToChat('user', '...', true);
            awaitingTranscript = true;
        }
    }
    
    // When we go back to listening (after response or interruption), reset for next turn
    if (status === 'listening') {
        currentAssistantMsgEl = null;
    }
    
    // If disconnected or error, close the overlay
    if (status === 'disconnected' || status === 'error') {
        const voiceOverlay = document.getElementById('voiceOverlay');
        const chatVoiceBtn = document.getElementById('chatVoiceBtn');
        voiceOverlay?.classList.remove('active');
        chatVoiceBtn?.classList.remove('active');
    }
}

// Voice transcript handler - called when user's speech is transcribed
function handleVoiceTranscript(text, role) {
    if (role === 'user' && text) {
        // Avoid duplicate messages for the same transcript
        if (text === lastTranscript) {
            return;
        }
        lastTranscript = text;
        
        // Update the pending placeholder if it exists
        if (pendingUserMsgEl) {
            updateMessageContent(pendingUserMsgEl, text);
            pendingUserMsgEl = null;
        } else {
            // No placeholder - create a new message
            addMessageToChat('user', text);
        }
        
        awaitingTranscript = false;
    }
}

// Assistant text handler (voice mode) - called as assistant speaks
function handleAssistantText(chunk, fullText) {
    // If we don't have an assistant message for this turn, create one
    if (!currentAssistantMsgEl) {
        currentAssistantMsgEl = addMessageToChat('assistant', '', true);
    }
    updateMessageContent(currentAssistantMsgEl, fullText);
}

// Assistant done handler - called when assistant finishes speaking
function handleAssistantDone(fullText) {
    // Only update if we have an existing streaming message
    if (currentAssistantMsgEl) {
        updateMessageContent(currentAssistantMsgEl, fullText);
        currentAssistantMsgEl = null;
    }
}

// Voice error handler
function handleVoiceError(error) {
    console.error('[Chat] Voice error:', error);
    
    // Remove pending placeholder on error
    if (pendingUserMsgEl) {
        pendingUserMsgEl.remove();
        pendingUserMsgEl = null;
    }
    
    const voiceText = document.getElementById('voiceText');
    if (voiceText) {
        voiceText.textContent = error.message || 'Error occurred';
    }
    
    // Auto-close voice overlay after error
    setTimeout(() => {
        stopVoiceMode();
    }, 2000);
}

// Clear chat history
function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        // Restore welcome
        chatMessages.innerHTML = `
            <div class="chat-welcome" id="chatWelcome">
                <div class="chat-welcome-icon">💬</div>
                <div class="chat-welcome-title">Chat about this page</div>
                <div class="chat-welcome-text" id="chatWelcomeText">
                    Ask me anything about the current page!
                </div>
                <div class="chat-suggestions">
                    <button class="chat-suggestion" data-prompt="Summarize this page">📝 Summarize</button>
                    <button class="chat-suggestion" data-prompt="What are the key points?">🎯 Key points</button>
                    <button class="chat-suggestion" data-prompt="Explain this in simple terms">💡 Simplify</button>
                </div>
            </div>
        `;
        
        // Re-apply page context to welcome message
        updateWelcomeMessage();
    }
    window.ReadifyChat?.resetHistory(null);
    resetVoiceState();
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.ReadifyChatUI = {
        init: initChatUI,
        openPanel: openChatPanel,
        closePanel: closeChatPanel,
        clearChat,
        loadPageContext,
    };
}
