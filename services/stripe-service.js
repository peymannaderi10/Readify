// Readify Extension - Stripe Service
// Handles Stripe checkout and subscription management via Readify API

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
        
        if (sessionError || !sessionData?.session) {
            console.error('No valid session for checkout:', sessionError);
            return { error: { message: 'Please sign in again to continue' } };
        }
        
        const accessToken = sessionData.session.access_token;
        
        // Get URLs safely
        let successUrl, cancelUrl;
        try {
            successUrl = chrome.runtime.getURL('sidepanel.html') + '?payment=success';
            cancelUrl = chrome.runtime.getURL('sidepanel.html') + '?payment=canceled';
        } catch (e) {
            successUrl = 'https://readify.ca/success';
            cancelUrl = 'https://readify.ca/cancel';
        }
        
        // Call Readify API (priceId is configured on backend)
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.CREATE_CHECKOUT);
        const requestBody = {
            successUrl: successUrl,
            cancelUrl: cancelUrl
        };
        
        if (window.READIFY_CONFIG.DEV_MODE) {
            console.log('Calling API:', apiUrl);
            console.log('Request body:', requestBody);
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
        });
        
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
        
        // Call Readify API
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.CREATE_PORTAL);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                returnUrl: returnUrl
            })
        });
        
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

// Cancel subscription
async function cancelSubscription(subscriptionId) {
    if (!window.ReadifyAuth?.isAuthenticated()) {
        return { 
            error: { 
                message: 'Please sign in to cancel your subscription',
                requiresAuth: true 
            } 
        };
    }
    
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Service unavailable' } };
    }
    
    try {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        if (sessionError || !sessionData?.session) {
            return { error: { message: 'Please sign in again to continue' } };
        }
        
        const accessToken = sessionData.session.access_token;
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.CANCEL_SUBSCRIPTION);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ subscriptionId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return { error: { message: data.error || 'Failed to cancel subscription' } };
        }
        
        return { success: true, ...data };
    } catch (e) {
        console.error('Cancel subscription exception:', e);
        return { error: { message: e.message || 'Failed to cancel subscription' } };
    }
}

// Handle payment success redirect
async function handlePaymentSuccess() {
    // Refresh subscription status
    if (window.ReadifySubscription) {
        await window.ReadifySubscription.refresh();
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
        cancelSubscription: cancelSubscription,
        handlePaymentSuccess,
        handlePaymentCanceled,
        checkPaymentStatus,
        getPricingInfo
    };
}
