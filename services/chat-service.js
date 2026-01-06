// Readify Extension - Chat Service
// Handles streaming text chat with the Readify API

// Conversation history (per page, reset on navigation)
let chatHistory = [];
let currentPageDigest = null;

// Content cache for page context
let contentCache = null;
let lastCachedUrl = null;
let lastCachedTitle = null;

// Clear content cache (called when context changes)
function clearContentCache() {
    contentCache = null;
    lastCachedUrl = null;
    lastCachedTitle = null;
    console.log('[Chat Service] Content cache cleared');
}

// Get last cached URL for comparison
function getLastCachedUrl() {
    return lastCachedUrl;
}

// Get last cached title for comparison
function getLastCachedTitle() {
    return lastCachedTitle;
}

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

            // Handle token limit reached error specifically
            if (error.code === 'TOKEN_LIMIT_REACHED') {
                onError?.({
                    message: error.error || 'Monthly token limit reached',
                    code: 'TOKEN_LIMIT_REACHED',
                    limit: error.limit,
                    used: error.used,
                    resetDate: error.resetDate,
                    upgrade: error.upgrade,
                    tier: error.tier
                });
                return;
            }

            onError?.({ message: error.error || 'Chat request failed', code: error.code });
            return;
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        let usageData = null;

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
                            onError?.({ message: data.error, code: data.code });
                            return;
                        }

                        if (data.content) {
                            assistantMessage += data.content;
                            onChunk?.(data.content, assistantMessage);
                        }

                        // Capture usage data from done event
                        if (data.usage) {
                            usageData = data.usage;
                        }

                        if (data.done) {
                            // Add assistant response to history
                            addToHistory('assistant', assistantMessage);
                            onDone?.(assistantMessage, usageData);
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
            onDone?.(assistantMessage, usageData);
        }

    } catch (e) {
        console.error('Chat stream error:', e);
        onError?.({ message: e.message || 'Failed to connect to chat service' });
    }
}

// Get page content from the current tab, centered around scroll position
async function getCurrentPageContent(forceRefresh = false) {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return null;

        // Check if we can use cached content (same URL)
        if (!forceRefresh && contentCache && tab.url === lastCachedUrl) {
            console.log('[Chat Service] Using cached content for:', tab.url);
            return contentCache;
        }

        // Execute script to get page content centered on viewport
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const MAX_CHARS = 100000; // 100k character window

                // Helper: Check if an element is visible
                function isElementVisible(el) {
                    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true; // Text nodes checked via parent
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0';
                }

                // Helper: Get vertical center of an element
                function getVerticalCenter(el) {
                    try {
                        const rect = el.getBoundingClientRect();
                        return rect.top + rect.height / 2;
                    } catch (e) {
                        return Infinity;
                    }
                }

                // Helper: Find the article element most visible in the viewport
                // This handles infinite scroll sites like Britannica with multiple stacked articles
                function findVisibleArticle() {
                    const articles = document.querySelectorAll('article');
                    if (articles.length === 0) return null;
                    if (articles.length === 1) return articles[0];

                    const viewportHeight = window.innerHeight;
                    const viewportCenter = viewportHeight / 2;
                    let bestArticle = null;
                    let bestScore = -Infinity;

                    for (const article of articles) {
                        const rect = article.getBoundingClientRect();
                        
                        // Skip articles that are completely off-screen
                        if (rect.bottom < 0 || rect.top > viewportHeight) continue;

                        // Calculate how much of the article is visible in viewport
                        const visibleTop = Math.max(0, rect.top);
                        const visibleBottom = Math.min(viewportHeight, rect.bottom);
                        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                        
                        // Score based on visible height and proximity to viewport center
                        const articleCenter = rect.top + rect.height / 2;
                        const distanceFromCenter = Math.abs(articleCenter - viewportCenter);
                        const score = visibleHeight - (distanceFromCenter * 0.1);

                        if (score > bestScore) {
                            bestScore = score;
                            bestArticle = article;
                        }
                    }

                    return bestArticle;
                }

                // Get main content container - prefer the article most visible in viewport
                const mainContainer = findVisibleArticle() ||
                    document.querySelector('main') ||
                    document.querySelector('[role="main"]') ||
                    document.body;
                
                console.log('[Readify] Using container:', mainContainer.tagName, 
                    mainContainer.dataset?.topicId ? `(topic: ${mainContainer.dataset.topicId})` : '');

                // Collect all text nodes with their positions
                const textNodes = [];
                const walker = document.createTreeWalker(
                    mainContainer,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            // Skip empty or whitespace-only nodes
                            if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;

                            // Skip script/style content
                            const parent = node.parentElement;
                            if (!parent) return NodeFilter.FILTER_REJECT;
                            const tagName = parent.tagName?.toLowerCase();
                            if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
                                return NodeFilter.FILTER_REJECT;
                            }

                            // Skip hidden elements
                            if (!isElementVisible(parent)) return NodeFilter.FILTER_REJECT;

                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                );

                let node;
                while (node = walker.nextNode()) {
                    const parent = node.parentElement;
                    const yCenter = getVerticalCenter(parent);
                    textNodes.push({
                        text: node.textContent,
                        y: yCenter
                    });
                }

                if (textNodes.length === 0) {
                    // Fallback: just get body text
                    let content = document.body?.innerText || '';
                    content = content.replace(/\s+/g, ' ').trim();
                    return {
                        content: content.substring(0, MAX_CHARS),
                        title: document.title,
                        url: window.location.href,
                    };
                }

                // Find viewport bounds
                const viewportTop = 0;
                const viewportBottom = window.innerHeight;
                const viewportCenterY = window.innerHeight / 2;

                // First, try to find text nodes actually VISIBLE in the viewport
                let visibleNodes = [];
                for (let i = 0; i < textNodes.length; i++) {
                    const y = textNodes[i].y;
                    // Node is visible if its center is within viewport bounds
                    if (y >= viewportTop && y <= viewportBottom) {
                        visibleNodes.push({ index: i, y: y });
                    }
                }

                let anchorIndex;
                if (visibleNodes.length > 0) {
                    // Find the visible node closest to viewport center
                    let minDistance = Infinity;
                    for (const node of visibleNodes) {
                        const distance = Math.abs(node.y - viewportCenterY);
                        if (distance < minDistance) {
                            minDistance = distance;
                            anchorIndex = node.index;
                        }
                    }
                    console.log('[Readify] Found', visibleNodes.length, 'visible nodes, anchor at index', anchorIndex);
                } else {
                    // Fallback: find closest to center (for very short pages)
                    anchorIndex = 0;
                    let minDistance = Infinity;
                    for (let i = 0; i < textNodes.length; i++) {
                        const distance = Math.abs(textNodes[i].y - viewportCenterY);
                        if (distance < minDistance) {
                            minDistance = distance;
                            anchorIndex = i;
                        }
                    }
                    console.log('[Readify] No visible nodes, using closest at index', anchorIndex);
                }

                // Expand window around anchor with LIMITED backward expansion
                // 30% backward (30k chars), 70% forward (70k chars)
                const BACKWARD_LIMIT = 30000;
                const FORWARD_LIMIT = 70000;

                let startIndex = anchorIndex;
                let endIndex = anchorIndex;
                let backwardChars = 0;
                let forwardChars = 0;
                let totalChars = textNodes[anchorIndex].text.length;

                // First, expand backwards (limited)
                while (startIndex > 0 && backwardChars < BACKWARD_LIMIT) {
                    const prevLen = textNodes[startIndex - 1].text.length;
                    if (backwardChars + prevLen <= BACKWARD_LIMIT) {
                        startIndex--;
                        backwardChars += prevLen;
                        totalChars += prevLen;
                    } else {
                        break;
                    }
                }

                // Then, expand forwards (limited)
                while (endIndex < textNodes.length - 1 && forwardChars < FORWARD_LIMIT) {
                    const nextLen = textNodes[endIndex + 1].text.length;
                    if (forwardChars + nextLen <= FORWARD_LIMIT) {
                        endIndex++;
                        forwardChars += nextLen;
                        totalChars += nextLen;
                    } else {
                        break;
                    }
                }

                console.log('[Readify] Context window: backward', backwardChars, 'forward', forwardChars, 'total', totalChars);

                // Concatenate the text nodes in document order
                let content = '';
                for (let i = startIndex; i <= endIndex; i++) {
                    content += textNodes[i].text + ' ';
                }

                // Clean up whitespace
                content = content.replace(/\s+/g, ' ').trim();

                return {
                    content: content.substring(0, MAX_CHARS),
                    title: document.title,
                    url: window.location.href,
                };
            },
        });

        const result = results?.[0]?.result || null;
        
        // Cache the result
        if (result) {
            contentCache = result;
            lastCachedUrl = result.url;
            lastCachedTitle = result.title;
            console.log('[Chat Service] Cached content for:', result.url);
        }
        
        return result;
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
        clearContentCache,
        getLastCachedUrl,
        getLastCachedTitle,
    };
}

