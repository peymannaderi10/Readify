// Readify Extension - Stripe Service
// Handles Stripe checkout and subscription management via Supabase Edge Functions

// Create a checkout session for subscription
async function createStripeCheckout() {
    // Check if user is authenticated
    if (!window.ReadifyAuth?.isAuthenticated()) {
        return { 
            error: { 
                message: 'Please sign in to subscribe to Premium',
                requiresAuth: true 
            } 
        };
    }
    
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Service unavailable' } };
    }
    
    try {
        // Ensure we have a valid session with access token
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        console.log('Session data:', sessionData);
        console.log('Session error:', sessionError);
        
        if (sessionError || !sessionData?.session) {
            console.error('No valid session for checkout:', sessionError);
            return { error: { message: 'Please sign in again to continue' } };
        }
        
        const accessToken = sessionData.session.access_token;
        console.log('Access token (first 50 chars):', accessToken?.substring(0, 50));
        console.log('Token expires at:', new Date(sessionData.session.expires_at * 1000).toISOString());
        
        // Get URLs safely
        let successUrl, cancelUrl;
        try {
            successUrl = chrome.runtime.getURL('sidepanel.html') + '?payment=success';
            cancelUrl = chrome.runtime.getURL('sidepanel.html') + '?payment=canceled';
        } catch (e) {
            successUrl = 'https://readify.ca/success';
            cancelUrl = 'https://readify.ca/cancel';
        }
        
        // Call Supabase Edge Function with explicit authorization header
        const functionUrl = `${window.READIFY_CONFIG.SUPABASE_URL}/functions/v1/create-checkout-session`;
        const requestBody = {
            priceId: window.READIFY_CONFIG?.STRIPE_PRICE_ID,
            successUrl: successUrl,
            cancelUrl: cancelUrl
        };
        
        console.log('Calling Edge Function:', functionUrl);
        console.log('Request body:', requestBody);
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'apikey': window.READIFY_CONFIG.SUPABASE_ANON_KEY
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            const text = await response.text();
            console.error('Response not JSON:', text);
            data = { error: text };
        }
        
        if (!response.ok) {
            console.error('Checkout session error:', JSON.stringify(data, null, 2));
            console.error('Response headers:', Object.fromEntries(response.headers.entries()));
            return { error: { message: data.error || data.message || 'Failed to create checkout session' } };
        }
        
        if (data?.url) {
            // Open Stripe checkout in new tab
            try {
                chrome.tabs.create({ url: data.url });
            } catch (e) {
                window.open(data.url, '_blank');
            }
            return { success: true, url: data.url };
        }
        
        return { error: { message: 'Failed to create checkout session' } };
    } catch (e) {
        console.error('Checkout exception:', e);
        return { error: { message: e.message || 'Failed to create checkout session' } };
    }
}

// Create a customer portal session for managing subscription
async function openCustomerPortal() {
    if (!window.ReadifyAuth?.isAuthenticated()) {
        return { 
            error: { 
                message: 'Please sign in to manage your subscription',
                requiresAuth: true 
            } 
        };
    }
    
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Service unavailable' } };
    }
    
    try {
        // Ensure we have a valid session with access token
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        if (sessionError || !sessionData?.session) {
            console.error('No valid session for portal:', sessionError);
            return { error: { message: 'Please sign in again to continue' } };
        }
        
        const accessToken = sessionData.session.access_token;
        
        // Get return URL safely
        let returnUrl;
        try {
            returnUrl = chrome.runtime.getURL('sidepanel.html');
        } catch (e) {
            returnUrl = 'https://readify.ca';
        }
        
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
            return { error: { message: data.error || 'Failed to open subscription portal' } };
        }
        
        if (data?.url) {
            try {
                chrome.tabs.create({ url: data.url });
            } catch (e) {
                window.open(data.url, '_blank');
            }
            return { success: true, url: data.url };
        }
        
        return { error: { message: 'Failed to open subscription portal' } };
    } catch (e) {
        console.error('Portal exception:', e);
        return { error: { message: e.message || 'Failed to open subscription portal' } };
    }
}

// Handle payment success redirect
async function handlePaymentSuccess() {
    // Refresh subscription status
    if (window.ReadifySubscription) {
        await window.ReadifySubscription.refresh();
    }
    
    // Check for migration needs
    if (window.ReadifyStorage) {
        const needsMigration = await window.ReadifyStorage.needsMigration();
        if (needsMigration) {
            // Migrate data from Chrome storage to Supabase
            const result = await window.ReadifyStorage.migrateToCloud();
            console.log('Data migration result:', result);
        }
    }
    
    return { success: true };
}

// Handle payment canceled redirect
function handlePaymentCanceled() {
    console.log('Payment was canceled');
    return { canceled: true };
}

// Check URL params for payment status on page load
function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
        handlePaymentSuccess().then(() => {
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        });
        return 'success';
    }
    
    if (paymentStatus === 'canceled') {
        handlePaymentCanceled();
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        return 'canceled';
    }
    
    return null;
}

// Get pricing info for display
function getPricingInfo() {
    return {
        price: window.READIFY_CONFIG?.SUBSCRIPTION_PRICE || '$4.99/month',
        features: [
            'Unlimited website saves',
            'AI-powered summarization',
            'Text-to-speech',
            'Cloud sync across devices',
            'Priority support'
        ]
    };
}

// Export stripe functions
if (typeof window !== 'undefined') {
    window.ReadifyStripe = {
        createCheckout: createStripeCheckout,
        openPortal: openCustomerPortal,
        handlePaymentSuccess,
        handlePaymentCanceled,
        checkPaymentStatus,
        getPricingInfo
    };
}

