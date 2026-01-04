// Readify Extension - Chrome Local Storage Operations
// Functions for interacting with chrome.storage.local

// Save site data to chrome.storage.local
async function saveSiteToLocal(urlDigest, siteData) {
    try {
        const key = `readify-site-${urlDigest}`;
        const dataSize = calculateStorageSize(siteData);
        siteData.sizeBytes = dataSize;
        
        await chrome.storage.local.set({ [key]: siteData });
        return { success: true };
    } catch (e) {
        console.error('Failed to save site to local storage:', e);
        return { error: { message: e.message } };
    }
}

// Load site data from chrome.storage.local
async function loadSiteFromLocal(urlDigest) {
    try {
        const key = `readify-site-${urlDigest}`;
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
    } catch (e) {
        console.error('Failed to load site from local storage:', e);
        return null;
    }
}

// Delete site data from chrome.storage.local
async function deleteSiteFromLocal(urlDigest) {
    try {
        const key = `readify-site-${urlDigest}`;
        await chrome.storage.local.remove(key);
        return { success: true };
    } catch (e) {
        console.error('Failed to delete site from local storage:', e);
        return { error: { message: e.message } };
    }
}

// Get all sites from chrome.storage.local
async function getAllSitesFromLocal() {
    try {
        const result = await chrome.storage.local.get(null);
        const sites = [];
        
        for (const [key, value] of Object.entries(result)) {
            if (key.startsWith('readify-site-') && value.info) {
                const digest = key.replace('readify-site-', '');
                sites.push({
                    digest: digest,
                    info: value.info,
                    changeCount: value.changes?.length || 0,
                    changes: value.changes || [],
                    notes: value.notes || {},
                    sizeBytes: value.sizeBytes || 0
                });
            }
        }
        
        // Sort by last modified
        sites.sort((a, b) => (b.info?.lastModified || 0) - (a.info?.lastModified || 0));
        return sites;
    } catch (e) {
        console.error('Failed to get all sites from local storage:', e);
        return [];
    }
}

// Update global stats after saving
async function updateGlobalStatsAfterSave(urlDigest, siteData, isNewSite, originalChangeCount) {
    const stats = await getGlobalStats();
    
    // Add site if new
    if (isNewSite && !stats.sites.includes(urlDigest)) {
        stats.sites.push(urlDigest);
        stats.siteCount++;
    }
    
    // Recalculate total size by getting all sites (more accurate but slower)
    // For better performance, we could track size changes incrementally
    const allSites = await getAllSitesFromLocal();
    stats.totalSizeBytes = allSites.reduce((total, site) => total + (site.sizeBytes || 0), 0);
    
    await updateGlobalStats(stats);
}

// Update global stats after deleting
async function updateGlobalStatsAfterDelete(urlDigest) {
    const stats = await getGlobalStats();
    
    // Remove site from list
    stats.sites = stats.sites.filter(digest => digest !== urlDigest);
    stats.siteCount = stats.sites.length;
    
    // Recalculate total size
    const allSites = await getAllSitesFromLocal();
    stats.totalSizeBytes = allSites.reduce((total, site) => total + (site.sizeBytes || 0), 0);
    
    await updateGlobalStats(stats);
}

