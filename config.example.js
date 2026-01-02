// Readify Extension - Configuration
// Copy this file to config.js and replace with your actual Supabase and Stripe credentials

const READIFY_CONFIG = {
    // Supabase Configuration
    // Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
    SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    
    // Stripe Configuration
    // Get publishable key from: https://dashboard.stripe.com/apikeys
    STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
    
    // Stripe Price ID for the monthly subscription
    // Get this from: https://dashboard.stripe.com/products
    STRIPE_PRICE_ID: 'price_YOUR_STRIPE_PRICE_ID',
    
    // Monthly subscription price (for display purposes)
    SUBSCRIPTION_PRICE: '$4.99/month',
    
    // Feature limits
    FREE_WEBSITE_LIMIT: 5,
    PREMIUM_WEBSITE_LIMIT: Infinity
};

// Make config available globally
if (typeof window !== 'undefined') {
    window.READIFY_CONFIG = READIFY_CONFIG;
}

