// Readify Extension - Storage Manager
// Handles data persistence, restoration, and storage operations

// Website limit constants
const WEBSITE_LIMIT = 5;

// Website limit tracking functions
async function getWebsiteLimit() {
    const result = await chrome.storage.sync.get('websiteLimit');
    return result.websiteLimit || { used: 0, max: WEBSITE_LIMIT };
}

async function checkWebsiteLimit() {
    const limit = await getWebsiteLimit();
    return limit.used < limit.max;
}

async function incrementWebsiteLimit() {
    const limit = await getWebsiteLimit();
    if (limit.used < limit.max) {
        limit.used++;
        await chrome.storage.sync.set({ websiteLimit: limit });
        return true;
    }
    return false;
}

async function isStudyModeAllowed() {
    const limit = await getWebsiteLimit();
    return limit.used < limit.max;
}

async function saveChangeToDisk(type, data, isDelete = false) {
    let key = `saved-${await getURLDigest()}`;
    let savedChanges = await chrome.storage.sync.get(key);
    let changes = savedChanges[key] || [];
    let originalChangeCount = changes.length;
    
    if (isDelete) {
        // Remove the saved change for the deleted note
        changes = changes.filter(change => !(change.type === 'note' && change.data === data));
    } else if (type === "highlight" && data === "none") {
        // Special handling for highlight clearing: remove overlapping highlight entries
        let currentRange = serializeSelection();
        changes = changes.filter(change => {
            if (change.type === 'highlight') {
                // Check if the current selection overlaps with this stored highlight
                return !rangesOverlap(currentRange, change.range);
            }
            return true; // Keep non-highlight changes
        });
    } else {
        let range = serializeSelection();
        changes.push({ type, range, data });
    }

    chrome.storage.sync.set({ [key]: changes });

    // Handle MySites updates for all cases
    if (!isDelete && !(type === "highlight" && data === "none") && changes.length > 0) {
        // Regular addition case
        try {
            await saveSiteInfo();
            // Send message to update My Sites in real-time
            notifyMySitesUpdate('added');
        } catch (error) {
            if (error.message.includes('Website limit reached')) {
                // Show user-friendly message
                alert('🚫 Website Limit Reached!\n\nYou have reached the maximum of 5 websites. Please delete some sites from the sidepanel to continue using Study Mode.');
                // Remove the change we just added since we can't save the site
                changes.pop();
                chrome.storage.sync.set({ [key]: changes });
                return;
            }
            throw error;
        }
    } else if ((isDelete && changes.length === 0) || (type === "highlight" && data === "none" && changes.length === 0)) {
        // Site should be removed: either deleted last item OR cleared last highlight
        await cleanupSiteInfo();
        notifyMySitesUpdate('removed');
    } else if (!isDelete && !(type === "highlight" && data === "none")) {
        // Regular update case (not highlight clearing)
        try {
            await saveSiteInfo();
            notifyMySitesUpdate('updated');
        } catch (error) {
            if (error.message.includes('Website limit reached')) {
                // Show user-friendly message
                alert('🚫 Website Limit Reached!\n\nYou have reached the maximum of 5 websites. Please delete some sites from the sidepanel to continue using Study Mode.');
                return;
            }
            throw error;
        }
    } else if (type === "highlight" && data === "none" && changes.length > 0 && originalChangeCount > changes.length) {
        // Highlight was cleared but site still has other changes - update the site info
        try {
            await saveSiteInfo();
            notifyMySitesUpdate('updated');
        } catch (error) {
            if (error.message.includes('Website limit reached')) {
                // Show user-friendly message
                alert('🚫 Website Limit Reached!\n\nYou have reached the maximum of 5 websites. Please delete some sites from the sidepanel to continue using Study Mode.');
                return;
            }
            throw error;
        }
    }
}

async function restoreChangesFromDisk(i = 0) {
    try {
        let key = `saved-${await getURLDigest()}`;
        const saved = await chrome.storage.sync.get(key);
        const results = saved[key];

        if (results) {
            for (const result of results) {
                let { type, range, data } = result;
                let startContainer = document.body;
                let endContainer = document.body;

                for (let i = 0; i < range.startContainerPath.length; i++) {
                    startContainer = startContainer.childNodes[range.startContainerPath[i]];
                }

                for (let i = 0; i < range.endContainerPath.length; i++) {
                    endContainer = endContainer.childNodes[range.endContainerPath[i]];
                }

                let selection = window.getSelection();
                let newRange = document.createRange();
                newRange.setStart(startContainer, range.startOffset);
                newRange.setEnd(endContainer, range.endOffset);
                selection.removeAllRanges();
                selection.addRange(newRange);

                switch (type) {
                    case "highlight":
                        highlightSelectedText(data);
                        break;
                        
                    case "underline":
                        underlineSelectedText();
                        break;
                    case "underlineRemove":
                        underlineSelectedText("remove");
                        break;

                    case "note":
                        if (!localStorage.getItem(data)) {
                            // Only restore the note if it hasn't been deleted
                            createNoteAnchor(data);
                        }
                        break;
                }
            }
        } else {
            console.log("No data found");
        }
    } catch (e) {
        if (i < 10) {
            setTimeout(() => {
                restoreChangesFromDisk(i + 1);
            }, 1000);
        }
    }
}

async function deleteChangesFromDisk() {
    let key = `saved-${await getURLDigest()}`;
    chrome.storage.sync.remove(key);
    
    // Also remove from localStorage (notes)
    let localStorageKey = `readifyNotes-${await getURLDigest()}`;
    localStorage.removeItem(localStorageKey);
    
    // Clean up site info
    await cleanupSiteInfo();
    
    // Decrement the website limit counter
    const limitResult = await chrome.storage.sync.get('websiteLimit');
    const limit = limitResult.websiteLimit || { used: 0, max: 5 };
    if (limit.used > 0) {
        limit.used--;
        await chrome.storage.sync.set({ websiteLimit: limit });
    }
    
    notifyMySitesUpdate('removed');
    
    window.location.reload();
}

async function saveSiteInfo() {
    const urlDigest = await getURLDigest();
    const siteInfoKey = `site-info-${urlDigest}`;
    
    // Get current site info or create new
    const currentSiteInfo = await chrome.storage.sync.get(siteInfoKey);
    
    if (!currentSiteInfo[siteInfoKey]) {
        // Check if we can add a new site (within limit)
        const canAddSite = await checkWebsiteLimit();
        if (!canAddSite) {
            // Limit reached, disable study mode
            chrome.storage.sync.set({ extensionEnabled: false });
            throw new Error('Website limit reached. Study mode has been disabled.');
        }
        
        const siteInfo = {
            url: window.location.href,
            title: document.title || window.location.hostname,
            hostname: window.location.hostname,
            lastModified: Date.now()
        };
        
        chrome.storage.sync.set({ [siteInfoKey]: siteInfo });
        
        // Also maintain a list of all site digests
        const allSitesKey = 'readify-all-sites';
        const allSites = await chrome.storage.sync.get(allSitesKey);
        const siteDigests = allSites[allSitesKey] || [];
        
        if (!siteDigests.includes(urlDigest)) {
            siteDigests.push(urlDigest);
            chrome.storage.sync.set({ [allSitesKey]: siteDigests });
            
            // Increment the website limit counter
            await incrementWebsiteLimit();
        }
    } else {
        // Update last modified time
        currentSiteInfo[siteInfoKey].lastModified = Date.now();
        chrome.storage.sync.set({ [siteInfoKey]: currentSiteInfo[siteInfoKey] });
    }
}

async function cleanupSiteInfo() {
    const urlDigest = await getURLDigest();
    const siteInfoKey = `site-info-${urlDigest}`;
    
    // Remove site info
    chrome.storage.sync.remove(siteInfoKey);
    
    // Remove from all sites list
    const allSitesKey = 'readify-all-sites';
    const allSites = await chrome.storage.sync.get(allSitesKey);
    const siteDigests = allSites[allSitesKey] || [];
    
    const updatedDigests = siteDigests.filter(d => d !== urlDigest);
    chrome.storage.sync.set({ [allSitesKey]: updatedDigests });
}

function notifyMySitesUpdate(action) {
    // Send message to extension popup/sidepanel to update My Sites
    chrome.runtime.sendMessage({
        type: 'mySitesUpdate',
        action: action, // 'added', 'updated', 'removed'
        url: window.location.href,
        title: document.title || window.location.hostname,
        hostname: window.location.hostname
    }).catch(() => {
        // Ignore errors if popup/sidepanel is not open
    });
}

async function getAllSavedSites() {
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
    
    // Sort by last modified (most recent first)
    sites.sort((a, b) => b.info.lastModified - a.info.lastModified);
    
    return sites;
}

async function deleteSiteData(digest) {
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
}

// Note management functions
function attachNoteEvents() {
    document.querySelectorAll("a").forEach((anchor) => {
        if (localStorage.getItem(anchor.textContent)) {
            anchor.onclick = function (e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };
        }
    });
}

function createNoteAnchor(noteText) {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            let contents = range.extractContents();
            let anchor = document.createElement("a");
            anchor.className = "note-anchor";
            anchor.href = "#";
            anchor.onclick = function (e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };

            // Highlight the anchor text if there's content in the textarea
            let span = document.createElement("span");
            span.style.backgroundColor = "yellow";
            span.appendChild(contents);
            anchor.appendChild(span);

            range.insertNode(anchor);
            localStorage.setItem(anchor.textContent, noteText);
            window.getSelection().removeAllRanges();
        }
    }
} 