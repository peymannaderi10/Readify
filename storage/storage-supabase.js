// Readify Extension - Supabase Storage Operations
// Functions for interacting with Readify API backend

// Save to Readify API (server-side limit enforcement)
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
        
        // Use Readify API for server-side limit enforcement
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.SAVE_SITE);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
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
            console.error('Save to API error:', result);
            return { error: result };
        }
        
        return { data: result.data, error: null, siteCount: result.site_count };
    } catch (e) {
        console.error('Save to API exception:', e);
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

// Load from Supabase for all logged-in users
async function loadFromSupabase(urlDigest) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return null;
    }
    
    try {
        // Use maybeSingle() instead of single() to gracefully handle no rows
        const { data, error } = await client
            .from('user_sites')
            .select('*')
            .eq('user_id', user.id)
            .eq('url_digest', urlDigest)
            .maybeSingle();
        
        if (error) {
            // Only log actual errors, not "no rows" which is expected after deletion
            console.error('Load from Supabase error:', error);
            return null;
        }
        
        if (!data) {
            // No data found - this is normal for new pages or after deletion
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

// Delete from Supabase/API
async function deleteFromSupabase(urlDigest) {
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
        
        // Use Readify API
        const apiUrl = window.READIFY_CONFIG.getApiUrl(
            window.READIFY_CONFIG.ENDPOINTS.DELETE_SITE + '/' + encodeURIComponent(urlDigest)
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
            return { error: result };
        }
        
        return { success: true };
    } catch (e) {
        console.error('Delete from API exception:', e);
        return { error: { message: e.message } };
    }
}

// Get all saved sites from API
async function getAllSavedSites() {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - no saved sites
        return [];
    }
    
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return [];
    }
    
    try {
        // Get the current session for auth token
        const { data: { session } } = await client.auth.getSession();
        if (!session?.access_token) {
            return [];
        }
        
        // Use Readify API
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.LIST_SITES);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        
        if (!response.ok) {
            console.error('Get all sites error:', await response.text());
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
            changeCount: (site.changes?.length || 0) + (Object.keys(site.notes || {}).length),
            changes: site.changes || [],
            notes: site.notes || {}
        }));
    } catch (e) {
        console.error('Get all sites from API exception:', e);
        return [];
    }
}

// Delete site data
async function deleteSiteData(digest) {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (isAuthenticated) {
        await deleteFromSupabase(digest);
    }
    // For non-logged-in users, nothing to delete (session-only)
}
