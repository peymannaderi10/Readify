// On sidepanel load
document.addEventListener("DOMContentLoaded", async function () {
    // Check if study mode should be disabled due to limit
    const allowed = await checkStudyModeAllowed();
    
    // Initialize Study Mode state
    chrome.storage.sync.get(["extensionEnabled"], function(result) {
        const enableCheckbox = document.getElementById("enableCheckbox");
        const deleteButton = document.getElementById("deleteChangesButton");
        const toggleLabel = enableCheckbox.closest('.modern-toggle');
        const toggleText = toggleLabel.querySelector('.toggle-text');
        
        let enabled = result.extensionEnabled || false;
        
        // If limit is reached, force disable study mode
        if (!allowed && enabled) {
            enabled = false;
            chrome.storage.sync.set({ extensionEnabled: false });
        }
        
        enableCheckbox.checked = enabled;
        deleteButton.disabled = !enabled;
        toggleText.textContent = enabled ? 'Disable Study Mode' : 'Enable Study Mode';
    });

    // Load My Sites
    loadMySites();
    
    // Load and display website limit
    updateLimitDisplay();

    // Set up real-time message listener for My Sites updates
    setupMySitesListener();
});

function setupMySitesListener() {
    // Listen for messages from content scripts about site changes
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'mySitesUpdate') {
            handleMySitesUpdate(message);
        }
    });
}

async function handleMySitesUpdate(message) {
    // Reload the My Sites list when changes are made
    await loadMySites();
    
    // Update limit display
    await updateLimitDisplay();
    
    // Optional: Show a brief visual indicator that the list was updated
    const sitesList = document.getElementById('sitesList');
    if (sitesList) {
        sitesList.style.opacity = '0.7';
        setTimeout(() => {
            sitesList.style.opacity = '1';
        }, 200);
    }
}

async function loadMySites() {
    try {
        // Sync site tracking first to ensure all sites are properly listed
        await syncSiteTracking();
        
        // Small delay to ensure sync completes
        setTimeout(async () => {
            const sites = await getAllSavedSites();
            displaySites(sites);
        }, 100);
    } catch (error) {
        console.error('Error loading sites:', error);
    }
}

function displaySites(sites) {
    const sitesList = document.getElementById('sitesList');
    
    // Remove existing event listener to prevent duplicates
    sitesList.removeEventListener('click', handleSiteClick);
    
    if (sites.length === 0) {
        sitesList.innerHTML = `
            <div class="empty-sites">
                <p>No saved sites yet</p>
                <small>Your highlighted and noted websites will appear here</small>
            </div>
        `;
        return;
    }

    sitesList.innerHTML = sites.map(site => `
        <div class="site-item">
            <div class="site-info" data-url="${escapeHtml(site.info.url)}">
                <div class="site-title">${escapeHtml(site.info.title)}</div>
                <div class="site-url">${escapeHtml(site.info.hostname)} • ${site.changeCount} change${site.changeCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="site-actions">
                <button class="site-delete-btn" data-digest="${site.digest}" title="Delete all changes for this site">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');

    // Add event listeners using event delegation
    sitesList.addEventListener('click', handleSiteClick);
}

function handleSiteClick(event) {
    const target = event.target;
    
    // Handle site info click (open site)
    if (target.closest('.site-info')) {
        const siteInfo = target.closest('.site-info');
        const url = siteInfo.dataset.url;
        if (url) {
            openSite(url);
        }
    }
    
    // Handle delete button click
    if (target.classList.contains('site-delete-btn')) {
        const digest = target.dataset.digest;
        if (digest) {
            deleteSite(digest);
        }
    }
}

function openSite(url) {
    chrome.tabs.create({ url: url });
}

async function deleteSite(digest) {
    // Store the digest for the modal confirmation
    window.pendingSiteDelete = digest;
    
    // Show the same confirmation modal
    const modal = document.getElementById("confirmationModal");
    
    // Update modal text for individual site deletion
    const modalTitle = modal.querySelector('.modal-title');
    const modalText = modal.querySelector('.modal-text');
    
    if (modalTitle) modalTitle.textContent = 'Delete Site Changes';
    if (modalText) modalText.textContent = 'Delete all changes for this site? This action cannot be undone.';
    
    modal.style.display = "flex";
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper function to get all saved sites (will be available from storage-manager.js)
async function getAllSavedSites() {
    // This function is defined in storage-manager.js, but we need to call it from here
    // We'll use chrome.tabs.executeScript to call it in the content script context
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: async function() {
                        // This will run in the content script context where getAllSavedSites is available
                        try {
                            const allSitesKey = 'readify-all-sites';
                            const allSites = await chrome.storage.sync.get(allSitesKey);
                            const siteDigests = allSites[allSitesKey] || [];
                            
                            const sites = [];
                            for (const digest of siteDigests) {
                                const siteInfoKey = `site-info-${digest}`;
                                const savedKey = `saved-${digest}`;
                                
                                const [siteInfo, savedChanges] = await Promise.all([
                                    chrome.storage.sync.get(siteInfoKey),
                                    chrome.storage.sync.get(savedKey)
                                ]);
                                
                                if (siteInfo[siteInfoKey] && savedChanges[savedKey] && savedChanges[savedKey].length > 0) {
                                    sites.push({
                                        digest: digest,
                                        info: siteInfo[siteInfoKey],
                                        changeCount: savedChanges[savedKey].length
                                    });
                                }
                            }
                            
                            sites.sort((a, b) => b.info.lastModified - a.info.lastModified);
                            return sites;
                        } catch (error) {
                            console.error('Error in getAllSavedSites:', error);
                            return [];
                        }
                    }
                }, function(results) {
                    if (results && results[0]) {
                        resolve(results[0].result || []);
                    } else {
                        resolve([]);
                    }
                });
            } else {
                resolve([]);
            }
        });
    });
}

// Helper function to delete site data
async function deleteSiteData(digest) {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: async function(digest) {
                        const siteInfoKey = `site-info-${digest}`;
                        const savedKey = `saved-${digest}`;
                        
                        // Remove site data
                        chrome.storage.sync.remove([siteInfoKey, savedKey]);
                        
                        // Remove from all sites list
                        const allSitesKey = 'readify-all-sites';
                        const allSites = await chrome.storage.sync.get(allSitesKey);
                        const siteDigests = allSites[allSitesKey] || [];
                        
                        const updatedDigests = siteDigests.filter(d => d !== digest);
                        chrome.storage.sync.set({ [allSitesKey]: updatedDigests });
                        
                        // Decrement the website limit counter
                        const limitResult = await chrome.storage.sync.get('websiteLimit');
                        const limit = limitResult.websiteLimit || { used: 0, max: 5 };
                        if (limit.used > 0) {
                            limit.used--;
                            await chrome.storage.sync.set({ websiteLimit: limit });
                        }
                    },
                    args: [digest]
                }, function() {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

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
            alert('You have reached the maximum limit of 5 websites. Please delete some sites to continue using Study Mode.');
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
    
    // Update delete button state
    const deleteButton = document.getElementById("deleteChangesButton");
    deleteButton.disabled = !event.target.checked;
});

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
        deleteSiteData(digest).then(() => {
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

// Website limit functions
async function getWebsiteLimit() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('websiteLimit', function(result) {
            const limit = result.websiteLimit || { used: 0, max: 5 };
            resolve(limit);
        });
    });
}

async function syncSiteTracking() {
    // Get all storage keys to find all sites
    chrome.storage.sync.get(null, function(allData) {
        const siteInfoKeys = Object.keys(allData).filter(key => key.startsWith('site-info-'));
        const savedKeys = Object.keys(allData).filter(key => key.startsWith('saved-'));
        
        // Find all site digests that have both site-info and saved data
        const validSiteDigests = [];
        
        siteInfoKeys.forEach(siteInfoKey => {
            const digest = siteInfoKey.replace('site-info-', '');
            const savedKey = `saved-${digest}`;
            
            // Check if this site has saved changes
            if (allData[savedKey] && allData[savedKey].length > 0) {
                validSiteDigests.push(digest);
            }
        });
        
        // Update the readify-all-sites array
        chrome.storage.sync.set({ 'readify-all-sites': validSiteDigests });
        
        // Update the website limit to match actual count
        const currentLimit = allData.websiteLimit || { used: 0, max: 5 };
        currentLimit.used = validSiteDigests.length;
        chrome.storage.sync.set({ websiteLimit: currentLimit });
        
        console.log(`Synced site tracking: Found ${validSiteDigests.length} sites`);
    });
}

async function updateLimitDisplay() {
    try {
        // First sync the site tracking to ensure accuracy
        await syncSiteTracking();
        
        // Then update display
        setTimeout(async () => {
            const limit = await getWebsiteLimit();
            const limitCounter = document.getElementById('limitCounter');
            if (limitCounter) {
                limitCounter.textContent = `(${limit.used}/${limit.max})`;
                if (limit.used >= limit.max) {
                    limitCounter.classList.add('limit-reached');
                } else {
                    limitCounter.classList.remove('limit-reached');
                }
            }
        }, 100);
    } catch (error) {
        console.error('Error updating limit display:', error);
    }
}

async function checkStudyModeAllowed() {
    const limit = await getWebsiteLimit();
    return limit.used < limit.max;
} 

// Manual sync function to fix inconsistent state - can be called from console
window.fixSiteTracking = function() {
    chrome.storage.sync.get(null, function(allData) {
        console.log('Current storage data:', allData);
        
        const siteInfoKeys = Object.keys(allData).filter(key => key.startsWith('site-info-'));
        const savedKeys = Object.keys(allData).filter(key => key.startsWith('saved-'));
        
        console.log('Found site-info keys:', siteInfoKeys);
        console.log('Found saved keys:', savedKeys);
        
        // Find all site digests that have both site-info and saved data
        const validSiteDigests = [];
        
        siteInfoKeys.forEach(siteInfoKey => {
            const digest = siteInfoKey.replace('site-info-', '');
            const savedKey = `saved-${digest}`;
            
            console.log(`Checking digest ${digest}:`, {
                hasSiteInfo: !!allData[siteInfoKey],
                hasSaved: !!allData[savedKey],
                savedLength: allData[savedKey] ? allData[savedKey].length : 0
            });
            
            // Check if this site has saved changes
            if (allData[savedKey] && allData[savedKey].length > 0) {
                validSiteDigests.push(digest);
            }
        });
        
        console.log('Valid site digests:', validSiteDigests);
        
        // Update the readify-all-sites array
        chrome.storage.sync.set({ 'readify-all-sites': validSiteDigests }, function() {
            console.log('Updated readify-all-sites to:', validSiteDigests);
        });
        
        // Update the website limit to match actual count
        const currentLimit = allData.websiteLimit || { used: 0, max: 5 };
        currentLimit.used = validSiteDigests.length;
        chrome.storage.sync.set({ websiteLimit: currentLimit }, function() {
            console.log('Updated websiteLimit to:', currentLimit);
        });
        
        // Refresh the UI
        setTimeout(() => {
            loadMySites();
            updateLimitDisplay();
        }, 200);
    });
}; 