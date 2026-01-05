// Readify Extension - Chat UI Module
// Handles the AI chat interface in the sidepanel

let chatMode = 'text'; // 'text' or 'voice'
let pageContext = null;
let isStreaming = false;

// Track current voice conversation messages
let currentUserMsgEl = null;
let currentAssistantMsgEl = null;
let lastTranscript = ''; // To avoid duplicate user messages

// Initialize chat UI
function initChatUI() {
    setupChatEventListeners();
    setupVoiceCallbacks();
    loadPageContext();
}

// Setup event listeners
function setupChatEventListeners() {
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const voiceModeBtn = document.getElementById('voiceModeBtn');
    const textModeBtn = document.getElementById('textModeBtn');
    
    // Send message on button click
    chatSendBtn?.addEventListener('click', handleSendMessage);
    
    // Send message on Enter (but not Shift+Enter)
    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Auto-resize textarea
    chatInput?.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    
    // Mode toggle buttons
    textModeBtn?.addEventListener('click', () => switchMode('text'));
    voiceModeBtn?.addEventListener('click', () => toggleVoiceMode());
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

// Switch between text and voice modes
function switchMode(mode) {
    chatMode = mode;
    
    const textModeBtn = document.getElementById('textModeBtn');
    const voiceModeBtn = document.getElementById('voiceModeBtn');
    const chatInputContainer = document.getElementById('chatInputContainer');
    const voiceContainer = document.getElementById('voiceContainer');
    
    if (mode === 'text') {
        textModeBtn?.classList.add('active');
        voiceModeBtn?.classList.remove('active');
        chatInputContainer.style.display = 'flex';
        voiceContainer.style.display = 'none';
        
        // Stop voice if active
        if (window.ReadifyVoice?.isActive()) {
            window.ReadifyVoice.stop();
        }
        
        // Reset voice message tracking
        currentUserMsgEl = null;
        currentAssistantMsgEl = null;
        lastTranscript = '';
    } else {
        textModeBtn?.classList.remove('active');
        voiceModeBtn?.classList.add('active');
        chatInputContainer.style.display = 'none';
        voiceContainer.style.display = 'flex';
    }
}

// Toggle voice mode
async function toggleVoiceMode() {
    if (chatMode !== 'voice') {
        switchMode('voice');
    }
    
    if (window.ReadifyVoice?.isActive()) {
        window.ReadifyVoice.stop();
    } else {
        // Refresh page context before starting
        await loadPageContext();
        
        // Reset voice message tracking
        currentUserMsgEl = null;
        currentAssistantMsgEl = null;
        lastTranscript = '';
        
        window.ReadifyVoice?.start(pageContext);
    }
}

// Handle send message
async function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput?.value?.trim();
    
    if (!message || isStreaming) return;
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
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

// Add message to chat container
function addMessageToChat(role, content, streaming = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;
    
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.dataset.timestamp = Date.now();
    
    const avatar = role === 'user' ? '👤' : '🤖';
    
    msgEl.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${escapeHtml(content) || (streaming ? '<span class="typing-indicator">...</span>' : '')}</div>
    `;
    
    chatMessages.appendChild(msgEl);
    scrollToBottom();
    
    return msgEl;
}

// Update message content (for streaming)
function updateMessageContent(msgEl, content) {
    if (!msgEl) return;
    const contentEl = msgEl.querySelector('.message-content');
    if (contentEl) {
        contentEl.innerHTML = formatMessage(content);
        scrollToBottom();
    }
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
        chatSendBtn.textContent = loading ? '...' : '→';
    }
}

// Voice status change handler
function handleVoiceStatusChange(status) {
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceWaveform = document.getElementById('voiceWaveform');
    const voiceModeBtn = document.getElementById('voiceModeBtn');
    
    const statusMessages = {
        'connecting': 'Connecting...',
        'listening': 'Listening...',
        'processing': 'Processing...',
        'speaking': 'Speaking...',
        'idle': 'Click to start',
        'disconnected': 'Disconnected',
        'error': 'Error occurred',
    };
    
    if (voiceStatus) {
        voiceStatus.textContent = statusMessages[status] || status;
    }
    
    // Update waveform animation
    if (voiceWaveform) {
        voiceWaveform.className = 'voice-waveform';
        if (status === 'listening' || status === 'speaking') {
            voiceWaveform.classList.add('active');
        }
        if (status === 'speaking') {
            voiceWaveform.classList.add('speaking');
        }
    }
    
    // Update button state
    if (voiceModeBtn) {
        voiceModeBtn.classList.toggle('active', status !== 'idle' && status !== 'disconnected');
    }
    
    // When user starts speaking (listening status after speaking), prepare for new turn
    if (status === 'listening') {
        // Reset for new conversation turn
        currentAssistantMsgEl = null;
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
        
        // Create a new user message
        currentUserMsgEl = addMessageToChat('user', text);
        
        // Reset assistant message for the new turn
        currentAssistantMsgEl = null;
    }
}

// Assistant text handler (voice mode) - called as assistant speaks
function handleAssistantText(chunk, fullText) {
    // If we don't have an assistant message for this turn, create one
    if (!currentAssistantMsgEl) {
        currentAssistantMsgEl = addMessageToChat('assistant', fullText, true);
    } else {
        updateMessageContent(currentAssistantMsgEl, fullText);
    }
}

// Assistant done handler - called when assistant finishes speaking
function handleAssistantDone(fullText) {
    // Ensure final text is displayed
    if (currentAssistantMsgEl) {
        updateMessageContent(currentAssistantMsgEl, fullText);
    }
    // Ready for next turn
    currentAssistantMsgEl = null;
}

// Voice error handler
function handleVoiceError(error) {
    console.error('[Chat] Voice error:', error);
    
    const voiceStatus = document.getElementById('voiceStatus');
    if (voiceStatus) {
        voiceStatus.textContent = error.message || 'Error occurred';
        voiceStatus.classList.add('error');
        
        setTimeout(() => {
            voiceStatus.classList.remove('error');
        }, 3000);
    }
}

// Clear chat history
function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    window.ReadifyChat?.resetHistory(null);
    
    // Reset voice message tracking
    currentUserMsgEl = null;
    currentAssistantMsgEl = null;
    lastTranscript = '';
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.ReadifyChatUI = {
        init: initChatUI,
        clearChat,
        loadPageContext,
        switchMode,
        toggleVoiceMode,
    };
}
