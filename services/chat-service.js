// Readify Extension - Chat Service
// Handles streaming text chat with the Readify API

// Conversation history (per page, reset on navigation)
let chatHistory = [];
let currentPageDigest = null;

// Clear history when page changes
function resetChatHistory(pageDigest) {
    if (pageDigest !== currentPageDigest) {
        chatHistory = [];
        currentPageDigest = pageDigest;
    }
}

// Get current conversation history
function getChatHistory() {
    return [...chatHistory];
}

// Add message to history
function addToHistory(role, content) {
    chatHistory.push({ role, content });
    // Keep last 20 messages to avoid token limits
    if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
    }
}

// Stream a chat message to the API
async function streamChatMessage(message, pageContext, onChunk, onDone, onError) {
    const client = window.ReadifySupabase?.getClient();
    
    if (!client) {
        onError?.({ message: 'Not connected to service' });
        return;
    }
    
    try {
        // Get access token
        const { data: { session } } = await client.auth.getSession();
        if (!session?.access_token) {
            onError?.({ message: 'Please sign in to use chat' });
            return;
        }
        
        // Add user message to history
        addToHistory('user', message);
        
        // Build request
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.AI_CHAT);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                message,
                pageContent: pageContext?.content,
                pageTitle: pageContext?.title,
                pageUrl: pageContext?.url,
                history: chatHistory.slice(0, -1), // Exclude the message we just added
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            onError?.({ message: error.error || 'Chat request failed' });
            return;
        }
        
        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                            onError?.({ message: data.error });
                            return;
                        }
                        
                        if (data.content) {
                            assistantMessage += data.content;
                            onChunk?.(data.content, assistantMessage);
                        }
                        
                        if (data.done) {
                            // Add assistant response to history
                            addToHistory('assistant', assistantMessage);
                            onDone?.(assistantMessage);
                            return;
                        }
                    } catch (e) {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        }
        
        // Stream ended without done signal
        if (assistantMessage) {
            addToHistory('assistant', assistantMessage);
            onDone?.(assistantMessage);
        }
        
    } catch (e) {
        console.error('Chat stream error:', e);
        onError?.({ message: e.message || 'Failed to connect to chat service' });
    }
}

// Get page content from the current tab
async function getCurrentPageContent() {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return null;
        
        // Execute script to get page content
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Get main content, avoiding navigation, footers, etc.
                const article = document.querySelector('article') || 
                               document.querySelector('main') || 
                               document.querySelector('[role="main"]') ||
                               document.body;
                
                // Get text content, limiting to reasonable size
                let content = article?.innerText || '';
                
                // Clean up whitespace
                content = content.replace(/\s+/g, ' ').trim();
                
                return {
                    content: content.substring(0, 100000), // Limit to ~100k chars
                    title: document.title,
                    url: window.location.href,
                };
            },
        });
        
        return results?.[0]?.result || null;
    } catch (e) {
        console.error('Failed to get page content:', e);
        return null;
    }
}

// Export chat functions
if (typeof window !== 'undefined') {
    window.ReadifyChat = {
        streamMessage: streamChatMessage,
        getHistory: getChatHistory,
        resetHistory: resetChatHistory,
        addToHistory,
        getPageContent: getCurrentPageContent,
    };
}

