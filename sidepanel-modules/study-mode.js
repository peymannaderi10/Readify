// Readify Extension - Sidepanel Study Mode
// Handles study mode toggle and website limits

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

function setupStudyModeListeners() {
    // Line height controls
    document.getElementById("increase").addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var currentTab = tabs[0];
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: modifyDOM,
                args: ["increase", 0, 0, 1, "black"],
            });
        });
    });

    document.getElementById("decrease").addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var currentTab = tabs[0];
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: modifyDOM,
                args: ["decrease", 0, 0, 1, "black"],
            });
        });
    });

    // Study Mode Toggle
    document.getElementById("enableCheckbox").addEventListener("change", async function(event) {
        const toggleLabel = event.target.closest('.modern-toggle');
        const toggleText = toggleLabel.querySelector('.toggle-text');
        
        if (event.target.checked) {
            // Check if study mode is allowed (within limit)
            const allowed = await checkStudyModeAllowed();
            if (!allowed) {
                // Revert the checkbox and show warning
                event.target.checked = false;
                
                const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
                if (!isAuthenticated) {
                    alert('Please sign in to save your highlights. You can still use Study Mode, but changes won\'t be saved.');
                } else {
                    alert('You have reached the maximum limit of 5 websites. Please delete some sites or upgrade to Premium for unlimited sites.');
                }
                return;
            }
        }
        
        toggleText.textContent = event.target.checked ? 'Disable Study Mode' : 'Enable Study Mode';
        
        // Save the extension state
        chrome.storage.sync.set({ extensionEnabled: event.target.checked });
        
        // Get current tab and send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "toggleExtension",
                enabled: event.target.checked
            });
        });
    });
}

function setupModalListeners() {
    // Delete Changes Button
    document.getElementById("deleteChangesButton").addEventListener("click", function() {
        // Show confirmation modal
        const modal = document.getElementById("confirmationModal");
        modal.style.display = "flex";
    });

    // Modal event listeners
    document.getElementById("cancelBtn").addEventListener("click", function() {
        const modal = document.getElementById("confirmationModal");
        modal.style.display = "none";
        
        // Clear any pending site deletion
        if (window.pendingSiteDelete) {
            window.pendingSiteDelete = null;
            
            // Reset modal text back to default
            const modalTitle = modal.querySelector('.modal-title');
            const modalText = modal.querySelector('.modal-text');
            if (modalTitle) modalTitle.textContent = 'Delete All Changes';
            if (modalText) modalText.textContent = 'Are you sure you want to delete all changes on this page? This action cannot be undone.';
        }
    });

    document.getElementById("confirmBtn").addEventListener("click", function() {
        const modal = document.getElementById("confirmationModal");
        modal.style.display = "none";
        
        // Check if this is for individual site deletion
        if (window.pendingSiteDelete) {
            const digest = window.pendingSiteDelete;
            window.pendingSiteDelete = null; // Clear the pending deletion
            
            // Delete the individual site
            deleteSiteDataSidepanel(digest).then(() => {
                loadMySites(); // Refresh the list
                updateLimitDisplay(); // Update the limit counter
            }).catch(error => {
                console.error('Error deleting site:', error);
            });
            
            // Reset modal text back to default
            const modalTitle = modal.querySelector('.modal-title');
            const modalText = modal.querySelector('.modal-text');
            if (modalTitle) modalTitle.textContent = 'Delete All Changes';
            if (modalText) modalText.textContent = 'Are you sure you want to delete all changes on this page? This action cannot be undone.';
            
        } else {
            // This is for "Delete All Changes" button
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "deleteChanges"
                });
                
                // Refresh My Sites and limit display after a short delay to allow the delete to complete
                setTimeout(() => {
                    loadMySites();
                    updateLimitDisplay();
                }, 1000);
            });
        }
    });

    // Close modal when clicking outside
    document.getElementById("confirmationModal").addEventListener("click", function(event) {
        if (event.target === this) {
            this.style.display = "none";
            
            // Clear any pending site deletion
            if (window.pendingSiteDelete) {
                window.pendingSiteDelete = null;
                
                // Reset modal text back to default
                const modalTitle = this.querySelector('.modal-title');
                const modalText = this.querySelector('.modal-text');
                if (modalTitle) modalTitle.textContent = 'Delete All Changes';
                if (modalText) modalText.textContent = 'Are you sure you want to delete all changes on this page? This action cannot be undone.';
            }
        }
    });
}

