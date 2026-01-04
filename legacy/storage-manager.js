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

// ============================================
// LIMIT CHECKING FUNCTIONS
// ============================================

// Check if user can add a new change
// Note: For logged-in users, the actual limit enforcement happens server-side in the edge function
// This is kept for client-side pre-checks and session-only users
async function canAddChange(urlDigest, estimatedChangeSize = 0) {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - session only mode, always allow (changes won't persist anyway)
        return { canAdd: true, sessionOnly: true };
    }
    
    // Premium users have no limits
    if (window.ReadifySubscription) {
        const isPremium = await window.ReadifySubscription.isPremium();
        if (isPremium) {
            return { canAdd: true };
        }
    }
    
    // Free logged-in users - server will enforce limits, but we can do a quick pre-check
    // The actual enforcement happens in the save-site edge function
    return { canAdd: true };
}

// Get website limit info for display
async function getWebsiteLimitInfo() {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - session only mode
        return {
            used: 0,
            max: 0,
            isPremium: false,
            isSessionOnly: true,
            display: 'Session only (sign in to save)'
        };
    }
    
    // Check if premium
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
    
    // Free logged-in user - get count from Supabase (server-side enforced)
    const count = await getSiteCount();
    return {
        used: count,
        max: DEFAULT_WEBSITE_LIMIT,
        isPremium: false,
        display: `${count}/${DEFAULT_WEBSITE_LIMIT} sites`
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
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - no saved sites
        return 0;
    }
    
    // For all logged-in users, get count from Supabase
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
    
    return 0;
}

// ============================================
// SUPABASE OPERATIONS (for all logged-in users)
// ============================================

// Save to Supabase via Edge Function (server-side limit enforcement)
async function saveToSupabase(urlDigest, changes, siteInfo, notes = {}) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { error: { message: 'Not authenticated' } };
    }
    
    try {
        // Get the current session for auth token
        const { data: { session } } = await client.auth.getSession();
        if (!session?.access_token) {
            return { error: { message: 'No valid session' } };
        }
        
        // Use Edge Function for server-side limit enforcement
        const supabaseUrl = window.READIFY_CONFIG?.SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/save-site`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': window.READIFY_CONFIG?.SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                url_digest: urlDigest,
                url: siteInfo?.url || '',
                title: siteInfo?.title || '',
                hostname: siteInfo?.hostname || '',
                changes: changes,
                notes: notes
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Handle limit reached error
            if (result.code === 'LIMIT_REACHED') {
                showUpgradePrompt('website_limit');
                return { error: result, limitReached: true };
            }
            console.error('Save to Supabase error:', result);
            return { error: result };
        }
        
        return { data: result.data, error: null, siteCount: result.site_count };
    } catch (e) {
        console.error('Save to Supabase exception:', e);
        return { error: { message: e.message } };
    }
}

// Direct Supabase upsert (fallback, no limit checking - use with caution)
async function saveToSupabaseDirect(urlDigest, changes, siteInfo, notes = {}) {
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
    
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    const supabaseAuth = window.ReadifySupabase?.isAuthenticated() || false;
    
    console.log('Readify saveChangeToDisk:', { 
        type, 
        isDelete, 
        isAuthenticated, 
        supabaseAuth,
        hasReadifyAuth: !!window.ReadifyAuth,
        hasReadifySupabase: !!window.ReadifySupabase,
        currentUser: window.ReadifySupabase?.getCurrentUser()?.email
    });
    
    if (!isAuthenticated) {
        // Not logged in - session only, no persistence
        // The visual changes work but won't survive refresh
        console.log('Readify: Changes are session-only (sign in to save permanently)');
        showSessionOnlyNotice();
        return { sessionOnly: true };
    }
    
    // User is logged in - always use Supabase with server-side limit enforcement
    console.log('Readify: Saving to Supabase...');
    return await saveChangeToSupabase(urlDigest, type, data, isDelete, markData);
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

// Save change to Supabase (all logged-in users - free and premium)
// Uses edge function for server-side limit enforcement
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
        // Wait a bit for services to initialize on first attempt
        if (i === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check if user is logged in - only logged-in users have persistent storage
        const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
        
        if (!isAuthenticated) {
            // Not logged in - session only mode, nothing to restore
            console.log('Readify: Session-only mode (sign in to restore saved highlights)');
            
            // Run migration for legacy local data one last time to help with transition
            if (i === 0) {
                await autoMigrateIfNeeded();
            }
            return;
        }
        
        const urlDigest = await getURLDigest();
        let siteData = null;
        
        // User is logged in - load from Supabase (works for both free and premium)
        try {
            siteData = await loadFromSupabase(urlDigest);
            if (siteData) {
                console.log('Restored changes from Supabase');
            }
        } catch (e) {
            console.log('Could not load from Supabase:', e.message);
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
        
        // Restore notes - add visual styling and data attributes
        if (siteData && siteData.notes) {
            for (const [markId, noteText] of Object.entries(siteData.notes)) {
                const marks = document.querySelectorAll(`readify-mark[data-mark-id="${markId}"]`);
                marks.forEach(mark => {
                    mark.classList.add('readify-with-notes');
                    mark.setAttribute('data-note-text', noteText);
                    // Add border indicator for notes
                    const color = mark.style.backgroundColor;
                    if (color) {
                        const rgb = hexToRgb(color) || parseRgb(color);
                        if (rgb) {
                            mark.style.borderBottomColor = `rgb(${Math.max(0, rgb.r - 51)}, ${Math.max(0, rgb.g - 51)}, ${Math.max(0, rgb.b - 51)})`;
                        }
                    }
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
    
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (isAuthenticated) {
        // Delete from Supabase for logged-in users
        await deleteFromSupabase(urlDigest);
        notifyMySitesUpdate('removed');
    }
    // For non-logged-in users, just reload (changes were session-only anyway)
    
    window.location.reload();
}

async function getAllSavedSites() {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - no saved sites
        return [];
    }
    
    // Get sites from Supabase for logged-in users (free or premium)
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
}

async function deleteSiteData(digest) {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (isAuthenticated) {
        await deleteFromSupabase(digest);
    }
    // For non-logged-in users, nothing to delete (session-only)
}

// Show session-only notice for non-logged-in users
let sessionNoticeShown = false;
function showSessionOnlyNotice() {
    // Only show once per session
    if (sessionNoticeShown) return;
    sessionNoticeShown = true;
    
    const existingNotice = document.querySelector('#readify-session-notice');
    if (existingNotice) return;
    
    const notice = document.createElement('div');
    notice.id = 'readify-session-notice';
    notice.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        max-width: 320px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideIn 0.3s ease-out;
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    notice.innerHTML = `
        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="font-size: 24px;">💡</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">Session Only Mode</div>
                <div style="font-size: 12px; opacity: 0.85; line-height: 1.4;">
                    Your changes won't be saved after refresh. 
                    Sign in to save your highlights permanently.
                </div>
            </div>
            <button id="readify-dismiss-notice" style="
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.5);
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                line-height: 1;
            ">×</button>
        </div>
    `;
    
    document.body.appendChild(notice);
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (notice.parentNode) {
            notice.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notice.remove(), 300);
        }
    }, 8000);
    
    // Manual dismiss
    document.getElementById('readify-dismiss-notice')?.addEventListener('click', () => {
        notice.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notice.remove(), 300);
    });
    
    // Sign in link
    document.getElementById('readify-signin-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        notice.remove();
        chrome.runtime.sendMessage({ type: 'openSidepanel' }).catch(() => {});
    });
}

// Show upgrade prompt for premium features
function showUpgradePrompt(feature) {
    const featureContent = {
        'website_limit': {
            icon: '📚',
            title: 'Site Limit Reached',
            message: 'You\'ve reached the free limit of 5 websites. Upgrade to Premium for unlimited sites!'
        },
        'storage_limit': {
            icon: '💾',
            title: 'Storage Full',
            message: 'You\'ve reached the 10MB storage limit. Upgrade to Premium for unlimited storage!'
        },
        'tts': {
            icon: '🔊',
            title: 'Premium Feature',
            message: 'Text-to-Speech is a Premium feature. Upgrade to unlock!'
        },
        'default': {
            icon: '✨',
            title: 'Upgrade to Premium',
            message: 'This is a Premium feature. Upgrade to unlock all features!'
        }
    };
    
    const content = featureContent[feature] || featureContent['default'];
    
    // Create overlay
    const existingOverlay = document.querySelector('#readify-upgrade-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'readify-upgrade-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
    `;
    
    // Create prompt modal
    const prompt = document.createElement('div');
    prompt.id = 'readify-upgrade-prompt';
    prompt.style.cssText = `
        position: relative;
        background: #ffffff;
        padding: 32px;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1);
        z-index: 10002;
        max-width: 380px;
        width: 90%;
        text-align: center;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border: 1px solid rgba(0, 151, 255, 0.1);
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Add animation styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;
    document.head.appendChild(styleSheet);
    
    prompt.innerHTML = `
        <button id="readify-close-x" style="
            position: absolute;
            top: 16px;
            right: 16px;
            background: transparent;
            border: none;
            font-size: 20px;
            color: #9ca3af;
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s ease;
            line-height: 1;
        ">×</button>
        
        <div style="
            width: 72px;
            height: 72px;
            margin: 0 auto 20px;
            background: linear-gradient(135deg, rgba(0, 151, 255, 0.1) 0%, rgba(0, 180, 255, 0.1) 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
        ">${content.icon}</div>
        
        <h3 style="
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: 700;
            color: #1a202c;
            line-height: 1.2;
        ">${content.title}</h3>
        
        <p style="
            margin: 0 0 24px 0;
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
            max-width: 300px;
            margin-left: auto;
            margin-right: auto;
        ">${content.message}</p>
        
        <div style="
            display: inline-block;
            padding: 8px 16px;
            background: rgba(0, 151, 255, 0.08);
            border-radius: 20px;
            margin-bottom: 24px;
            border: 1px solid rgba(0, 151, 255, 0.15);
        ">
            <span style="
                font-size: 12px;
                font-weight: 600;
                color: #0097ff;
                letter-spacing: 0.3px;
            ">🔒 Premium Feature</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="readify-upgrade-btn" style="
                width: 100%;
                background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
                color: white;
                border: none;
                padding: 14px 24px;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                font-size: 15px;
                font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">✨ Upgrade Now</button>
            <button id="readify-close-upgrade" style="
                width: 100%;
                background: transparent;
                color: #6b7280;
                border: 2px solid rgba(0, 151, 255, 0.15);
                padding: 12px 24px;
                border-radius: 10px;
                font-weight: 500;
                cursor: pointer;
                font-size: 14px;
                font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">Maybe Later</button>
        </div>
    `;
    
    overlay.appendChild(prompt);
    document.body.appendChild(overlay);
    
    // Add hover effects
    const upgradeBtn = document.getElementById('readify-upgrade-btn');
    const closeBtn = document.getElementById('readify-close-upgrade');
    const closeX = document.getElementById('readify-close-x');
    
    upgradeBtn.addEventListener('mouseenter', function() {
        this.style.background = 'linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)';
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(0, 151, 255, 0.4)';
    });
    upgradeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 12px rgba(0, 151, 255, 0.3)';
    });
    
    closeBtn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(0, 151, 255, 0.05)';
        this.style.borderColor = 'rgba(0, 151, 255, 0.3)';
        this.style.color = '#0097ff';
    });
    closeBtn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.borderColor = 'rgba(0, 151, 255, 0.15)';
        this.style.color = '#6b7280';
    });
    
    closeX.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        this.style.color = '#374151';
    });
    closeX.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.color = '#9ca3af';
    });
    
    // Close modal function
    const closeModal = () => {
        overlay.style.opacity = '0';
        prompt.style.transform = 'translateY(10px) scale(0.95)';
        prompt.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };
    
    // Add event listeners
    upgradeBtn.addEventListener('click', async () => {
        closeModal();
        if (window.ReadifySubscription) {
            await window.ReadifySubscription.createCheckoutSession();
        } else {
            // Fallback: Open sidepanel
            chrome.runtime.sendMessage({ type: 'openSidepanel' });
        }
    });
    
    closeBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
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