// Readify Extension - Storage Limit Checking
// Functions for checking storage and website limits

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

// Legacy compatibility functions
async function checkWebsiteLimit() {
    const limitCheck = await canAddChange(await getURLDigest());
    return limitCheck.canAdd;
}

async function isStudyModeAllowed() {
    return await checkWebsiteLimit();
}

