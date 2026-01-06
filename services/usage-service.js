// Readify Extension - Token Usage Service
// Handles fetching and caching per-feature token usage statistics

// Usage cache (using unique names to avoid global scope conflicts)
let _usageCache = null;
let _usageCacheTime = 0;
const USAGE_CACHE_DURATION = 30000; // 30 second cache

// Warning threshold
const USAGE_WARNING_THRESHOLD = 80; // Show warning at 80%

// Default limits (should match backend TOKEN_LIMITS)
const DEFAULT_LIMITS = {
    free: {
        chat: 50000,
        tts: 10000,
        realtime: 3000,
    },
    premium: {
        chat: 2000000,
        tts: 500000,
        realtime: 100000,
    },
};

// ============================================
// Core Functions
// ============================================

/**
 * Fetch usage stats from the API
 * @param {boolean} bypassCache - Skip cache and fetch fresh data
 * @returns {Promise<Object>} Usage stats with per-feature breakdown
 */
async function getUsageStats(bypassCache = false) {
    // Check cache first
    if (!bypassCache && _usageCache && Date.now() - _usageCacheTime < USAGE_CACHE_DURATION) {
        return _usageCache;
    }
    
    // Not authenticated = no usage data
    if (!window.ReadifyAuth?.isAuthenticated()) {
        return getDefaultUsage();
    }
    
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return getDefaultUsage();
    }
    
    try {
        // Get access token
        const { data: { session } } = await client.auth.getSession();
        if (!session?.access_token) {
            return getDefaultUsage();
        }
        
        const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.USAGE_STATS);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
        });
        
        if (!response.ok) {
            console.error('[Usage] API error:', await response.text());
            return _usageCache || getDefaultUsage();
        }
        
        const data = await response.json();
        
        // Update cache with per-feature data
        _usageCache = {
            tier: data.tier || 'free',
            chat: {
                used: data.chat?.used || 0,
                limit: data.chat?.limit || DEFAULT_LIMITS.free.chat,
                remaining: data.chat?.remaining || DEFAULT_LIMITS.free.chat,
                percentUsed: data.chat?.percentUsed || 0,
                isWarning: data.chat?.isWarning || false,
                allowed: data.chat?.allowed !== false,
            },
            tts: {
                used: data.tts?.used || 0,
                limit: data.tts?.limit || DEFAULT_LIMITS.free.tts,
                remaining: data.tts?.remaining || DEFAULT_LIMITS.free.tts,
                percentUsed: data.tts?.percentUsed || 0,
                isWarning: data.tts?.isWarning || false,
                allowed: data.tts?.allowed !== false,
            },
            realtime: {
                used: data.realtime?.used || 0,
                limit: data.realtime?.limit || DEFAULT_LIMITS.free.realtime,
                remaining: data.realtime?.remaining || DEFAULT_LIMITS.free.realtime,
                percentUsed: data.realtime?.percentUsed || 0,
                isWarning: data.realtime?.isWarning || false,
                allowed: data.realtime?.allowed !== false,
            },
            resetDate: data.resetDate || getNextResetDate(),
        };
        _usageCacheTime = Date.now();
        
        return _usageCache;
    } catch (e) {
        console.error('[Usage] Fetch error:', e);
        return _usageCache || getDefaultUsage();
    }
}

/**
 * Get cached usage stats (no API call)
 * @returns {Object|null} Cached usage or null
 */
function getCachedUsage() {
    if (_usageCache && Date.now() - _usageCacheTime < USAGE_CACHE_DURATION) {
        return _usageCache;
    }
    return null;
}

/**
 * Get usage for a specific feature
 * @param {'chat'|'tts'|'realtime'} feature - The feature to get usage for
 * @returns {Promise<Object>} Feature-specific usage stats
 */
async function getFeatureUsage(feature) {
    const usage = await getUsageStats();
    return usage[feature] || getDefaultFeatureUsage(feature);
}

/**
 * Get cached usage for a specific feature (no API call)
 * @param {'chat'|'tts'|'realtime'} feature - The feature to get usage for
 * @returns {Object|null} Feature-specific cached usage or null
 */
function getCachedFeatureUsage(feature) {
    const cached = getCachedUsage();
    if (cached && cached[feature]) {
        return cached[feature];
    }
    return null;
}

/**
 * Check if a specific feature is allowed (has remaining quota)
 * @param {'chat'|'tts'|'realtime'} feature - The feature to check
 * @returns {Promise<boolean>} Whether the feature is allowed
 */
async function isFeatureAllowed(feature) {
    const usage = await getUsageStats();
    return usage[feature]?.allowed !== false;
}

/**
 * Update local cache with new usage data from API response
 * Called after chat/TTS/realtime responses that include usage info
 * @param {'chat'|'tts'|'realtime'} feature - Which feature was used
 * @param {Object} usageData - Usage data from API response
 */
function updateFromResponse(feature, usageData) {
    if (!usageData) return;
    
    // Initialize cache if it doesn't exist
    if (!_usageCache) {
        _usageCache = getDefaultUsage();
    }
    
    // Update the specific feature
    if (_usageCache[feature]) {
        if (usageData.totalUsed !== undefined) {
            _usageCache[feature].used = usageData.totalUsed;
        }
        if (usageData.limit !== undefined) {
            _usageCache[feature].limit = usageData.limit;
        }
        if (usageData.percentUsed !== undefined) {
            _usageCache[feature].percentUsed = usageData.percentUsed;
        }
        
        // Recalculate derived values
        _usageCache[feature].remaining = Math.max(0, _usageCache[feature].limit - _usageCache[feature].used);
        _usageCache[feature].isWarning = _usageCache[feature].percentUsed >= USAGE_WARNING_THRESHOLD;
        _usageCache[feature].allowed = _usageCache[feature].used < _usageCache[feature].limit;
    }
    
    _usageCacheTime = Date.now();
    console.log(`[Usage] Updated ${feature} from response:`, _usageCache[feature]);
}

/**
 * Clear usage cache (call on logout or subscription change)
 */
function clearCache() {
    _usageCache = null;
    _usageCacheTime = 0;
}

/**
 * Check if user should see a usage warning for a specific feature
 * @param {'chat'|'tts'|'realtime'} feature - The feature to check
 * @returns {Promise<Object>} Warning info
 */
async function checkAndWarn(feature) {
    const usage = await getUsageStats();
    const featureUsage = usage[feature];
    
    return {
        shouldWarn: featureUsage?.isWarning && featureUsage?.allowed,
        isBlocked: !featureUsage?.allowed,
        percentUsed: featureUsage?.percentUsed || 0,
        tier: usage.tier,
        feature: feature,
        message: getWarningMessage(feature, featureUsage, usage.tier),
    };
}

/**
 * Format usage for display
 * @param {'chat'|'tts'|'realtime'} feature - The feature to format
 * @param {Object} featureUsage - Feature usage stats object
 * @returns {Object} Formatted display values
 */
function formatFeatureUsage(feature, featureUsage) {
    const used = featureUsage?.used || 0;
    const limit = featureUsage?.limit || getDefaultLimit(feature);
    const percent = featureUsage?.percentUsed || 0;
    
    return {
        usedText: formatCount(used, feature),
        limitText: formatCount(limit, feature),
        percentText: `${percent}%`,
        statusText: getStatusText(featureUsage),
        barWidth: `${Math.min(100, percent)}%`,
        barClass: getBarClass(percent),
        featureLabel: getFeatureLabel(feature),
    };
}

// ============================================
// Helper Functions
// ============================================

function getDefaultUsage() {
    return {
        tier: 'free',
        chat: getDefaultFeatureUsage('chat'),
        tts: getDefaultFeatureUsage('tts'),
        realtime: getDefaultFeatureUsage('realtime'),
        resetDate: getNextResetDate(),
    };
}

function getDefaultFeatureUsage(feature) {
    const limit = DEFAULT_LIMITS.free[feature] || 5000;
    return {
        used: 0,
        limit: limit,
        remaining: limit,
        percentUsed: 0,
        isWarning: false,
        allowed: true,
    };
}

function getDefaultLimit(feature) {
    return DEFAULT_LIMITS.free[feature] || 5000;
}

function getNextResetDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

function formatCount(count, feature) {
    // TTS uses characters, show "chars" suffix
    const suffix = feature === 'tts' ? '' : '';
    
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M' + suffix;
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k' + suffix;
    }
    return count.toString() + suffix;
}

function getFeatureLabel(feature) {
    switch (feature) {
        case 'chat': return 'Chat';
        case 'tts': return 'Text-to-Speech';
        case 'realtime': return 'Voice Chat';
        default: return feature;
    }
}

function getWarningMessage(feature, featureUsage, tier) {
    if (!featureUsage?.allowed) {
        const label = getFeatureLabel(feature);
        if (tier === 'free') {
            return `${label} limit reached. Upgrade to Premium for more!`;
        }
        return `${label} limit reached. Resets ${formatResetDate(featureUsage?.resetDate)}`;
    }
    
    if (featureUsage?.isWarning) {
        return `You've used ${featureUsage.percentUsed}% of your ${getFeatureLabel(feature).toLowerCase()} quota`;
    }
    
    return '';
}

function getStatusText(featureUsage) {
    if (!featureUsage) return '';
    
    if (!featureUsage.allowed) {
        return 'Limit reached';
    }
    
    if (featureUsage.isWarning) {
        return 'Running low';
    }
    
    return '';
}

function getBarClass(percent) {
    if (percent >= 100) return 'usage-bar-error';
    if (percent >= 80) return 'usage-bar-warning';
    return 'usage-bar-normal';
}

function formatResetDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
        return 'next month';
    }
}

// ============================================
// Legacy Compatibility (for existing code)
// ============================================

/**
 * Get overall usage stats (legacy format)
 * Uses chat as the primary metric for backwards compatibility
 * @deprecated Use getUsageStats() for per-feature data
 */
function getLegacyStats() {
    if (!_usageCache) return null;
    
    // Return chat usage as the "main" usage for backwards compatibility
    return {
        tier: _usageCache.tier,
        used: _usageCache.chat.used,
        limit: _usageCache.chat.limit,
        remaining: _usageCache.chat.remaining,
        percentUsed: _usageCache.chat.percentUsed,
        isWarning: _usageCache.chat.isWarning,
        allowed: _usageCache.chat.allowed,
        resetDate: _usageCache.resetDate,
    };
}

// ============================================
// Event Handling
// ============================================

// Listen for auth changes to clear cache
if (typeof window !== 'undefined') {
    // Clear cache on logout
    window.ReadifyAuth?.onAuthChange((authState) => {
        if (!authState.isAuthenticated) {
            clearCache();
        }
    });
}

// ============================================
// Export
// ============================================
if (typeof window !== 'undefined') {
    window.ReadifyUsage = {
        // Core functions
        getStats: getUsageStats,
        getCached: getCachedUsage,
        
        // Per-feature functions
        getFeature: getFeatureUsage,
        getCachedFeature: getCachedFeatureUsage,
        isAllowed: isFeatureAllowed,
        
        // Update and cache management
        updateFromResponse,
        clearCache,
        
        // Utilities
        checkAndWarn,
        formatFeature: formatFeatureUsage,
        
        // Legacy compatibility
        getLegacy: getLegacyStats,
        
        // Constants
        DEFAULT_LIMITS,
    };
}

