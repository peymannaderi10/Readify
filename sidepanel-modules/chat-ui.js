// Readify Extension - Chat UI Module
// Handles the AI chat panel (slide-in) in the sidepanel

let pageContext = null;
let isStreaming = false;

// Track current voice conversation state
let pendingUserMsgEl = null;
let currentAssistantMsgEl = null;
let lastTranscript = '';
let awaitingTranscript = false;

// Context monitoring state
let lastKnownUrl = null;
let lastKnownTitle = null;

// Initialize chat UI
function initChatUI() {
    setupChatEventListeners();
    setupVoiceCallbacks();
    initUsageMeter();
    setupContextMonitoring();
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
    const premiumRequiredCloseBtn = document.getElementById('premiumRequiredCloseBtn');

    premiumRequiredCancelBtn?.addEventListener('click', hidePremiumRequiredModal);
    premiumRequiredUpgradeBtn?.addEventListener('click', handlePremiumUpgrade);
    premiumRequiredCloseBtn?.addEventListener('click', hidePremiumRequiredModal);

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
            onUsageUpdate: handleVoiceUsageUpdate,
        });
    }
}

// ============================================
// Context Monitoring - Detect page changes
// ============================================

/**
 * Setup context change monitoring
 * Listens for messages from page-observer.js and background.js
 */
function setupContextMonitoring() {
    // Listen for context change messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'contextChanged') {
            handleContextChange(message);
        }
    });

    // Also monitor active tab changes
    chrome.tabs.onActivated?.addListener(handleTabActivated);

    console.log('[Chat] Context monitoring initialized');
}

/**
 * Handle context change notification
 * Called when URL, title, or content changes on the page
 */
async function handleContextChange(message) {
    const { url, title, previousUrl, reason } = message;

    console.log('[Chat] Context change detected:', reason, {
        previousUrl,
        newUrl: url,
        newTitle: title
    });

    // Clear content cache so next loadPageContext fetches fresh content
    if (window.ReadifyChat?.clearContentCache) {
        window.ReadifyChat.clearContentCache();
    }

    // Update tracked state
    lastKnownUrl = url;
    lastKnownTitle = title;

    // If chat panel is open, refresh context (but keep chat history)
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel?.classList.contains('open')) {
        await refreshChatContext();
    }

    // If voice mode is active, update the session context dynamically
    if (window.ReadifyVoice?.isActive()) {
        await updateVoiceSessionContext(title);
    }
}

/**
 * Update voice session context when page changes during active session
 */
async function updateVoiceSessionContext(newTitle) {
    // Load fresh page content
    await loadPageContext(true);

    // Update the voice session with new context
    if (pageContext && window.ReadifyVoice?.updateContext) {
        const updated = window.ReadifyVoice.updateContext(pageContext);
        
        if (updated) {
            // Show visual indicator that context was updated
            showVoiceContextChangeIndicator(newTitle || pageContext.title);
        }
    }
}

/**
 * Show indicator in voice overlay that page context has been updated
 */
function showVoiceContextChangeIndicator(newTitle) {
    const voiceSubtext = document.querySelector('.voice-subtext');
    if (voiceSubtext) {
        const shortTitle = newTitle && newTitle.length > 30 
            ? newTitle.substring(0, 30) + '...' 
            : newTitle;
        
        // Show temporary message about context update
        voiceSubtext.textContent = `✓ Context updated: ${shortTitle || 'New page'}`;
        voiceSubtext.classList.add('context-changed');
        
        // Revert after a few seconds
        setTimeout(() => {
            if (window.ReadifyVoice?.isActive()) {
                voiceSubtext.textContent = 'Tap to end call';
                voiceSubtext.classList.remove('context-changed');
            }
        }, 3000);
    }
}

/**
 * Refresh chat context when page changes
 * Updates the context without clearing chat history - users can continue their conversation
 */
async function refreshChatContext() {
    console.log('[Chat] Refreshing context (keeping chat history)');

    // Force refresh page context
    await loadPageContext(true);

    // Update the header and welcome message
    updateWelcomeMessage();

    // Show a subtle indicator that context was refreshed
    showContextRefreshIndicator();

    // Note: We intentionally keep chat history so users can continue their conversation
    // The AI will use the new page context for subsequent messages
}

/**
 * Show a subtle indicator that context was refreshed
 */
function showContextRefreshIndicator() {
    const headerTitle = document.querySelector('.chat-header-page-title');
    if (headerTitle) {
        // Brief flash effect to indicate refresh
        headerTitle.classList.add('context-refreshed');
        setTimeout(() => {
            headerTitle.classList.remove('context-refreshed');
        }, 1000);
    }
}

/**
 * Handle tab activation (user switches to different tab)
 */
async function handleTabActivated(activeInfo) {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab?.url && tab.url !== lastKnownUrl) {
            console.log('[Chat] Tab switched, new URL:', tab.url);

            // Clear content cache
            if (window.ReadifyChat?.clearContentCache) {
                window.ReadifyChat.clearContentCache();
            }

            lastKnownUrl = tab.url;
            lastKnownTitle = tab.title;

            // If chat panel is open, refresh context (but keep chat history)
            const chatPanel = document.getElementById('chatPanel');
            if (chatPanel?.classList.contains('open')) {
                refreshChatContext();
            }
        }
    } catch (e) {
        console.error('[Chat] Failed to get tab info:', e);
    }
}

// Handle voice usage updates (called after each AI response)
function handleVoiceUsageUpdate(usageData) {
    console.log('[Chat] Voice usage update:', usageData);

    // Update local cache
    if (window.ReadifyUsage && usageData) {
        // Update the realtime usage in cache
        const cached = window.ReadifyUsage.getCached();
        if (cached?.realtime) {
            cached.realtime.used = usageData.sessionTotal || usageData.tokensUsed;
            cached.realtime.percentUsed = usageData.percentUsed || Math.round((cached.realtime.used / cached.realtime.limit) * 100);
            cached.realtime.remaining = Math.max(0, cached.realtime.limit - cached.realtime.used);
            cached.realtime.isWarning = cached.realtime.percentUsed >= 80;
            cached.realtime.allowed = cached.realtime.used < cached.realtime.limit;
        }
    }

    // Update the voice usage meter in the overlay
    updateVoiceUsageMeterFromData(usageData);
}

// Open chat panel
async function openChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    if (!chatPanel) return;

    // Check token quota first (replaces premium-only check)
    const usageCheck = await checkUsageBeforeChat();
    if (!usageCheck.allowed) {
        if (usageCheck.showUpgrade) {
            showPremiumRequired();
        } else {
            showTokenLimitReached(usageCheck);
        }
        return;
    }

    chatPanel.classList.add('open');

    // Load page context
    await loadPageContext();

    // Update welcome text
    updateWelcomeMessage();

    // Refresh usage meter
    await updateUsageMeter();
}

// Check usage before allowing chat (checks chat-specific quota)
async function checkUsageBeforeChat() {
    // Must be authenticated
    if (!window.ReadifyAuth?.isAuthenticated()) {
        return { allowed: false, showUpgrade: true };
    }

    // Check chat-specific token quota via usage service
    if (window.ReadifyUsage) {
        try {
            const usage = await window.ReadifyUsage.getStats();
            console.log('[Chat] Usage check:', usage);

            // Check chat-specific quota
            const chatUsage = usage.chat;
            if (!chatUsage?.allowed) {
                return {
                    allowed: false,
                    showUpgrade: usage.tier === 'free',
                    usage: usage,
                    feature: 'chat',
                    featureUsage: chatUsage
                };
            }
            return { allowed: true, usage: usage };
        } catch (e) {
            console.error('[Chat] Usage check error:', e);
            // On error, allow access - don't block user
            return { allowed: true, usage: null };
        }
    }

    // If usage service not available, allow authenticated users
    // (The API will enforce limits server-side)
    console.log('[Chat] Usage service not available, allowing authenticated user');
    return { allowed: true, usage: null };
}

// Show token limit reached modal (for chat-specific limit)
function showTokenLimitReached(usageCheck) {
    const modal = document.getElementById('premiumRequiredModal');
    const modalTitle = document.getElementById('premiumRequiredTitle');
    const modalText = document.getElementById('premiumRequiredText');
    const upgradeFooter = document.getElementById('premiumRequiredFooter');
    const closeFooter = document.getElementById('premiumRequiredCloseFooter');
    const usage = usageCheck.usage;
    const featureUsage = usageCheck.featureUsage || usage?.chat;

    const resetDate = usage?.resetDate ? formatResetDate(usage.resetDate) : 'next month';

    // Set title
    if (modalTitle) {
        modalTitle.textContent = '⚡ Chat Limit Reached';
    }

    // Set message
    if (modalText) {
        if (usage?.tier === 'free') {
            const limit = featureUsage?.limit || 50000;
            modalText.textContent = `You've used all ${formatTokens(limit)} free chat tokens this month. Upgrade to Premium for 2M tokens/month!`;
        } else {
            modalText.textContent = `You've reached your monthly limit of ${formatTokens(usage.limit)} tokens. Usage resets ${resetDate}.`;
        }
    }

    // Show upgrade for free users, close for premium
    if (usage?.tier === 'free') {
        if (upgradeFooter) upgradeFooter.style.display = 'flex';
        if (closeFooter) closeFooter.style.display = 'none';
    } else {
        if (upgradeFooter) upgradeFooter.style.display = 'none';
        if (closeFooter) closeFooter.style.display = 'flex';
    }

    if (modal) modal.style.display = 'flex';
}

function formatResetDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
        return 'next month';
    }
}

function formatTokens(count) {
    if (count >= 1000000) return (count / 1000000).toFixed(0) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(0) + 'k';
    return count.toString();
}

// Show sign in required modal
function showPremiumRequired() {
    const modal = document.getElementById('premiumRequiredModal');
    const modalTitle = document.getElementById('premiumRequiredTitle');
    const modalText = document.getElementById('premiumRequiredText');
    const upgradeFooter = document.getElementById('premiumRequiredFooter');
    const closeFooter = document.getElementById('premiumRequiredCloseFooter');
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;

    if (!isAuthenticated) {
        // Not logged in - show sign in message
        if (modalTitle) {
            modalTitle.textContent = '🔐 Sign In Required';
        }
        if (modalText) {
            modalText.textContent = 'Please sign in to use AI Chat. Free users get 5,000 tokens/month!';
        }
        if (upgradeFooter) {
            upgradeFooter.style.display = 'none';
        }
        if (closeFooter) {
            closeFooter.style.display = 'flex';
        }
    } else {
        // This shouldn't happen anymore since authenticated users should go through token check
        // But keep as fallback
        if (modalTitle) {
            modalTitle.textContent = '⚡ Limit Reached';
        }
        if (modalText) {
            modalText.textContent = 'You\'ve used all your free tokens this month. Upgrade to Premium for 500,000 tokens/month!';
        }
        if (upgradeFooter) {
            upgradeFooter.style.display = 'flex';
        }
        if (closeFooter) {
            closeFooter.style.display = 'none';
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

    // Refresh usage stats in profile section (bypass cache to get fresh data)
    // Use a small delay to ensure any pending usage updates are processed
    setTimeout(() => {
        if (typeof updateUsageStatsSection === 'function') {
            updateUsageStatsSection(true); // Bypass cache to get fresh data
        }
    }, 100);
}

// Load page context from current tab
async function loadPageContext(forceRefresh = false) {
    try {
        if (window.ReadifyChat?.getPageContent) {
            pageContext = await window.ReadifyChat.getPageContent(forceRefresh);
            console.log('[Chat] Page context loaded:', pageContext?.title, forceRefresh ? '(forced)' : '(cached)');
            console.log('[Chat] Context length:', pageContext?.content?.length, 'chars');
            console.log('[Chat] Context preview:', pageContext?.content?.substring(0, 200) + '...');
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

    // Force refresh page context to get the currently visible article
    // (important for infinite scroll pages like Britannica)
    await loadPageContext(true);

    // Reset state
    resetVoiceState();

    // Show overlay
    voiceOverlay?.classList.add('active');
    chatVoiceBtn?.classList.add('active');

    // Update voice usage meter
    await updateVoiceUsageMeter();

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

    // Refresh usage stats after voice session (bypass cache for fresh data)
    setTimeout(() => {
        window.ReadifyUsage?.getStats(true);
    }, 200);
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

    // Refresh page context to capture current scroll position
    await loadPageContext();

    // Stream response
    await window.ReadifyChat?.streamMessage(
        message,
        pageContext,
        // onChunk
        (chunk, fullText) => {
            updateMessageContent(assistantMsgEl, fullText);
        },
        // onDone
        (fullText, usageData) => {
            isStreaming = false;
            updateSendButton(false);
            scrollToBottom();

            // Update usage meter with data from response (chat-specific)
            if (usageData) {
                window.ReadifyUsage?.updateFromResponse('chat', usageData);
                updateUsageMeter();
            }
        },
        // onError
        (error) => {
            isStreaming = false;
            updateSendButton(false);

            // Handle token limit error specially
            if (error.code === 'TOKEN_LIMIT_REACHED') {
                // Get user tier
                const usage = window.ReadifyUsage?.getCached();
                const isFreeUser = usage?.tier !== 'premium';

                if (isFreeUser) {
                    updateMessageContent(assistantMsgEl,
                        '⚡ <strong>Chat limit reached!</strong><br><br>' +
                        'You\'ve used all your free chat tokens this month.<br><br>' +
                        '<span class="limit-upgrade-link" onclick="handlePremiumUpgrade()">✨ Upgrade to Premium</span> for 2 million tokens/month!'
                    );
                } else {
                    updateMessageContent(assistantMsgEl,
                        '⚡ <strong>Monthly limit reached</strong><br><br>' +
                        'You\'ve used all your chat tokens for this month. ' +
                        'Your usage will reset at the start of next month.'
                    );
                }
                assistantMsgEl.classList.add('limit-reached');
                updateUsageMeter();
            } else {
                updateMessageContent(assistantMsgEl, `Error: ${error.message}`);
                assistantMsgEl.classList.add('error');
            }
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
    const voiceSubtext = document.querySelector('.voice-subtext');

    // Check if this is a token limit error
    if (error.code === 'TOKEN_LIMIT_REACHED' || error.message?.includes('limit reached')) {
        // Get user tier to show appropriate message
        const usage = window.ReadifyUsage?.getCached();
        const isFreeUser = usage?.tier !== 'premium';

        if (voiceText) {
            voiceText.textContent = '⚡ Voice Limit Reached';
        }
        if (voiceSubtext) {
            if (isFreeUser) {
                voiceSubtext.innerHTML = '<span class="limit-upgrade-link" onclick="handlePremiumUpgrade()">Upgrade to Premium</span> for more voice time!';
            } else {
                voiceSubtext.textContent = 'Your usage will reset at the start of next month.';
            }
        }

        // Update the voice usage meter to show full
        updateVoiceUsageMeterFromData({ sessionTotal: 100, limit: 100, percentUsed: 100 });

        // Keep overlay open longer so user can read the message
        setTimeout(() => {
            stopVoiceMode();
        }, 4000);
    } else {
        // Regular error
        if (voiceText) {
            voiceText.textContent = error.message || 'Error occurred';
        }

        // Auto-close voice overlay after error
        setTimeout(() => {
            stopVoiceMode();
        }, 2000);
    }
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

// ============================================
// Usage Meter Functions
// ============================================

// Initialize usage meter in chat footer
function initUsageMeter() {
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (!chatInputContainer) return;

    // Check if usage meter already exists
    if (document.getElementById('chatUsageMeter')) return;

    // Create usage meter element
    const usageMeter = document.createElement('div');
    usageMeter.id = 'chatUsageMeter';
    usageMeter.className = 'chat-usage-meter';
    usageMeter.innerHTML = `
        <div class="usage-meter-content">
            <div class="usage-meter-bar">
                <div class="usage-meter-fill" id="chatUsageFill"></div>
            </div>
            <span class="usage-meter-text" id="chatUsageText">Loading...</span>
        </div>
    `;

    // Insert before the input container
    chatInputContainer.parentNode.insertBefore(usageMeter, chatInputContainer);
}

// Update usage meter display (shows chat-specific usage)
async function updateUsageMeter() {
    const usageFill = document.getElementById('chatUsageFill');
    const usageText = document.getElementById('chatUsageText');
    const usageMeter = document.getElementById('chatUsageMeter');

    if (!usageFill || !usageText || !usageMeter) return;

    // Get usage stats
    let usage = window.ReadifyUsage?.getCached();
    if (!usage) {
        usage = await window.ReadifyUsage?.getStats();
    }

    if (!usage || !usage.chat) {
        usageMeter.style.display = 'none';
        return;
    }

    usageMeter.style.display = 'block';

    // Use chat-specific usage
    const chatUsage = usage.chat;

    // Update bar width
    const percent = Math.min(100, chatUsage.percentUsed || 0);
    usageFill.style.width = `${percent}%`;

    // Update bar color based on usage
    usageFill.classList.remove('usage-warning', 'usage-error');
    if (percent >= 100) {
        usageFill.classList.add('usage-error');
    } else if (percent >= 80) {
        usageFill.classList.add('usage-warning');
    }

    // Update text with chat-specific values
    const used = formatTokens(chatUsage.used || 0);
    const limit = formatTokens(chatUsage.limit || 50000);
    usageText.textContent = `${used} / ${limit} chat tokens`;

    // Add warning class to container if needed
    usageMeter.classList.toggle('is-warning', percent >= 80 && percent < 100);
    usageMeter.classList.toggle('is-error', percent >= 100);
}

// Update voice usage meter display (shows realtime-specific usage)
async function updateVoiceUsageMeter() {
    const usageFill = document.getElementById('voiceUsageFill');
    const usageText = document.getElementById('voiceUsageText');
    const usageMeter = document.getElementById('voiceUsageMeter');

    if (!usageFill || !usageText || !usageMeter) return;

    // Get usage stats
    let usage = window.ReadifyUsage?.getCached();
    if (!usage) {
        usage = await window.ReadifyUsage?.getStats();
    }

    if (!usage || !usage.realtime) {
        usageMeter.style.display = 'none';
        return;
    }

    usageMeter.style.display = 'flex';

    // Use realtime-specific usage
    const realtimeUsage = usage.realtime;

    // Update bar width
    const percent = Math.min(100, realtimeUsage.percentUsed || 0);
    usageFill.style.width = `${percent}%`;

    // Update bar color based on usage
    usageFill.classList.remove('usage-warning', 'usage-error');
    if (percent >= 100) {
        usageFill.classList.add('usage-error');
    } else if (percent >= 80) {
        usageFill.classList.add('usage-warning');
    }

    // Update text with realtime-specific values
    const used = formatTokens(realtimeUsage.used || 0);
    const limit = formatTokens(realtimeUsage.limit || 3000);
    usageText.textContent = `${used} / ${limit} voice tokens`;
}

// Update voice usage meter directly from usage data (for real-time updates)
function updateVoiceUsageMeterFromData(usageData) {
    const usageFill = document.getElementById('voiceUsageFill');
    const usageText = document.getElementById('voiceUsageText');
    const usageMeter = document.getElementById('voiceUsageMeter');

    if (!usageFill || !usageText || !usageMeter || !usageData) return;

    usageMeter.style.display = 'flex';

    // Update bar width
    const percent = Math.min(100, usageData.percentUsed || 0);
    usageFill.style.width = `${percent}%`;

    // Update bar color based on usage
    usageFill.classList.remove('usage-warning', 'usage-error');
    if (percent >= 100) {
        usageFill.classList.add('usage-error');
    } else if (percent >= 80) {
        usageFill.classList.add('usage-warning');
    }

    // Update text
    const used = formatTokens(usageData.sessionTotal || 0);
    const limit = formatTokens(usageData.limit || 3000);
    usageText.textContent = `${used} / ${limit} voice tokens`;

    // Add warning class to container if needed
    usageMeter.classList.toggle('is-warning', percent >= 80 && percent < 100);
    usageMeter.classList.toggle('is-error', percent >= 100);
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.ReadifyChatUI = {
        init: initChatUI,
        openPanel: openChatPanel,
        closePanel: closeChatPanel,
        clearChat,
        loadPageContext,
        refreshChatContext,
    };
}
