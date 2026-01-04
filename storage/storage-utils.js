// Readify Extension - Storage Utility Functions
// Helper functions for storage operations

// Calculate storage size in bytes
function calculateStorageSize(data) {
    return new Blob([JSON.stringify(data)]).size;
}

// Get or initialize global stats
// NOTE: siteCount in stats is for display/caching only - NOT for limit enforcement
// Always use calculateActualSiteCount() for limit checks to prevent tampering
async function getGlobalStats() {
    try {
        const result = await chrome.storage.local.get(GLOBAL_STATS_KEY);
        return result[GLOBAL_STATS_KEY] || {
            totalSizeBytes: 0,
            siteCount: 0, // Display only - use calculateActualSiteCount() for limits
            sites: []
        };
    } catch (e) {
        console.error('Failed to get global stats:', e);
        return {
            totalSizeBytes: 0,
            siteCount: 0, // Display only - use calculateActualSiteCount() for limits
            sites: []
        };
    }
}

// Update global stats
async function updateGlobalStats(stats) {
    try {
        await chrome.storage.local.set({ [GLOBAL_STATS_KEY]: stats });
    } catch (e) {
        console.error('Failed to update global stats:', e);
    }
}

// Calculate actual site count by scanning storage (tamper-proof)
// This is the source of truth - never trust stored siteCount
async function calculateActualSiteCount() {
    try {
        const allData = await chrome.storage.local.get(null);
        let count = 0;
        
        for (const [key, value] of Object.entries(allData)) {
            // Only count keys that are actual site data with content
            if (key.startsWith('readify-site-') && value.info) {
                const changesCount = value.changes?.length || 0;
                const notesCount = Object.keys(value.notes || {}).length;
                // Only count sites that have actual content
                if (changesCount > 0 || notesCount > 0) {
                    count++;
                }
            }
        }
        
        return count;
    } catch (e) {
        console.error('Failed to calculate actual site count:', e);
        return 0;
    }
}

// Check if a site already exists in storage (tamper-proof check)
async function siteExistsInStorage(urlDigest) {
    try {
        const key = `readify-site-${urlDigest}`;
        const result = await chrome.storage.local.get(key);
        const siteData = result[key];
        
        if (!siteData || !siteData.info) return false;
        
        // Verify site has actual content
        const changesCount = siteData.changes?.length || 0;
        const notesCount = Object.keys(siteData.notes || {}).length;
        return changesCount > 0 || notesCount > 0;
    } catch (e) {
        console.error('Failed to check if site exists:', e);
        return false;
    }
}

