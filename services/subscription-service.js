// Readify Extension - Subscription Service
// Handles subscription status, Stripe checkout, and premium feature management

// Subscription cache
let subscriptionCache = null;
let subscriptionCacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

// Check if extension context is still valid
function isContextValid() {
    try {
        return !!chrome.runtime?.id;
    } catch (e) {
        return false;
    }
}

// Safe chrome.runtime.sendMessage
function safeSendMessage(message) {
    try {
        if (chrome.runtime?.id) {
            return chrome.runtime.sendMessage(message).catch(() => {});
        }
    } catch (e) {
        // Extension context invalidated
    }
    return Promise.resolve();
}

// Safe chrome.runtime.getURL
function safeGetURL(path) {
    try {
        if (chrome.runtime?.id) {
            return chrome.runtime.getURL(path);
        }
    } catch (e) {
        // Extension context invalidated
    }
    return '';
}

// Initialize subscription service
async function initSubscriptionService() {
    // Refresh subscription status on init
    await refreshSubscriptionStatus();
    
    // Listen for auth changes to refresh subscription
    window.ReadifyAuth?.onAuthChange(async (authState) => {
        if (authState.isAuthenticated) {
            await refreshSubscriptionStatus();
        } else {
            subscriptionCache = null;
            subscriptionCacheTime = 0;
        }
    });
    
    console.log('Subscription service initialized');
}

// Get current subscription status
async function getSubscriptionStatus() {
    // Check cache first
    if (subscriptionCache && Date.now() - subscriptionCacheTime < CACHE_DURATION) {
        return subscriptionCache;
    }
    
    // Not authenticated = free tier
    if (!window.ReadifyAuth?.isAuthenticated()) {
        return {
            status: 'free',
            isPremium: false,
            canAccessPremiumFeatures: false,
            websiteLimit: window.READIFY_CONFIG?.FREE_WEBSITE_LIMIT || 5
        };
    }
    
    // Get profile from database
    const profile = await window.ReadifyAuth.getUserProfile();
    
    if (profile.error || !profile.data) {
        return {
            status: 'free',
            isPremium: false,
            canAccessPremiumFeatures: false,
            websiteLimit: window.READIFY_CONFIG?.FREE_WEBSITE_LIMIT || 5
        };
    }
    
    const status = profile.data.subscription_status || 'free';
    // 'canceling' means user cancelled but still has access until period end
    const isPremium = ['active', 'trialing', 'canceling'].includes(status);
    
    subscriptionCache = {
        status: status,
        isPremium: isPremium,
        canAccessPremiumFeatures: isPremium,
        websiteLimit: isPremium ? Infinity : (window.READIFY_CONFIG?.FREE_WEBSITE_LIMIT || 5),
        stripeCustomerId: profile.data.stripe_customer_id,
        stripeSubscriptionId: profile.data.stripe_subscription_id,
        cancelledAt: profile.data.cancelled_at,
        subscriptionEndsAt: profile.data.subscription_ends_at
    };
    subscriptionCacheTime = Date.now();
    
    return subscriptionCache;
}

// Refresh subscription status (bypass cache)
async function refreshSubscriptionStatus() {
    subscriptionCache = null;
    subscriptionCacheTime = 0;
    return await getSubscriptionStatus();
}

// Check if user has premium access
async function isPremium() {
    const subscription = await getSubscriptionStatus();
    return subscription.isPremium;
}

// Check if user can access a premium feature
async function canAccessFeature(featureName) {
    const subscription = await getSubscriptionStatus();
    
    // All users can access basic features
    const basicFeatures = ['highlight', 'underline', 'note'];
    if (basicFeatures.includes(featureName)) {
        return true;
    }
    
    // Premium features require active subscription
    const premiumFeatures = ['tts', 'unlimited_sites', 'cloud_sync'];
    if (premiumFeatures.includes(featureName)) {
        return subscription.canAccessPremiumFeatures;
    }
    
    return true;
}

// Get website limit for current user
async function getWebsiteLimit() {
    const subscription = await getSubscriptionStatus();
    return subscription.websiteLimit;
}

// Create Stripe checkout session via Edge Function
async function createCheckoutSession() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { error: { message: 'Please sign in to upgrade to premium' } };
    }
    
    if (!isContextValid()) {
        return { error: { message: 'Extension context expired. Please refresh the page.' } };
    }
    
    try {
        // Ensure we have a valid session with access token
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        if (sessionError || !sessionData?.session) {
            console.error('No valid session for checkout:', sessionError);
            return { error: { message: 'Please sign in again to continue' } };
        }
        
        const accessToken = sessionData.session.access_token;
        const baseUrl = safeGetURL('sidepanel.html') || 'https://readify.ca';
        
        // Call Supabase Edge Function with explicit authorization header
        const response = await fetch(
            `${window.READIFY_CONFIG.SUPABASE_URL}/functions/v1/create-checkout-session`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': window.READIFY_CONFIG.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    priceId: window.READIFY_CONFIG?.STRIPE_PRICE_ID,
                    successUrl: baseUrl + '?payment=success',
                    cancelUrl: baseUrl + '?payment=canceled'
                })
            }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Checkout session error:', data);
            return { error: { message: data.error || 'Failed to create checkout session' } };
        }
        
        if (data?.url) {
            // Open checkout in new tab
            try {
                chrome.tabs.create({ url: data.url });
            } catch (e) {
                // Fallback to window.open
                window.open(data.url, '_blank');
            }
            return { data, error: null };
        }
        
        return { error: { message: 'Failed to create checkout session' } };
    } catch (e) {
        console.error('Checkout session exception:', e);
        return { error: { message: e.message || 'Failed to create checkout session' } };
    }
}

// Create customer portal session for managing subscription
async function createPortalSession() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { error: { message: 'Please sign in to manage your subscription' } };
    }
    
    if (!isContextValid()) {
        return { error: { message: 'Extension context expired. Please refresh the page.' } };
    }
    
    try {
        // Ensure we have a valid session with access token
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        if (sessionError || !sessionData?.session) {
            console.error('No valid session for portal:', sessionError);
            return { error: { message: 'Please sign in again to continue' } };
        }
        
        const accessToken = sessionData.session.access_token;
        const returnUrl = safeGetURL('sidepanel.html') || 'https://readify.ca';
        
        // Call Supabase Edge Function with explicit authorization header
        const response = await fetch(
            `${window.READIFY_CONFIG.SUPABASE_URL}/functions/v1/create-portal-session`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': window.READIFY_CONFIG.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    returnUrl: returnUrl
                })
            }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Portal session error:', data);
            return { error: { message: data.error || 'Failed to open portal' } };
        }
        
        if (data?.url) {
            // Open portal in new tab
            try {
                chrome.tabs.create({ url: data.url });
            } catch (e) {
                // Fallback to window.open
                window.open(data.url, '_blank');
            }
            return { data, error: null };
        }
        
        return { error: { message: 'Failed to create portal session' } };
    } catch (e) {
        console.error('Portal session exception:', e);
        return { error: { message: e.message || 'Failed to create portal session' } };
    }
}

// Get subscription details
async function getSubscriptionDetails() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { data: null, error: { message: 'Not authenticated' } };
    }
    
    try {
        const { data, error } = await client
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Get subscription error:', error);
            return { data: null, error };
        }
        
        return { data: data || null, error: null };
    } catch (e) {
        console.error('Get subscription exception:', e);
        return { data: null, error: { message: e.message } };
    }
}

// Get payment history
async function getPaymentHistory() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        return { data: null, error: { message: 'Not authenticated' } };
    }
    
    try {
        const { data, error } = await client
            .from('payment_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Get payment history error:', error);
            return { data: null, error };
        }
        
        return { data: data || [], error: null };
    } catch (e) {
        console.error('Get payment history exception:', e);
        return { data: null, error: { message: e.message } };
    }
}

// Handle payment success (called after redirect back from Stripe)
async function handlePaymentSuccess() {
    // Refresh subscription status
    const subscription = await refreshSubscriptionStatus();
    
    // Broadcast subscription update
    safeSendMessage({
        type: 'subscriptionUpdated',
        subscription: subscription
    });
    
    return subscription;
}

// Listen for subscription updates from webhooks
function onSubscriptionUpdate(callback) {
    try {
        if (!isContextValid()) return;
        
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!isContextValid()) return false;
            
            if (message.type === 'subscriptionUpdated') {
                // Clear cache and get fresh status
                refreshSubscriptionStatus().then(subscription => {
                    callback(subscription);
                });
            }
            return false;
        });
    } catch (e) {
        console.log('Could not set up subscription update listener');
    }
}

// Export subscription functions
if (typeof window !== 'undefined') {
    window.ReadifySubscription = {
        init: initSubscriptionService,
        getStatus: getSubscriptionStatus,
        refresh: refreshSubscriptionStatus,
        isPremium,
        canAccessFeature,
        getWebsiteLimit,
        createCheckoutSession,
        createPortalSession,
        getSubscriptionDetails,
        getPaymentHistory,
        handlePaymentSuccess,
        onSubscriptionUpdate
    };
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initSubscriptionService, 200);
        });
    } else {
        setTimeout(initSubscriptionService, 200);
    }
}

