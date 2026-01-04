// Readify Extension - Sidepanel Main Entry Point
// Initializes the sidepanel and sets up all listeners

// On sidepanel load
document.addEventListener("DOMContentLoaded", async function () {
    // Initialize Supabase and auth
    await initializeAuth();
    
    // Check if study mode should be disabled due to limit
    const allowed = await checkStudyModeAllowed();
    
    // Initialize Study Mode state
    chrome.storage.sync.get(["extensionEnabled"], function(result) {
        const enableCheckbox = document.getElementById("enableCheckbox");
        const toggleLabel = enableCheckbox.closest('.modern-toggle');
        const toggleText = toggleLabel.querySelector('.toggle-text');
        
        let enabled = result.extensionEnabled || false;
        
        // If limit is reached, force disable study mode
        if (!allowed && enabled) {
            enabled = false;
            chrome.storage.sync.set({ extensionEnabled: false });
        }
        
        enableCheckbox.checked = enabled;
        toggleText.textContent = enabled ? 'Disable Study Mode' : 'Enable Study Mode';
    });

    // Load My Sites
    loadMySites();
    
    // Load and display website limit
    updateLimitDisplay();

    // Set up real-time message listener for My Sites updates
    setupMySitesListener();
    
    // Set up auth event listeners
    setupAuthListeners();
    
    // Set up subscription listeners
    setupSubscriptionListeners();
    
    // Set up study mode and line height listeners
    setupStudyModeListeners();
    
    // Set up modal listeners
    setupModalListeners();
    
    // Check for payment status in URL
    checkPaymentStatusOnLoad();
});

