// Readify Extension - Configuration
// Toggle DEV_MODE to switch between development and production

// ============================================
// ENVIRONMENT TOGGLE - Change this to switch
// ============================================
const DEV_MODE = true;  // Set to false for production

// ============================================
// API URLs
// ============================================
const API_URLS = {
    development: {
        API_URL: 'http://localhost:3000',
        WS_URL: 'ws://localhost:3000'
    },
    production: {
        API_URL: 'https://readify-api.onrender.com',  // Update with your Render URL
        WS_URL: 'wss://readify-api.onrender.com'      // Update with your Render URL
    }
};

const ENV = DEV_MODE ? API_URLS.development : API_URLS.production;

// ============================================
// MAIN CONFIGURATION
// ============================================
const READIFY_CONFIG = {
    // Environment
    DEV_MODE: DEV_MODE,
    
    // API Configuration (Your Node.js Backend)
    API_URL: ENV.API_URL,
    WS_URL: ENV.WS_URL,
    
    // API Endpoints
    ENDPOINTS: {
        // Stripe
        CREATE_CHECKOUT: '/api/stripe/create-checkout-session',
        CREATE_PORTAL: '/api/stripe/create-portal-session',
        CANCEL_SUBSCRIPTION: '/api/stripe/cancel-subscription',
        
        // Sites
        SAVE_SITE: '/api/sites/save',
        LIST_SITES: '/api/sites/list',
        GET_SITE: '/api/sites',  // + /:urlDigest
        DELETE_SITE: '/api/sites', // + /:urlDigest
        
        // AI
        AI_CHAT: '/api/ai/chat',
        AI_REALTIME_TOKEN: '/api/ai/realtime-token',
        AI_TTS: '/api/ai/tts',
        
        // Subscription
        SUBSCRIPTION_STATUS: '/api/subscription/status',
        
        // Usage
        USAGE_STATS: '/api/usage/stats',
        USAGE_HISTORY: '/api/usage/history',
        
        // Health
        HEALTH: '/health',
        
        // WebSocket
        WS: '/ws'
    },
    
    // Supabase Configuration (Required for client-side auth)
    // Note: SUPABASE_ANON_KEY is the PUBLIC key - designed to be in client code
    SUPABASE_URL: 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co',
    SUPABASE_ANON_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    
    // Display Configuration (no sensitive data)
    SUBSCRIPTION_PRICE: '$4.99/month',
    FREE_WEBSITE_LIMIT: 5,
    PREMIUM_WEBSITE_LIMIT: Infinity,
    
    // AI Configuration (display/UI settings only - API keys on backend)
    AI_CHAT: {
        ENABLED: true,
        MAX_TOKENS: 1024,
        TEMPERATURE: 0.7
    },
    
    AI_TTS: {
        ENABLED: true,
        SPEED: 1.0
    },
    
    AI_REALTIME: {
        ENABLED: true
    }
};

// Helper function to build full API URL
READIFY_CONFIG.getApiUrl = function(endpoint) {
    return this.API_URL + endpoint;
};

// Helper function to build WebSocket URL with token
READIFY_CONFIG.getWsUrl = function(token) {
    return this.WS_URL + this.ENDPOINTS.WS + '?token=' + encodeURIComponent(token);
};

// Make config available globally
if (typeof window !== 'undefined') {
    window.READIFY_CONFIG = READIFY_CONFIG;
}

// Log environment on load (dev only)
if (DEV_MODE && typeof console !== 'undefined') {
    console.log('🔧 Readify running in DEVELOPMENT mode');
    console.log('📡 API:', ENV.API_URL);
}
