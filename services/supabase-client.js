// Readify Extension - Supabase Client
// Initializes and exports the Supabase client for authentication and database operations

// Global supabase client instance
let supabaseClient = null;
let currentUser = null;
let currentSession = null;
let authStateListeners = [];
let contextValid = true;

// Check if extension context is valid (call this before any chrome API)
function isContextValid() {
    if (!contextValid) return false;
    try {
        // This will throw if context is invalidated
        const valid = !!chrome.runtime?.id;
        if (!valid) contextValid = false;
        return valid;
    } catch (e) {
        contextValid = false;
        return false;
    }
}

// Detect if running in content script context (vs sidepanel/popup)
function isContentScriptContext() {
    try {
        // Content scripts don't have access to chrome.action
        // Sidepanel and popup are extension pages and have full access
        return typeof chrome !== 'undefined' && 
               typeof chrome.runtime !== 'undefined' && 
               typeof chrome.action === 'undefined';
    } catch (e) {
        return true;
    }
}

// Safe chrome.runtime.sendMessage that handles context invalidation
function safeSendMessage(message) {
    if (!isContextValid()) return Promise.resolve();
    try {
        return chrome.runtime.sendMessage(message).catch(() => {});
    } catch (e) {
        contextValid = false;
        return Promise.resolve();
    }
}

// Create a safe storage adapter that never throws
function createSafeStorageAdapter() {
    return {
        getItem: async (key) => {
            if (!isContextValid()) return null;
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.get(key, (result) => {
                        try {
                            if (chrome.runtime.lastError) {
                                resolve(null);
                                return;
                            }
                            resolve(result[key] || null);
                        } catch (e) {
                            contextValid = false;
                            resolve(null);
                        }
                    });
                } catch (e) {
                    contextValid = false;
                    resolve(null);
                }
            });
        },
        setItem: async (key, value) => {
            if (!isContextValid()) return;
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.set({ [key]: value }, () => {
                        try {
                            // Check for errors but don't throw
                            if (chrome.runtime.lastError) {
                                // Silently ignore
                            }
                        } catch (e) {
                            contextValid = false;
                        }
                        resolve();
                    });
                } catch (e) {
                    contextValid = false;
                    resolve();
                }
            });
        },
        removeItem: async (key) => {
            if (!isContextValid()) return;
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.remove(key, () => {
                        try {
                            if (chrome.runtime.lastError) {
                                // Silently ignore
                            }
                        } catch (e) {
                            contextValid = false;
                        }
                        resolve();
                    });
                } catch (e) {
                    contextValid = false;
                    resolve();
                }
            });
        }
    };
}

// Initialize Supabase client
function initSupabase() {
    if (supabaseClient) {
        return supabaseClient;
    }
    
    if (!isContextValid()) {
        // Silently return - context invalidation is expected on external pages like Stripe
        return null;
    }
    
    const isContentScript = isContentScriptContext();
    
    if (typeof window !== 'undefined' && window.supabase && window.READIFY_CONFIG) {
        supabaseClient = window.supabase.createClient(
            window.READIFY_CONFIG.SUPABASE_URL,
            window.READIFY_CONFIG.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: true,
                    storage: createSafeStorageAdapter(),
                    // Disable auto-refresh in content scripts to prevent
                    // "Extension context invalidated" errors when page navigates
                    autoRefreshToken: !isContentScript,
                    detectSessionInUrl: false,
                    // Disable the lock mechanism that requires navigator.locks or Service Workers
                    // This prevents "No SW" errors in content scripts where these aren't available
                    lock: isContentScript ? async (name, acquireTimeout, callback) => {
                        // In content scripts, just execute the callback without locking
                        // This is safe because content scripts don't do token refresh
                        return await callback();
                    } : undefined,
                    // Set a short timeout for lock acquisition to fail fast
                    lockAcquireTimeout: isContentScript ? 0 : 10000
                }
            }
        );
        
        // Set up auth state change listener
        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentSession = session;
            currentUser = session?.user || null;
            
            // Notify all listeners
            authStateListeners.forEach(listener => {
                try {
                    listener(event, session, currentUser);
                } catch (e) {
                    console.error('Auth state listener error:', e);
                }
            });
            
            // Broadcast auth state change to other extension contexts (safely)
            safeSendMessage({
                type: 'authStateChange',
                event: event,
                session: session ? {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at,
                    user: session.user
                } : null
            });
        });
        
        return supabaseClient;
    }
    
    console.warn('Supabase library or config not loaded');
    return null;
}

// Get the Supabase client instance
function getSupabase() {
    if (!supabaseClient) {
        initSupabase();
    }
    return supabaseClient;
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Get current session
function getCurrentSession() {
    return currentSession;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null && currentSession !== null;
}

// Add auth state change listener
function onAuthStateChange(callback) {
    authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
        authStateListeners = authStateListeners.filter(l => l !== callback);
    };
}

// Refresh the session from storage (useful when extension loads)
async function refreshSession() {
    if (!isContextValid()) {
        return null;
    }
    
    const client = getSupabase();
    if (!client) return null;
    
    try {
        const { data, error } = await client.auth.getSession();
        if (error) {
            // Don't log errors for context invalidation
            if (!error.message?.includes('Extension context invalidated')) {
                console.error('Error refreshing session:', error);
            }
            return null;
        }
        
        currentSession = data.session;
        currentUser = data.session?.user || null;
        
        return data.session;
    } catch (e) {
        // Handle context invalidation gracefully - don't log as error
        if (e.message?.includes('Extension context invalidated') || 
            e.message?.includes('Extension context was invalidated')) {
            contextValid = false;
            return null;
        }
        console.error('Error refreshing session:', e);
        return null;
    }
}

// Listen for auth state changes from other extension contexts
// Wrap in try-catch to handle context invalidation
try {
    if (isContextValid()) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!isContextValid()) return false;
            
            if (message.type === 'authStateChange') {
                // Update local state from other context
                if (message.session) {
                    currentSession = message.session;
                    currentUser = message.session.user;
                } else {
                    currentSession = null;
                    currentUser = null;
                }
                
                // Notify local listeners
                authStateListeners.forEach(listener => {
                    try {
                        listener(message.event, message.session, currentUser);
                    } catch (e) {
                        console.error('Auth state listener error:', e);
                    }
                });
            }
            
            // Handle auth requests from content scripts
            if (message.type === 'getAuthState') {
                sendResponse({
                    isAuthenticated: isAuthenticated(),
                    user: currentUser,
                    session: currentSession
                });
                return true;
            }
            
            return false;
        });
    }
} catch (e) {
    // Extension context may be invalidated, ignore
    contextValid = false;
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.ReadifySupabase = {
        init: initSupabase,
        getClient: getSupabase,
        getCurrentUser,
        getCurrentSession,
        isAuthenticated,
        onAuthStateChange,
        refreshSession
    };
}

