// Readify Extension - Authentication Service
// Handles user signup, signin, signout, and auth state management

// Auth state
let authInitialized = false;

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

// Initialize auth service
async function initAuthService() {
    if (authInitialized) return;
    
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        console.warn('Supabase client not available, retrying...');
        setTimeout(initAuthService, 100);
        return;
    }
    
    // Restore session on load
    await window.ReadifySupabase.refreshSession();
    authInitialized = true;
    
    console.log('Auth service initialized');
}

// Sign up with email and password
async function signUp(email, password) {
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Authentication service not available' } };
    }
    
    try {
        const redirectUrl = safeGetURL('sidepanel.html');
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
            options: redirectUrl ? {
                emailRedirectTo: redirectUrl
            } : {}
        });
        
        if (error) {
            console.error('Sign up error:', error);
            return { data: null, error };
        }
        
        // If email confirmation is required, user will be null until confirmed
        if (data.user && !data.user.confirmed_at) {
            return {
                data: data,
                error: null,
                message: 'Please check your email to confirm your account'
            };
        }
        
        return { data, error: null };
    } catch (e) {
        console.error('Sign up exception:', e);
        return { error: { message: e.message || 'Sign up failed' } };
    }
}

// Sign in with email and password
async function signIn(email, password) {
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Authentication service not available' } };
    }
    
    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Sign in error:', error);
            return { data: null, error };
        }
        
        // Broadcast sign in to other extension contexts
        safeSendMessage({
            type: 'userSignedIn',
            user: data.user
        });
        
        return { data, error: null };
    } catch (e) {
        console.error('Sign in exception:', e);
        return { error: { message: e.message || 'Sign in failed' } };
    }
}

// Sign out
async function signOut() {
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Authentication service not available' } };
    }
    
    try {
        const { error } = await client.auth.signOut();
        
        if (error) {
            console.error('Sign out error:', error);
            return { error };
        }
        
        // Broadcast sign out to other extension contexts
        safeSendMessage({
            type: 'userSignedOut'
        });
        
        return { error: null };
    } catch (e) {
        console.error('Sign out exception:', e);
        return { error: { message: e.message || 'Sign out failed' } };
    }
}

// Get current user
function getCurrentUser() {
    return window.ReadifySupabase?.getCurrentUser() || null;
}

// Get current session
function getCurrentSession() {
    return window.ReadifySupabase?.getCurrentSession() || null;
}

// Check if user is authenticated
function isAuthenticated() {
    return window.ReadifySupabase?.isAuthenticated() || false;
}

// Get user profile from database
async function getUserProfile() {
    const client = window.ReadifySupabase?.getClient();
    const user = getCurrentUser();
    
    if (!client || !user) {
        return { data: null, error: { message: 'Not authenticated' } };
    }
    
    try {
        const { data, error } = await client
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error('Get profile error:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (e) {
        console.error('Get profile exception:', e);
        return { data: null, error: { message: e.message } };
    }
}

// Update user profile
async function updateUserProfile(updates) {
    const client = window.ReadifySupabase?.getClient();
    const user = getCurrentUser();
    
    if (!client || !user) {
        return { data: null, error: { message: 'Not authenticated' } };
    }
    
    try {
        const { data, error } = await client
            .from('user_profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        
        if (error) {
            console.error('Update profile error:', error);
            return { data: null, error };
        }
        
        return { data, error: null };
    } catch (e) {
        console.error('Update profile exception:', e);
        return { data: null, error: { message: e.message } };
    }
}

// Reset password
async function resetPassword(email) {
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Authentication service not available' } };
    }
    
    try {
        const redirectUrl = safeGetURL('sidepanel.html');
        const { error } = await client.auth.resetPasswordForEmail(email, 
            redirectUrl ? { redirectTo: redirectUrl } : {}
        );
        
        if (error) {
            console.error('Reset password error:', error);
            return { error };
        }
        
        return { error: null };
    } catch (e) {
        console.error('Reset password exception:', e);
        return { error: { message: e.message || 'Password reset failed' } };
    }
}

// Update password (when logged in)
async function updatePassword(newPassword) {
    const client = window.ReadifySupabase?.getClient();
    if (!client) {
        return { error: { message: 'Authentication service not available' } };
    }
    
    try {
        const { error } = await client.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('Update password error:', error);
            return { error };
        }
        
        return { error: null };
    } catch (e) {
        console.error('Update password exception:', e);
        return { error: { message: e.message || 'Password update failed' } };
    }
}

// Check if user has premium subscription
async function isPremiumUser() {
    const profile = await getUserProfile();
    
    if (profile.error || !profile.data) {
        return false;
    }
    
    return ['active', 'trialing'].includes(profile.data.subscription_status);
}

// Get subscription status
async function getSubscriptionStatus() {
    const profile = await getUserProfile();
    
    if (profile.error || !profile.data) {
        return 'free';
    }
    
    return profile.data.subscription_status || 'free';
}

// Listen for auth state changes
function onAuthChange(callback) {
    return window.ReadifySupabase?.onAuthStateChange((event, session, user) => {
        callback({
            event,
            session,
            user,
            isAuthenticated: !!user
        });
    });
}

// Export auth functions
if (typeof window !== 'undefined') {
    window.ReadifyAuth = {
        init: initAuthService,
        signUp,
        signIn,
        signOut,
        getCurrentUser,
        getCurrentSession,
        isAuthenticated,
        getUserProfile,
        updateUserProfile,
        resetPassword,
        updatePassword,
        isPremiumUser,
        getSubscriptionStatus,
        onAuthChange
    };
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initAuthService, 100);
        });
    } else {
        setTimeout(initAuthService, 100);
    }
}

