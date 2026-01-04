// Readify Extension - Sidepanel Website Limits
// Handles website limit calculations and display

async function getWebsiteLimit() {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - session only mode
        return { used: 0, max: 0, isPremium: false, isSessionOnly: true };
    }
    
    // All logged-in users get count from Supabase
    const siteCount = await getSiteCountFromSupabaseSidepanel();
    
    // Check if premium
    if (window.ReadifySubscription) {
        try {
            const subscription = await window.ReadifySubscription.getStatus();
            if (subscription.isPremium) {
                return { used: siteCount, max: Infinity, isPremium: true };
            }
        } catch (e) {
            console.log('Subscription check failed:', e.message);
        }
    }
    
    // Free logged-in users
    return { used: siteCount, max: 5, isPremium: false };
}

async function getSiteCountFromSupabaseSidepanel() {
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
            console.error('Error getting site count from Supabase:', error);
            return 0;
        }
        return count || 0;
    } catch (e) {
        console.error('Exception getting site count from Supabase:', e);
        return 0;
    }
}

async function updateLimitDisplay() {
    try {
        const limit = await getWebsiteLimit();
        const limitCounter = document.getElementById('limitCounter');
        
        console.log('Limit display:', limit);
        
        if (limitCounter) {
            if (limit.isSessionOnly) {
                // Not logged in - session only mode
                limitCounter.textContent = '(Sign in to save)';
                limitCounter.classList.remove('limit-reached', 'premium-unlimited');
                limitCounter.classList.add('session-only');
            } else if (limit.isPremium) {
                // Premium users - show site count without limit
                limitCounter.textContent = limit.used > 0 ? `(${limit.used} sites)` : '';
                limitCounter.classList.remove('limit-reached', 'session-only');
                limitCounter.classList.add('premium-unlimited');
            } else {
                // Free logged-in users - show used/max format
                limitCounter.textContent = `(${limit.used}/${limit.max})`;
                limitCounter.classList.remove('premium-unlimited', 'session-only');
                if (limit.used >= limit.max) {
                    limitCounter.classList.add('limit-reached');
                } else {
                    limitCounter.classList.remove('limit-reached');
                }
            }
        }
    } catch (error) {
        console.error('Error updating limit display:', error);
    }
}

async function checkStudyModeAllowed() {
    const limit = await getWebsiteLimit();
    
    // Session-only users (not logged in) can always use study mode
    // Their changes just won't persist
    if (limit.isSessionOnly) {
        return true;
    }
    
    // Premium users have no limits
    if (limit.isPremium || limit.max === Infinity) {
        return true;
    }
    
    // Free logged-in users - check if under limit
    return limit.used < limit.max;
}

