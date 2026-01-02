// Readify Extension - Background Service Worker
// Handles extension lifecycle, message passing, and auth state sync

// Handle extension icon click to open sidepanel
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Open the sidepanel
        await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
        console.error('Failed to open sidepanel:', error);
    }
});

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle auth state changes
    if (message.type === 'authStateChange') {
        // Broadcast to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id !== sender.tab?.id) {
                    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
                }
            });
        });
    }
    
    // Handle user signed in
    if (message.type === 'userSignedIn') {
        console.log('User signed in:', message.user?.email);
        // Broadcast to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'authStateChange',
                    event: 'SIGNED_IN',
                    user: message.user
                }).catch(() => {});
            });
        });
    }
    
    // Handle user signed out
    if (message.type === 'userSignedOut') {
        console.log('User signed out');
        // Broadcast to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'authStateChange',
                    event: 'SIGNED_OUT',
                    user: null,
                    session: null
                }).catch(() => {});
            });
        });
    }
    
    // Handle subscription updates
    if (message.type === 'subscriptionUpdated') {
        console.log('Subscription updated:', message.subscription);
        // Broadcast to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, message).catch(() => {});
            });
        });
    }
    
    // Handle get auth state request
    if (message.type === 'getAuthState') {
        // This will be handled by the supabase-client in the content script
        return true;
    }
    
    // Handle open sidepanel request
    if (message.type === 'openSidepanel') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (tabs[0]) {
                await chrome.sidePanel.open({ tabId: tabs[0].id });
            }
        });
    }
    
    return false;
});

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Readify extension installed');
        // Set default settings
        chrome.storage.sync.set({
            extensionEnabled: false,
            websiteLimit: { used: 0, max: 5 }
        });
    } else if (details.reason === 'update') {
        console.log('Readify extension updated to version', chrome.runtime.getManifest().version);
    }
});

// Keep service worker alive for auth operations
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        // Just a heartbeat to keep the service worker active
    }
});

// Utility function for DOM modification (used by sidepanel)
function modifyDOM(action, boldPercent, skipWords, opacityLevel, color) {
    var elements = document.querySelectorAll("p,h1,h2,h3,h4,h5,h6,span.wrapped-text");
    elements.forEach(function (elem) {
        if (!elem.classList.contains("note-anchor")) {
            if (action === "increase") {
                elem.style.lineHeight = parseFloat(getComputedStyle(elem).lineHeight) + 3 + "px";
            } else if (action === "decrease") {
                elem.style.lineHeight = parseFloat(getComputedStyle(elem).lineHeight) - 3 + "px";
            }
        }
    });
}
