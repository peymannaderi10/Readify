// Readify Extension - Storage Migration Functions
// Functions for migrating data between storage formats

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

