// Readify Extension - Storage Manager
// Handles data persistence, restoration, and storage operations
// Updated to use chrome.storage.local for free users with 10MB and 5 website limits

// Storage limit constants
const DEFAULT_WEBSITE_LIMIT = 5;
const DEFAULT_STORAGE_LIMIT_MB = 10;
const DEFAULT_STORAGE_LIMIT_BYTES = DEFAULT_STORAGE_LIMIT_MB * 1024 * 1024; // 10MB in bytes

// Global stats key for chrome.storage.local
const GLOBAL_STATS_KEY = 'readify-global-stats';

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Calculate storage size in bytes
function calculateStorageSize(data) {
    return new Blob([JSON.stringify(data)]).size;
}

// Get or initialize global stats
async function getGlobalStats() {
    try {
        const result = await chrome.storage.local.get(GLOBAL_STATS_KEY);
        return result[GLOBAL_STATS_KEY] || {
            totalSizeBytes: 0,
            siteCount: 0,
            sites: []
        };
    } catch (e) {
        console.error('Failed to get global stats:', e);
        return {
            totalSizeBytes: 0,
            siteCount: 0,
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

// ============================================
// LIMIT CHECKING FUNCTIONS
// ============================================

// Check if user can add a new change
async function canAddChange(urlDigest, estimatedChangeSize = 0) {
    // Premium users have no limits
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            return { canAdd: true };
        }
    }
    
    const stats = await getGlobalStats();
    
    // Check website limit for new sites
    if (!stats.sites.includes(urlDigest) && stats.siteCount >= DEFAULT_WEBSITE_LIMIT) {
        return { canAdd: false, reason: 'website_limit' };
    }
    
    // Check storage limit
    if (stats.totalSizeBytes + estimatedChangeSize > DEFAULT_STORAGE_LIMIT_BYTES) {
        return { canAdd: false, reason: 'storage_limit' };
    }
    
    return { canAdd: true };
}

// Get website limit info for display
async function getWebsiteLimitInfo() {
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            const count = await getSiteCount();
            return {
                used: count,
                max: Infinity,
                isPremium: true,
                display: `${count} sites (Unlimited)`
            };
        }
    }
    
    const stats = await getGlobalStats();
    const storageUsedMB = Math.round((stats.totalSizeBytes / (1024 * 1024)) * 100) / 100;
    
    return {
        used: stats.siteCount,
        max: DEFAULT_WEBSITE_LIMIT,
        isPremium: false,
        storageUsedMB: storageUsedMB,
        storageMaxMB: DEFAULT_STORAGE_LIMIT_MB,
        display: `${stats.siteCount}/${DEFAULT_WEBSITE_LIMIT} sites (${storageUsedMB}/${DEFAULT_STORAGE_LIMIT_MB}MB)`
    };
}

// ============================================
// CHROME STORAGE OPERATIONS
// ============================================

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

// Get site count
async function getSiteCount() {
    // For premium users, get from Supabase
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            const client = window.ReadifySupabase?.getClient();
            const user = window.ReadifyAuth?.getCurrentUser();
            
            if (client && user) {
                try {
                    const { count, error } = await client
                        .from('user_sites')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);
                    
                    return count || 0;
                } catch (e) {
                    console.error('Failed to get site count from Supabase:', e);
                }
            }
        }
    }
    
    // For free users, get from local storage
    const stats = await getGlobalStats();
    return stats.siteCount;
}

// ============================================
// SUPABASE OPERATIONS (for premium users)
// ============================================

// Save to Supabase for premium users
async function saveToSupabase(urlDigest, changes, siteInfo, notes = {}) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { error: { message: 'Not authenticated' } };
    }
    
    try {
        const { data, error } = await client
            .from('user_sites')
            .upsert({
                user_id: user.id,
                url_digest: urlDigest,
                url: siteInfo?.url || '',
                title: siteInfo?.title || '',
                hostname: siteInfo?.hostname || '',
                changes: changes,
                notes: notes,
                last_modified: new Date().toISOString()
            }, {
                onConflict: 'user_id,url_digest'
            })
            .select()
            .single();
        
        if (error) {
            console.error('Save to Supabase error:', error);
            return { error };
        }
        
        return { data, error: null };
    } catch (e) {
        console.error('Save to Supabase exception:', e);
        return { error: { message: e.message } };
    }
}

// Load from Supabase for premium users
async function loadFromSupabase(urlDigest) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return null;
    }
    
    try {
        const { data, error } = await client
            .from('user_sites')
            .select('*')
            .eq('user_id', user.id)
            .eq('url_digest', urlDigest)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Load from Supabase error:', error);
            return null;
        }
        
        if (!data) {
            return null;
        }
        
        // Convert to local format
        return {
            info: {
                url: data.url,
                title: data.title,
                hostname: data.hostname,
                lastModified: new Date(data.last_modified).getTime()
            },
            changes: data.changes || [],
            notes: data.notes || {}
        };
    } catch (e) {
        console.error('Load from Supabase exception:', e);
        return null;
    }
}

// Delete from Supabase for premium users
async function deleteFromSupabase(urlDigest) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { error: { message: 'Not authenticated' } };
    }
    
    try {
        const { error } = await client
            .from('user_sites')
            .delete()
            .eq('user_id', user.id)
            .eq('url_digest', urlDigest);
        
        if (error) {
            console.error('Delete from Supabase error:', error);
            return { error };
        }
        
        return { success: true };
    } catch (e) {
        console.error('Delete from Supabase exception:', e);
        return { error: { message: e.message } };
    }
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

// Migrate from chrome.storage.sync to chrome.storage.local for free users
async function migrateFromSyncToLocal() {
    try {
        console.log('Starting migration from sync to local storage...');
        
        // Get all data from sync storage
        const syncData = await new Promise((resolve) => {
            chrome.storage.sync.get(null, (data) => {
                resolve(chrome.runtime.lastError ? {} : data);
            });
        });
        
        let migratedSites = 0;
        const stats = {
            totalSizeBytes: 0,
            siteCount: 0,
            sites: []
        };
        
        // Find all saved sites in sync storage
        const siteDigests = new Set();
        for (const key in syncData) {
            if (key.startsWith('saved-')) {
                const digest = key.replace('saved-', '');
                siteDigests.add(digest);
            }
        }
        
        // Migrate each site
        for (const digest of siteDigests) {
            const savedKey = `saved-${digest}`;
            const siteInfoKey = `site-info-${digest}`;
            
            const changes = syncData[savedKey] || [];
            const siteInfo = syncData[siteInfoKey] || {
                url: 'Unknown',
                title: 'Migrated Site',
                hostname: 'unknown',
                lastModified: Date.now()
            };
            
            if (changes.length > 0) {
                // Create new site data structure
                const siteData = {
                    info: siteInfo,
                    changes: changes,
                    notes: {},
                    sizeBytes: 0
                };
                
                // Calculate size
                siteData.sizeBytes = calculateStorageSize(siteData);
                
                // Save to local storage
                const result = await saveSiteToLocal(digest, siteData);
                if (result.success) {
                    stats.sites.push(digest);
                    stats.siteCount++;
                    stats.totalSizeBytes += siteData.sizeBytes;
                    migratedSites++;
                }
            }
        }
        
        // Update global stats
        await updateGlobalStats(stats);
        
        // Clean up sync storage (remove migrated data)
        if (migratedSites > 0) {
            const keysToRemove = [];
            for (const key in syncData) {
                if (key.startsWith('saved-') || key.startsWith('site-info-') || key === 'readify-all-sites') {
                    keysToRemove.push(key);
                }
            }
            
            if (keysToRemove.length > 0) {
                await new Promise((resolve) => {
                    chrome.storage.sync.remove(keysToRemove, resolve);
                });
            }
        }
        
        console.log(`Migration completed: ${migratedSites} sites migrated`);
        return { success: true, migratedSites };
        
    } catch (e) {
        console.error('Migration failed:', e);
        return { error: e.message };
    }
}

// Check if migration is needed
async function needsMigration() {
    try {
        // Check if there's any data in sync storage to migrate
        const syncData = await new Promise((resolve) => {
            chrome.storage.sync.get(null, (data) => {
                resolve(chrome.runtime.lastError ? {} : data);
            });
        });
        
        // Look for old saved sites
        for (const key in syncData) {
            if (key.startsWith('saved-') && syncData[key]?.length > 0) {
                return true;
            }
        }
        
        return false;
    } catch (e) {
        console.error('Failed to check migration needs:', e);
        return false;
    }
}

// Auto-migrate on first load if needed
async function autoMigrateIfNeeded() {
    const shouldMigrate = await needsMigration();
    if (shouldMigrate) {
        console.log('Auto-migration detected, starting migration...');
        await migrateFromSyncToLocal();
    }
}

// ============================================
// MAIN STORAGE FUNCTIONS
// ============================================

async function saveChangeToDisk(type, data, isDelete = false, markData = null) {
    const urlDigest = await getURLDigest();
    
    // Check if premium user
    const isPremium = window.ReadifySubscription ? await window.ReadifySubscription.isPremium() : false;
    
    if (isPremium) {
        // Use Supabase for premium users
        return await saveChangeToSupabase(urlDigest, type, data, isDelete, markData);
    } else {
        // Use local storage for free users
        return await saveChangeToLocal(urlDigest, type, data, isDelete, markData);
    }
}

// Save change to local storage (free users)
// Now supports new mark-based system with segments
async function saveChangeToLocal(urlDigest, type, data, isDelete = false, markData = null) {
    try {
        // Load existing site data
        let siteData = await loadSiteFromLocal(urlDigest);
        const isNewSite = !siteData;
        
        if (!siteData) {
            siteData = {
                info: {
                    url: window.location.href,
                    title: document.title || window.location.hostname,
                    hostname: window.location.hostname,
                    lastModified: Date.now()
                },
                changes: [],
                notes: {},
                sizeBytes: 0
            };
        }
        
        const originalChangeCount = siteData.changes.length;
        
        // Handle different change types
        if (isDelete) {
            if (type === 'note') {
                // Remove note by markId
                delete siteData.notes[data];
            } else if (type === 'clearHighlight') {
                // Remove highlights by highlightId array
                const idsToRemove = Array.isArray(data) ? data : [data];
                siteData.changes = siteData.changes.filter(change => 
                    !idsToRemove.includes(change.highlightId)
                );
            } else if (type === 'clearUnderline') {
                // Remove underlines by highlightId array
                const idsToRemove = Array.isArray(data) ? data : [data];
                siteData.changes = siteData.changes.filter(change => 
                    !idsToRemove.includes(change.highlightId)
                );
            } else {
                // Remove by markId
                siteData.changes = siteData.changes.filter(change => change.markId !== data);
            }
        } else if (type === "note") {
            // Add or update note (markId -> noteText)
            if (markData && markData.markId) {
                siteData.notes[markData.markId] = data;
            } else {
                siteData.notes[data] = data;
            }
        } else if (markData) {
            // New mark-based system - store full mark data
            siteData.changes.push({
                type,
                data, // color for highlights, null for underlines
                markId: markData.markId,
                highlightId: markData.highlightId,
                text: markData.text,
                segments: markData.segments,
                noteText: markData.noteText || null,
                createdAt: Date.now()
            });
        } else {
            // Legacy fallback - should not be reached with new system
            console.warn('saveChangeToLocal called without markData');
        }
        
        // Update last modified
        siteData.info.lastModified = Date.now();
        
        // Calculate estimated size
        const estimatedSize = calculateStorageSize(siteData);
        
        // Check limits for new sites or if adding changes
        if (!isDelete && (isNewSite || siteData.changes.length > originalChangeCount || Object.keys(siteData.notes).length > 0)) {
            const limitCheck = await canAddChange(urlDigest, estimatedSize);
            if (!limitCheck.canAdd) {
                showUpgradePrompt(limitCheck.reason);
                return;
            }
        }
        
        // Save the site data
        const result = await saveSiteToLocal(urlDigest, siteData);
        
        if (result.error) {
            console.error('Failed to save changes:', result.error);
            return;
        }
        
        // Update global stats
        await updateGlobalStatsAfterSave(urlDigest, siteData, isNewSite, originalChangeCount);
        
        // Handle MySites updates
        if (siteData.changes.length === 0 && Object.keys(siteData.notes).length === 0 && originalChangeCount > 0) {
            // All changes removed - delete the site
            await deleteSiteFromLocal(urlDigest);
            await updateGlobalStatsAfterDelete(urlDigest);
            notifyMySitesUpdate('removed');
        } else if (siteData.changes.length > 0 || Object.keys(siteData.notes).length > 0) {
            notifyMySitesUpdate(originalChangeCount === 0 ? 'added' : 'updated');
        }
        
    } catch (e) {
        console.error('Error saving change to local storage:', e);
    }
}

// Save change to Supabase (premium users)
async function saveChangeToSupabase(urlDigest, type, data, isDelete = false, markData = null) {
    try {
        // Load existing site data
        let siteData = await loadFromSupabase(urlDigest);
        const originalChangeCount = siteData?.changes?.length || 0;
        
        if (!siteData) {
            siteData = {
                info: {
                    url: window.location.href,
                    title: document.title || window.location.hostname,
                    hostname: window.location.hostname,
                    lastModified: Date.now()
                },
                changes: [],
                notes: {}
            };
        }
        
        // Handle different change types
        if (isDelete) {
            if (type === 'note') {
                delete siteData.notes[data];
            } else if (type === 'clearHighlight' || type === 'clearUnderline') {
                const idsToRemove = Array.isArray(data) ? data : [data];
                siteData.changes = siteData.changes.filter(change => 
                    !idsToRemove.includes(change.highlightId)
                );
            } else {
                siteData.changes = siteData.changes.filter(change => change.markId !== data);
            }
        } else if (type === "note") {
            if (markData && markData.markId) {
                siteData.notes[markData.markId] = data;
            } else {
                siteData.notes[data] = data;
            }
        } else if (markData) {
            // New mark-based system
            siteData.changes.push({
                type,
                data,
                markId: markData.markId,
                highlightId: markData.highlightId,
                text: markData.text,
                segments: markData.segments,
                noteText: markData.noteText || null,
                createdAt: Date.now()
            });
        }
        
        // Update last modified
        siteData.info.lastModified = Date.now();
        
        // Save to Supabase
        const result = await saveToSupabase(urlDigest, siteData.changes, siteData.info, siteData.notes);
        
        if (result.error) {
            console.error('Failed to save changes to Supabase:', result.error);
            return;
        }
        
        // Handle MySites updates
        if (siteData.changes.length === 0 && Object.keys(siteData.notes).length === 0 && originalChangeCount > 0) {
            await deleteFromSupabase(urlDigest);
            notifyMySitesUpdate('removed');
        } else if (siteData.changes.length > 0 || Object.keys(siteData.notes).length > 0) {
            notifyMySitesUpdate(originalChangeCount === 0 ? 'added' : 'updated');
        }
        
    } catch (e) {
        console.error('Error saving change to Supabase:', e);
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

async function restoreChangesFromDisk(i = 0) {
    try {
        const urlDigest = await getURLDigest();
        let siteData = null;
        
        // Wait a bit for services to initialize on first attempt
        if (i === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            // Auto-migrate if needed
            await autoMigrateIfNeeded();
        }
        
        // Check if user is premium and should load from Supabase
        if (window.ReadifySubscription && window.ReadifyAuth?.isAuthenticated()) {
            try {
                const isPremium = await window.ReadifySubscription.isPremium();
                if (isPremium) {
                    siteData = await loadFromSupabase(urlDigest);
                    if (siteData) {
                        console.log('Restored changes from Supabase');
                    }
                }
            } catch (e) {
                console.log('Could not load from Supabase, trying local storage:', e.message);
            }
        }
        
        // Fallback to local storage if not loaded from Supabase
        if (!siteData) {
            siteData = await loadSiteFromLocal(urlDigest);
            if (siteData) {
                console.log('Restored changes from local storage');
            }
        }

        if (siteData && siteData.changes && siteData.changes.length > 0) {
            for (const changeData of siteData.changes) {
                try {
                    // Check if this is new format (has text) or legacy format (has range)
                    if (changeData.text) {
                        // New mark-based format - use text-anchored restoration
                        restoreHighlight(changeData);
                    } else if (changeData.range) {
                        // Legacy format - use DOM path restoration
                        restoreLegacyChange(changeData);
                    }
                } catch (e) {
                    console.warn('Failed to restore change:', e.message, changeData);
                }
            }
        }
        
        // Restore notes - attach click handlers to restored marks
        if (siteData && siteData.notes) {
            for (const [markId, noteText] of Object.entries(siteData.notes)) {
                const marks = document.querySelectorAll(`readify-mark[data-mark-id="${markId}"]`);
                marks.forEach(mark => {
                    mark.classList.add('readify-with-notes');
                    mark.addEventListener('click', () => showNoteForMark(markId));
                });
            }
        }
        
        if (!siteData || (!siteData.changes?.length && !Object.keys(siteData.notes || {}).length)) {
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

// Legacy restoration for old format data
function restoreLegacyChange(changeData) {
    const { type, range, data } = changeData;
    
    try {
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
        }
        
        selection.removeAllRanges();
    } catch (e) {
        console.warn('Legacy restore failed:', e.message);
    }
}

async function deleteChangesFromDisk() {
    const urlDigest = await getURLDigest();
    
    // Check if premium user
    const isPremium = window.ReadifySubscription ? await window.ReadifySubscription.isPremium() : false;
    
    if (isPremium) {
        await deleteFromSupabase(urlDigest);
    } else {
        await deleteSiteFromLocal(urlDigest);
        await updateGlobalStatsAfterDelete(urlDigest);
    }
    
    notifyMySitesUpdate('removed');
    window.location.reload();
}

async function getAllSavedSites() {
    // Check if premium user
    const isPremium = window.ReadifySubscription ? await window.ReadifySubscription.isPremium() : false;
    
    if (isPremium) {
        // Get sites from Supabase
        const client = window.ReadifySupabase?.getClient();
        const user = window.ReadifyAuth?.getCurrentUser();
        
        if (!client || !user) {
            return [];
        }
        
        try {
            const { data, error } = await client
                .from('user_sites')
                .select('*')
                .eq('user_id', user.id)
                .order('last_modified', { ascending: false });
            
            if (error) {
                console.error('Get all sites from Supabase error:', error);
                return [];
            }
            
            return (data || []).map(site => ({
                digest: site.url_digest,
                info: {
                    url: site.url,
                    title: site.title,
                    hostname: site.hostname,
                    lastModified: new Date(site.last_modified).getTime()
                },
                changeCount: (site.changes?.length || 0) + (Object.keys(site.notes || {}).length),
                changes: site.changes || [],
                notes: site.notes || {}
            }));
        } catch (e) {
            console.error('Get all sites from Supabase exception:', e);
            return [];
        }
    } else {
        // Get sites from local storage
        return await getAllSitesFromLocal();
    }
}

async function deleteSiteData(digest) {
    // Check if premium user
    const isPremium = window.ReadifySubscription ? await window.ReadifySubscription.isPremium() : false;
    
    if (isPremium) {
        await deleteFromSupabase(digest);
    } else {
        await deleteSiteFromLocal(digest);
        await updateGlobalStatsAfterDelete(digest);
    }
}

// Show upgrade prompt for premium features
function showUpgradePrompt(feature) {
    const messages = {
        'website_limit': 'You\'ve reached the free limit of 5 websites. Upgrade to Premium for unlimited sites!',
        'storage_limit': 'You\'ve reached the 10MB storage limit. Upgrade to Premium for unlimited storage!',
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

// Note management functions - now uses readify-mark elements
function attachNoteEvents() {
    // Attach to new readify-mark elements with notes
    document.querySelectorAll('readify-mark.readify-with-notes').forEach((mark) => {
        const markId = mark.getAttribute('data-mark-id');
        if (markId) {
            mark.addEventListener('click', () => showNoteForMark(markId));
        }
    });
    
    // Legacy support for old anchor-based notes
    document.querySelectorAll("a.note-anchor").forEach((anchor) => {
        attachNoteClickHandler(anchor);
    });
}

function attachNoteClickHandler(anchor, noteText = null) {
    anchor.onclick = function (e) {
        e.preventDefault();
        if (!noteText) {
            getURLDigest().then(async (urlDigest) => {
                const isPremium = window.ReadifySubscription ? await window.ReadifySubscription.isPremium() : false;
                const siteData = isPremium ? await loadFromSupabase(urlDigest) : await loadSiteFromLocal(urlDigest);
                const savedNote = siteData?.notes?.[anchor.textContent] || '';
                showNoteInput(savedNote, anchor);
            });
        } else {
            showNoteInput(noteText, anchor);
        }
    };
}

// Legacy function - kept for backwards compatibility
function createNoteAnchor(noteText) {
    console.warn('createNoteAnchor is deprecated - use highlightSelectedText with noteText instead');
    // Create a highlight with note using new system
    const markData = highlightSelectedText('#fdffb4', noteText);
    if (markData) {
        saveChangeToDisk("highlight", '#fdffb4', false, markData);
        saveChangeToDisk("note", noteText, false, { markId: markData.markId });
    }
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

// Legacy compatibility functions (keeping existing API)
async function checkWebsiteLimit() {
    const limitCheck = await canAddChange(await getURLDigest());
    return limitCheck.canAdd;
}

async function isStudyModeAllowed() {
    return await checkWebsiteLimit();
}

// Global exports for sidepanel access
if (typeof window !== 'undefined') {
    // Export main functions globally for sidepanel.js
    window.getAllSavedSites = getAllSavedSites;
    window.deleteSiteData = deleteSiteData;
    window.getWebsiteLimitInfo = getWebsiteLimitInfo;
    window.getSiteCount = getSiteCount;
}