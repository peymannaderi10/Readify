// Readify Extension - Storage Service
// Abstracts storage operations between Chrome storage (free) and Supabase (premium)

// Storage mode constants
const STORAGE_MODE = {
    LOCAL: 'local',     // Chrome storage (free users)
    CLOUD: 'cloud'      // Supabase (premium users)
};

// Current storage mode
let currentStorageMode = STORAGE_MODE.LOCAL;
let storageInitialized = false;

// Check if extension context is still valid
function isContextValid() {
    try {
        return !!chrome.runtime?.id;
    } catch (e) {
        return false;
    }
}

// Initialize storage service
async function initStorageService() {
    if (storageInitialized) return;
    
    // Check if context is valid
    if (!isContextValid()) {
        console.log('Storage service: Extension context invalidated, skipping init');
        return;
    }
    
    // Determine storage mode based on auth and subscription status
    await updateStorageMode();
    
    // Listen for auth changes to update storage mode
    window.ReadifyAuth?.onAuthChange(async (authState) => {
        if (!isContextValid()) return;
        await updateStorageMode();
    });
    
    // Listen for subscription updates (wrapped safely)
    try {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!isContextValid()) return false;
            
            if (message.type === 'subscriptionUpdated') {
                updateStorageMode();
            }
            return false;
        });
    } catch (e) {
        console.log('Storage service: Could not set up message listener');
    }
    
    storageInitialized = true;
    console.log('Storage service initialized, mode:', currentStorageMode);
}

// Update storage mode based on auth and subscription
async function updateStorageMode() {
    const isAuth = window.ReadifyAuth?.isAuthenticated();
    
    if (!isAuth) {
        currentStorageMode = STORAGE_MODE.LOCAL;
        return;
    }
    
    const isPremium = await window.ReadifySubscription?.isPremium();
    currentStorageMode = isPremium ? STORAGE_MODE.CLOUD : STORAGE_MODE.LOCAL;
    
    console.log('Storage mode updated:', currentStorageMode);
}

// Get current storage mode
function getStorageMode() {
    return currentStorageMode;
}

// Check if using cloud storage
function isCloudStorage() {
    return currentStorageMode === STORAGE_MODE.CLOUD;
}

// ============================================
// SITE DATA OPERATIONS
// ============================================

// Save site changes
async function saveSiteChanges(urlDigest, changes, siteInfo) {
    if (currentStorageMode === STORAGE_MODE.CLOUD) {
        return await saveToSupabase(urlDigest, changes, siteInfo);
    } else {
        return await saveToChrome(urlDigest, changes, siteInfo);
    }
}

// Load site changes
async function loadSiteChanges(urlDigest) {
    if (currentStorageMode === STORAGE_MODE.CLOUD) {
        return await loadFromSupabase(urlDigest);
    } else {
        return await loadFromChrome(urlDigest);
    }
}

// Delete site changes
async function deleteSiteChanges(urlDigest) {
    if (currentStorageMode === STORAGE_MODE.CLOUD) {
        return await deleteFromSupabase(urlDigest);
    } else {
        return await deleteFromChrome(urlDigest);
    }
}

// Get all saved sites
async function getAllSites() {
    if (currentStorageMode === STORAGE_MODE.CLOUD) {
        return await getAllSitesFromSupabase();
    } else {
        return await getAllSitesFromChrome();
    }
}

// Get site count
async function getSiteCount() {
    if (currentStorageMode === STORAGE_MODE.CLOUD) {
        return await getSiteCountFromSupabase();
    } else {
        return await getSiteCountFromChrome();
    }
}

// ============================================
// CHROME STORAGE OPERATIONS
// ============================================

async function saveToChrome(urlDigest, changes, siteInfo) {
    if (!isContextValid()) {
        return { error: { message: 'Extension context invalidated' } };
    }
    
    const key = `saved-${urlDigest}`;
    const siteInfoKey = `site-info-${urlDigest}`;
    
    return new Promise((resolve, reject) => {
        try {
            const data = { [key]: changes };
            if (siteInfo) {
                data[siteInfoKey] = siteInfo;
            }
            
            chrome.storage.sync.set(data, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve({ success: true });
                }
            });
        } catch (e) {
            resolve({ error: { message: e.message } });
        }
    });
}

async function loadFromChrome(urlDigest) {
    if (!isContextValid()) {
        return [];
    }
    
    const key = `saved-${urlDigest}`;
    
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get(key, (result) => {
                if (chrome.runtime.lastError) {
                    resolve([]);
                    return;
                }
                resolve(result[key] || []);
            });
        } catch (e) {
            resolve([]);
        }
    });
}

async function deleteFromChrome(urlDigest) {
    if (!isContextValid()) {
        return { error: { message: 'Extension context invalidated' } };
    }
    
    const key = `saved-${urlDigest}`;
    const siteInfoKey = `site-info-${urlDigest}`;
    
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.remove([key, siteInfoKey], () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve({ success: true });
                }
            });
        } catch (e) {
            resolve({ error: { message: e.message } });
        }
    });
}

async function getAllSitesFromChrome() {
    if (!isContextValid()) {
        return [];
    }
    
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get(null, (allData) => {
                if (chrome.runtime.lastError) {
                    resolve([]);
                    return;
                }
                
                const sites = [];
                const siteInfoKeys = Object.keys(allData).filter(key => key.startsWith('site-info-'));
                
                for (const siteInfoKey of siteInfoKeys) {
                    const digest = siteInfoKey.replace('site-info-', '');
                    const savedKey = `saved-${digest}`;
                    
                    if (allData[savedKey] && allData[savedKey].length > 0) {
                        sites.push({
                            digest: digest,
                            info: allData[siteInfoKey],
                            changeCount: allData[savedKey].length,
                            changes: allData[savedKey]
                        });
                    }
                }
                
                // Sort by last modified
                sites.sort((a, b) => (b.info?.lastModified || 0) - (a.info?.lastModified || 0));
                resolve(sites);
            });
        } catch (e) {
            resolve([]);
        }
    });
}

async function getSiteCountFromChrome() {
    const sites = await getAllSitesFromChrome();
    return sites.length;
}

// ============================================
// SUPABASE STORAGE OPERATIONS
// ============================================

async function saveToSupabase(urlDigest, changes, siteInfo) {
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

async function loadFromSupabase(urlDigest) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        console.log('loadFromSupabase: No client or user, returning empty');
        return [];
    }
    
    try {
        const { data, error } = await client
            .from('user_sites')
            .select('changes')
            .eq('user_id', user.id)
            .eq('url_digest', urlDigest)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Load from Supabase error:', error);
            return [];
        }
        
        if (!data?.changes) {
            return [];
        }
        
        // Handle both JSON string and array formats
        let changes = data.changes;
        if (typeof changes === 'string') {
            try {
                changes = JSON.parse(changes);
            } catch (e) {
                console.error('Failed to parse changes JSON:', e);
                return [];
            }
        }
        
        console.log('loadFromSupabase: Loaded', changes.length, 'changes for', urlDigest);
        return changes;
    } catch (e) {
        console.error('Load from Supabase exception:', e);
        return [];
    }
}

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
        
        return { success: true, error: null };
    } catch (e) {
        console.error('Delete from Supabase exception:', e);
        return { error: { message: e.message } };
    }
}

async function getAllSitesFromSupabase() {
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
            changeCount: site.changes?.length || 0,
            changes: site.changes
        }));
    } catch (e) {
        console.error('Get all sites from Supabase exception:', e);
        return [];
    }
}

async function getSiteCountFromSupabase() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return 0;
    }
    
    try {
        const { count, error } = await client
            .from('user_sites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Get site count from Supabase error:', error);
            return 0;
        }
        
        return count || 0;
    } catch (e) {
        console.error('Get site count from Supabase exception:', e);
        return 0;
    }
}

// ============================================
// DATA MIGRATION
// ============================================

// Migrate data from Chrome storage to Supabase
async function migrateToCloud() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { error: { message: 'Not authenticated' } };
    }
    
    try {
        // Get all sites from Chrome storage
        const chromeSites = await getAllSitesFromChrome();
        
        if (chromeSites.length === 0) {
            return { migrated: 0, error: null };
        }
        
        let migrated = 0;
        const errors = [];
        
        for (const site of chromeSites) {
            const result = await saveToSupabase(site.digest, site.changes, site.info);
            
            if (result.error) {
                errors.push({ digest: site.digest, error: result.error });
            } else {
                migrated++;
            }
        }
        
        if (errors.length > 0) {
            console.warn('Some sites failed to migrate:', errors);
        }
        
        // Clear Chrome storage after successful migration
        if (migrated > 0 && errors.length === 0) {
            await clearChromeStorage();
        }
        
        return {
            migrated,
            total: chromeSites.length,
            errors: errors.length > 0 ? errors : null,
            error: null
        };
    } catch (e) {
        console.error('Migration exception:', e);
        return { error: { message: e.message } };
    }
}

// Clear all Readify data from Chrome storage
async function clearChromeStorage() {
    if (!isContextValid()) {
        return;
    }
    
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get(null, (allData) => {
                if (chrome.runtime.lastError) {
                    resolve();
                    return;
                }
                
                const keysToRemove = Object.keys(allData).filter(key => 
                    key.startsWith('saved-') || 
                    key.startsWith('site-info-') || 
                    key === 'readify-all-sites' ||
                    key === 'websiteLimit'
                );
                
                if (keysToRemove.length > 0) {
                    chrome.storage.sync.remove(keysToRemove, resolve);
                } else {
                    resolve();
                }
            });
        } catch (e) {
            resolve();
        }
    });
}

// Check if migration is needed
async function needsMigration() {
    if (!window.ReadifyAuth?.isAuthenticated()) {
        return false;
    }
    
    const isPremium = await window.ReadifySubscription?.isPremium();
    if (!isPremium) {
        return false;
    }
    
    // Check if there's data in Chrome storage
    const chromeSites = await getAllSitesFromChrome();
    return chromeSites.length > 0;
}

// Export storage functions
if (typeof window !== 'undefined') {
    window.ReadifyStorage = {
        init: initStorageService,
        getMode: getStorageMode,
        isCloud: isCloudStorage,
        saveSiteChanges,
        loadSiteChanges,
        deleteSiteChanges,
        getAllSites,
        getSiteCount,
        migrateToCloud,
        needsMigration,
        clearChromeStorage,
        // Direct access to specific storage
        chrome: {
            save: saveToChrome,
            load: loadFromChrome,
            delete: deleteFromChrome,
            getAll: getAllSitesFromChrome,
            getCount: getSiteCountFromChrome
        },
        supabase: {
            save: saveToSupabase,
            load: loadFromSupabase,
            delete: deleteFromSupabase,
            getAll: getAllSitesFromSupabase,
            getCount: getSiteCountFromSupabase
        }
    };
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initStorageService, 300);
        });
    } else {
        setTimeout(initStorageService, 300);
    }
}

