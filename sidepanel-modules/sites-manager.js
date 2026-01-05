// Readify Extension - Sidepanel Sites Manager
// Handles the My Sites list display and management

// Local cache of sites to avoid excessive API calls
let sitesCache = null;
let sitesCacheTime = 0;
const SITES_CACHE_DURATION = 30000; // 30 seconds - only refetch if cache is stale

function setupMySitesListener() {
    // Listen for messages from content scripts about site changes
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'mySitesUpdate') {
            handleMySitesUpdate(message);
        }
    });
}

async function handleMySitesUpdate(message) {
    console.log('[Sites] Update received:', message.action, message.url);
    
    // Update local cache instead of re-fetching from API
    if (sitesCache && message.action) {
        updateLocalCache(message);
        displaySites(sitesCache);
        
        // Brief visual feedback
        const sitesList = document.getElementById('sitesList');
        if (sitesList) {
            sitesList.style.opacity = '0.7';
            setTimeout(() => {
                sitesList.style.opacity = '1';
            }, 200);
        }
        
        // Update limit display locally (no API call needed)
        updateLimitDisplayFromCache();
    } else {
        // No cache - need to fetch
        await loadMySites(true); // Force refresh
    }
}

// Update local cache based on message action
function updateLocalCache(message) {
    if (!sitesCache) return;
    
    const { action, url, title, hostname, changeCount } = message;
    
    // Generate a simple digest from URL for matching
    const urlDigest = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    
    if (action === 'added' || action === 'updated') {
        // Find existing site or add new one
        const existingIndex = sitesCache.findIndex(s => s.info.url === url);
        
        const siteData = {
            digest: urlDigest,
            info: {
                url: url,
                title: title || hostname,
                hostname: hostname,
                lastModified: Date.now()
            },
            changeCount: changeCount || 1
        };
        
        if (existingIndex >= 0) {
            // Update existing - increment change count if not provided
            sitesCache[existingIndex].changeCount = changeCount || (sitesCache[existingIndex].changeCount + 1);
            sitesCache[existingIndex].info.lastModified = Date.now();
        } else {
            // Add new site at the beginning
            sitesCache.unshift(siteData);
        }
        
        // Sort by last modified
        sitesCache.sort((a, b) => (b.info.lastModified || 0) - (a.info.lastModified || 0));
        
    } else if (action === 'removed') {
        // Remove site from cache
        sitesCache = sitesCache.filter(s => s.info.url !== url);
    }
    
    console.log('[Sites] Cache updated locally, sites:', sitesCache.length);
}

// Update limit display from local cache (no API call)
function updateLimitDisplayFromCache() {
    const limitCounter = document.getElementById('limitCounter');
    if (!limitCounter || !sitesCache) return;
    
    const count = sitesCache.length;
    
    // Check if premium (use cached subscription status)
    if (window.ReadifySubscription) {
        window.ReadifySubscription.isPremium().then(isPremium => {
            if (isPremium) {
                limitCounter.textContent = count > 0 ? `(${count} sites)` : '';
                limitCounter.classList.remove('limit-reached');
                limitCounter.classList.add('premium-unlimited');
            } else {
                const max = window.READIFY_CONFIG?.FREE_WEBSITE_LIMIT || 5;
                limitCounter.textContent = `(${count}/${max})`;
                if (count >= max) {
                    limitCounter.classList.add('limit-reached');
                } else {
                    limitCounter.classList.remove('limit-reached');
                }
                limitCounter.classList.remove('premium-unlimited');
            }
        });
    }
}

// Load sites - uses cache unless forceRefresh is true
async function loadMySites(forceRefresh = false) {
    try {
        // Use cache if available and not stale
        if (!forceRefresh && sitesCache && (Date.now() - sitesCacheTime < SITES_CACHE_DURATION)) {
            console.log('[Sites] Using cached sites:', sitesCache.length);
            displaySites(sitesCache);
            return;
        }
        
        console.log('[Sites] Fetching from API...');
        const sites = await getAllSavedSitesSidepanel();
        
        // Update cache
        sitesCache = sites;
        sitesCacheTime = Date.now();
        
        console.log('[Sites] Got sites from API:', sites.length);
        displaySites(sites);
    } catch (error) {
        console.error('[Sites] Error loading:', error);
    }
}

// Clear cache (call on sign-out or when needed)
function clearSitesCache() {
    sitesCache = null;
    sitesCacheTime = 0;
    console.log('[Sites] Cache cleared');
}

function displaySites(sites) {
    const sitesList = document.getElementById('sitesList');
    const deleteChangesSection = document.getElementById('deleteChangesSection');
    
    // Remove existing event listener to prevent duplicates
    sitesList.removeEventListener('click', handleSiteClick);
    
    if (sites.length === 0) {
        sitesList.innerHTML = `
            <div class="empty-sites">
                <p>No saved sites yet</p>
                <small>Your highlighted and noted websites will appear here</small>
            </div>
        `;
        // Hide delete changes section when no sites
        if (deleteChangesSection) deleteChangesSection.style.display = 'none';
        return;
    }
    
    // Show delete changes section when there are sites
    if (deleteChangesSection) deleteChangesSection.style.display = 'block';

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

// Helper function to get all saved sites (for sidepanel context)
async function getAllSavedSitesSidepanel() {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - no saved sites (session-only mode)
        console.log('Not logged in - no saved sites');
        return [];
    }
    
    // All logged-in users use the API
    console.log('Loading sites from API');
    return await getAllSitesFromAPI();
}

// Get all sites via Readify API
async function getAllSitesFromAPI() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        console.log('No client or user for API sites');
        return [];
    }
    
    try {
        // Get access token for API auth
        const { data: { session } } = await client.auth.getSession();
        if (!session?.access_token) {
            console.log('No valid session for API');
            return [];
        }
        
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.LIST_SITES);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        
        if (!response.ok) {
            console.error('Get sites from API error:', await response.text());
            return [];
        }
        
        const result = await response.json();
        const sites = result.sites || [];
        
        return sites.map(site => ({
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
        console.error('Get sites from API exception:', e);
        return [];
    }
}

// Helper function to delete site data (for sidepanel context)
async function deleteSiteDataSidepanel(digest) {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - nothing to delete (session-only mode)
        console.log('Not logged in - nothing to delete');
        return;
    }
    
    // All logged-in users delete via API
    await deleteSiteFromAPI(digest);
}

// Delete site via Readify API
async function deleteSiteFromAPI(digest) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        console.error('No client or user for API delete');
        return;
    }
    
    try {
        // Get access token for API auth
        const { data: { session } } = await client.auth.getSession();
        if (!session?.access_token) {
            console.error('No valid session for API delete');
            return;
        }
        
        const apiUrl = window.READIFY_CONFIG.getApiUrl(
            window.READIFY_CONFIG.ENDPOINTS.DELETE_SITE + '/' + encodeURIComponent(digest)
        );
        
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        
        if (!response.ok) {
            const result = await response.json();
            console.error('Delete from API error:', result);
        } else {
            console.log('Site deleted via API');
        }
    } catch (e) {
        console.error('Delete from API exception:', e);
    }
}
