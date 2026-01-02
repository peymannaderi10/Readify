// Readify Extension - Storage Manager
// Handles data persistence, restoration, and storage operations
// Updated to use storage service abstraction for premium/free user routing

// Website limit constants (for free users)
const DEFAULT_WEBSITE_LIMIT = 5;

// Website limit tracking functions
async function getWebsiteLimit() {
    // Premium users have unlimited sites
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            return { used: 0, max: Infinity };
        }
    }
    
    // Free users use Chrome storage limit
    const result = await chrome.storage.sync.get('websiteLimit');
    return result.websiteLimit || { used: 0, max: DEFAULT_WEBSITE_LIMIT };
}

async function checkWebsiteLimit() {
    const limit = await getWebsiteLimit();
    return limit.max === Infinity || limit.used < limit.max;
}

async function incrementWebsiteLimit() {
    // Premium users don't need to track limits
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            return true;
        }
    }
    
    const limit = await getWebsiteLimit();
    if (limit.used < limit.max) {
        limit.used++;
        await chrome.storage.sync.set({ websiteLimit: limit });
        return true;
    }
    return false;
}

async function decrementWebsiteLimit() {
    // Premium users don't need to track limits
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            return;
        }
    }
    
    const limitResult = await chrome.storage.sync.get('websiteLimit');
    const limit = limitResult.websiteLimit || { used: 0, max: DEFAULT_WEBSITE_LIMIT };
    if (limit.used > 0) {
        limit.used--;
        await chrome.storage.sync.set({ websiteLimit: limit });
    }
}

async function isStudyModeAllowed() {
    const limit = await getWebsiteLimit();
    return limit.max === Infinity || limit.used < limit.max;
}

// Get the current website limit display info
async function getWebsiteLimitInfo() {
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            const count = await window.ReadifyStorage?.getSiteCount() || 0;
            return {
                used: count,
                max: Infinity,
                isPremium: true,
                display: `${count} sites (Unlimited)`
            };
        }
    }
    
    const limit = await getWebsiteLimit();
    const count = await window.ReadifyStorage?.getSiteCount() || limit.used;
    return {
        used: count,
        max: limit.max,
        isPremium: false,
        display: `${count}/${limit.max}`
    };
}

async function saveChangeToDisk(type, data, isDelete = false) {
    const urlDigest = await getURLDigest();
    
    // Use storage service if available
    if (window.ReadifyStorage) {
        // Load existing changes
        let changes = await window.ReadifyStorage.loadSiteChanges(urlDigest);
        let originalChangeCount = changes.length;
        
        if (isDelete) {
            // Remove the saved change for the deleted note
            changes = changes.filter(change => !(change.type === 'note' && change.data === data));
        } else if (type === "highlight" && data === "none") {
            // Special handling for highlight clearing
            let currentRange = serializeSelection();
            changes = changes.filter(change => {
                if (change.type === 'highlight') {
                    return !rangesOverlap(currentRange, change.range);
                }
                return true;
            });
        } else if (type === "underlineRemove") {
            // Special handling for underline removal
            let currentRange = serializeSelection();
            changes = changes.filter(change => {
                if (change.type === 'underline') {
                    return !rangesOverlap(currentRange, change.range);
                }
                return true;
            });
        } else {
            // Validate selection safety before saving
            if ((type === "highlight" || type === "underline") && !isSelectionSafe()) {
                console.warn("Attempted to save unsafe selection spanning across paragraphs");
                return;
            }
            let range = serializeSelection();
            changes.push({ type, range, data });
        }
        
        // Build site info
        const siteInfo = {
            url: window.location.href,
            title: document.title || window.location.hostname,
            hostname: window.location.hostname,
            lastModified: Date.now()
        };
        
        // Check limit for new sites
        if (!isDelete && changes.length > 0) {
            const existingChanges = await window.ReadifyStorage.loadSiteChanges(urlDigest);
            if (existingChanges.length === 0) {
                // This is a new site - check limit
                const canAdd = await checkWebsiteLimit();
                if (!canAdd) {
                    showUpgradePrompt('website_limit');
                    return;
                }
            }
        }
        
        // Save changes
        const result = await window.ReadifyStorage.saveSiteChanges(urlDigest, changes, siteInfo);
        
        if (result.error) {
            console.error('Failed to save changes:', result.error);
            return;
        }
        
        // Handle MySites updates
        if (changes.length === 0 && originalChangeCount > 0) {
            // All changes removed
            await window.ReadifyStorage.deleteSiteChanges(urlDigest);
            notifyMySitesUpdate('removed');
        } else if (changes.length > 0) {
            notifyMySitesUpdate(originalChangeCount === 0 ? 'added' : 'updated');
        }
        
        return;
    }
    
    // Fallback to direct Chrome storage (legacy)
    let key = `saved-${urlDigest}`;
    let savedChanges = await chrome.storage.sync.get(key);
    let changes = savedChanges[key] || [];
    let originalChangeCount = changes.length;
    
    if (isDelete) {
        changes = changes.filter(change => !(change.type === 'note' && change.data === data));
    } else if (type === "highlight" && data === "none") {
        let currentRange = serializeSelection();
        changes = changes.filter(change => {
            if (change.type === 'highlight') {
                return !rangesOverlap(currentRange, change.range);
            }
            return true;
        });
    } else if (type === "underlineRemove") {
        let currentRange = serializeSelection();
        changes = changes.filter(change => {
            if (change.type === 'underline') {
                return !rangesOverlap(currentRange, change.range);
            }
            return true;
        });
    } else {
        if ((type === "highlight" || type === "underline") && !isSelectionSafe()) {
            console.warn("Attempted to save unsafe selection spanning across paragraphs");
            return;
        }
        let range = serializeSelection();
        changes.push({ type, range, data });
    }

    chrome.storage.sync.set({ [key]: changes });

    // Handle MySites updates for all cases
    if (!isDelete && !(type === "highlight" && data === "none") && type !== "underlineRemove" && changes.length > 0) {
        try {
            await saveSiteInfo();
            notifyMySitesUpdate('added');
        } catch (error) {
            if (error.message.includes('Website limit reached')) {
                showUpgradePrompt('website_limit');
                changes.pop();
                chrome.storage.sync.set({ [key]: changes });
                return;
            }
            throw error;
        }
    } else if ((isDelete && changes.length === 0) || 
               (type === "highlight" && data === "none" && changes.length === 0) ||
               (type === "underlineRemove" && changes.length === 0)) {
        await cleanupSiteInfo();
        notifyMySitesUpdate('removed');
    } else if (isDelete && changes.length > 0) {
        try {
            await saveSiteInfo();
            notifyMySitesUpdate('updated');
        } catch (error) {
            if (error.message.includes('Website limit reached')) {
                showUpgradePrompt('website_limit');
                return;
            }
            throw error;
        }
    } else if (!isDelete && !(type === "highlight" && data === "none") && type !== "underlineRemove") {
        try {
            await saveSiteInfo();
            notifyMySitesUpdate('updated');
        } catch (error) {
            if (error.message.includes('Website limit reached')) {
                showUpgradePrompt('website_limit');
                return;
            }
            throw error;
        }
    } else if (((type === "highlight" && data === "none") || type === "underlineRemove") && 
               changes.length > 0 && originalChangeCount > changes.length) {
        try {
            await saveSiteInfo();
            notifyMySitesUpdate('updated');
        } catch (error) {
            if (error.message.includes('Website limit reached')) {
                showUpgradePrompt('website_limit');
                return;
            }
            throw error;
        }
    }
}

async function restoreChangesFromDisk(i = 0) {
    try {
        const urlDigest = await getURLDigest();
        let results = [];
        
        // Wait a bit for services to initialize on first attempt
        if (i === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Try to load from appropriate storage
        let loadedFromSupabase = false;
        
        // Check if user is premium and should load from Supabase
        if (window.ReadifySubscription && window.ReadifyAuth?.isAuthenticated()) {
            try {
                const isPremium = await window.ReadifySubscription.isPremium();
                if (isPremium) {
                    // Load directly from Supabase for premium users
                    const client = window.ReadifySupabase?.getClient();
                    const user = window.ReadifyAuth?.getCurrentUser();
                    
                    if (client && user) {
                        const { data, error } = await client
                            .from('user_sites')
                            .select('changes')
                            .eq('user_id', user.id)
                            .eq('url_digest', urlDigest)
                            .single();
                        
                        if (!error && data?.changes) {
                            // Parse JSON if needed
                            results = typeof data.changes === 'string' 
                                ? JSON.parse(data.changes) 
                                : data.changes;
                            loadedFromSupabase = true;
                            console.log('Restored', results.length, 'changes from Supabase');
                        }
                    }
                }
            } catch (e) {
                console.log('Could not load from Supabase, trying Chrome storage:', e.message);
            }
        }
        
        // Fallback to Chrome storage if not loaded from Supabase
        if (!loadedFromSupabase) {
            if (window.ReadifyStorage) {
                results = await window.ReadifyStorage.loadSiteChanges(urlDigest);
            } else {
                let key = `saved-${urlDigest}`;
                const saved = await chrome.storage.sync.get(key);
                results = saved[key] || [];
            }
            if (results.length > 0) {
                console.log('Restored', results.length, 'changes from Chrome storage');
            }
        }

        if (results && results.length > 0) {
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
                            createNoteAnchor(data);
                        }
                        break;
                }
            }
        } else {
            console.log("No saved data found for this page");
        }
    } catch (e) {
        console.log('restoreChangesFromDisk attempt', i, 'failed:', e.message);
        if (i < 10) {
            setTimeout(() => {
                restoreChangesFromDisk(i + 1);
            }, 1000);
        }
    }
}

async function deleteChangesFromDisk() {
    const urlDigest = await getURLDigest();
    
    // Use storage service if available
    if (window.ReadifyStorage) {
        await window.ReadifyStorage.deleteSiteChanges(urlDigest);
    } else {
        let key = `saved-${urlDigest}`;
        chrome.storage.sync.remove(key);
    }
    
    // Also remove from localStorage (notes)
    let localStorageKey = `readifyNotes-${urlDigest}`;
    localStorage.removeItem(localStorageKey);
    
    // Clean up site info (for Chrome storage mode)
    await cleanupSiteInfo();
    
    // Decrement the website limit counter
    await decrementWebsiteLimit();
    
    notifyMySitesUpdate('removed');
    
    window.location.reload();
}

async function saveSiteInfo() {
    // Premium users using cloud storage don't need local site tracking
    if (window.ReadifyStorage?.isCloud()) {
        return;
    }
    
    const urlDigest = await getURLDigest();
    const siteInfoKey = `site-info-${urlDigest}`;
    
    // Get current site info or create new
    const currentSiteInfo = await chrome.storage.sync.get(siteInfoKey);
    
    if (!currentSiteInfo[siteInfoKey]) {
        // Check if we can add a new site (within limit)
        const canAddSite = await checkWebsiteLimit();
        if (!canAddSite) {
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
    // Premium users using cloud storage don't need local cleanup
    if (window.ReadifyStorage?.isCloud()) {
        return;
    }
    
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
    // Use storage service if available
    if (window.ReadifyStorage) {
        return await window.ReadifyStorage.getAllSites();
    }
    
    // Fallback to direct Chrome storage
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
    // Use storage service if available
    if (window.ReadifyStorage) {
        await window.ReadifyStorage.deleteSiteChanges(digest);
        await decrementWebsiteLimit();
        return;
    }
    
    // Fallback to direct Chrome storage
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
    await decrementWebsiteLimit();
}

// Show upgrade prompt for premium features
function showUpgradePrompt(feature) {
    const messages = {
        'website_limit': 'You\'ve reached the free limit of 5 websites. Upgrade to Premium for unlimited sites!',
        'summarize': 'AI Summarization is a Premium feature. Upgrade to unlock!',
        'tts': 'Text-to-Speech is a Premium feature. Upgrade to unlock!',
        'default': 'This is a Premium feature. Upgrade to unlock all features!'
    };
    
    const message = messages[feature] || messages['default'];
    
    // Create upgrade prompt
    const existingPrompt = document.querySelector('#readify-upgrade-prompt');
    if (existingPrompt) existingPrompt.remove();
    
    const prompt = document.createElement('div');
    prompt.id = 'readify-upgrade-prompt';
    prompt.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 32px;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        z-index: 10002;
        max-width: 400px;
        text-align: center;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    prompt.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
        <h3 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700;">Upgrade to Premium</h3>
        <p style="margin: 0 0 24px 0; font-size: 14px; opacity: 0.9; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="readify-upgrade-btn" style="
                background: white;
                color: #764ba2;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
            ">Upgrade Now</button>
            <button id="readify-close-upgrade" style="
                background: transparent;
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                font-size: 14px;
            ">Maybe Later</button>
        </div>
    `;
    
    document.body.appendChild(prompt);
    
    // Add event listeners
    document.getElementById('readify-upgrade-btn').addEventListener('click', async () => {
        prompt.remove();
        if (window.ReadifySubscription) {
            await window.ReadifySubscription.createCheckoutSession();
        } else {
            // Fallback: Open sidepanel
            chrome.runtime.sendMessage({ type: 'openSidepanel' });
        }
    });
    
    document.getElementById('readify-close-upgrade').addEventListener('click', () => {
        prompt.remove();
    });
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
