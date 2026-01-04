// On sidepanel load
document.addEventListener("DOMContentLoaded", async function () {
    // Initialize Supabase and auth
    await initializeAuth();
    
    // Check if study mode should be disabled due to limit
    const allowed = await checkStudyModeAllowed();
    
    // Initialize Study Mode state
    chrome.storage.sync.get(["extensionEnabled"], function(result) {
        const enableCheckbox = document.getElementById("enableCheckbox");
        const toggleLabel = enableCheckbox.closest('.modern-toggle');
        const toggleText = toggleLabel.querySelector('.toggle-text');
        
        let enabled = result.extensionEnabled || false;
        
        // If limit is reached, force disable study mode
        if (!allowed && enabled) {
            enabled = false;
            chrome.storage.sync.set({ extensionEnabled: false });
        }
        
        enableCheckbox.checked = enabled;
        toggleText.textContent = enabled ? 'Disable Study Mode' : 'Enable Study Mode';
    });

    // Load My Sites
    loadMySites();
    
    // Load and display website limit
    updateLimitDisplay();

    // Set up real-time message listener for My Sites updates
    setupMySitesListener();
    
    // Set up auth event listeners
    setupAuthListeners();
    
    // Check for payment status in URL
    checkPaymentStatusOnLoad();
});

// ============================================
// AUTH INITIALIZATION
// ============================================

async function initializeAuth() {
    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check current auth state and update UI
    await updateAuthUI();
    
    // Listen for auth state changes
    if (window.ReadifyAuth) {
        window.ReadifyAuth.onAuthChange(async (authState) => {
            await updateAuthUI();
            if (authState.isAuthenticated) {
                // Refresh sites list when user logs in
                await loadMySites();
                await updateLimitDisplay();
            }
        });
    }
}

async function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    const userProfileSection = document.getElementById('userProfileSection');
    const premiumBanner = document.getElementById('premiumBanner');
    const authFormsContainer = document.getElementById('authFormsContainer');
    
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (isAuthenticated) {
        // User is logged in
        // Hide auth section
        if (authSection) authSection.style.display = 'none';
        
        // Always show profile section when logged in
        if (userProfileSection) userProfileSection.style.display = 'block';
        
        // Update subscription status
        await updateSubscriptionUI();
    } else {
        // User is not logged in
        // Show auth section (collapsed by default)
        if (authSection) authSection.style.display = 'block';
        
        // Collapse the forms
        if (authFormsContainer) authFormsContainer.style.display = 'none';
        
        // Reset button states
        const showSigninBtn = document.getElementById('showSigninBtn');
        const showSignupBtn = document.getElementById('showSignupBtn');
        if (showSigninBtn) showSigninBtn.classList.remove('active');
        if (showSignupBtn) showSignupBtn.classList.remove('active');
        
        // Hide profile section
        if (userProfileSection) userProfileSection.style.display = 'none';
        
        // Show premium banner for non-logged in users
        if (premiumBanner) {
            premiumBanner.style.display = 'block';
        }
    }
}

async function updateSubscriptionUI() {
    const userEmail = document.getElementById('userEmail');
    const userPlan = document.getElementById('userPlan');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const cancelSubBtn = document.getElementById('cancelSubBtn');
    const subEndingBtn = document.getElementById('subEndingBtn');
    const premiumBanner = document.getElementById('premiumBanner');
    const limitCounter = document.getElementById('limitCounter');
    
    const user = window.ReadifyAuth?.getCurrentUser();
    if (userEmail && user) {
        userEmail.textContent = user.email || 'Unknown';
    }
    
    // Get subscription status
    if (window.ReadifySubscription) {
        const subscription = await window.ReadifySubscription.getStatus();
        
        if (subscription.isPremium) {
            // Premium user - check if cancelled (has cancelled_at date or status is canceling)
            const isCanceling = subscription.cancelledAt || subscription.status === 'canceling';
            
            if (userPlan) {
                if (isCanceling) {
                    userPlan.innerHTML = '<span class="plan-badge canceling">Premium (Ending)</span>';
                } else {
                    userPlan.innerHTML = '<span class="plan-badge premium">Premium</span>';
                }
            }
            if (upgradeBtn) upgradeBtn.style.display = 'none';
            
            if (isCanceling) {
                // Show "Ends on [date]" button instead of cancel button
                if (cancelSubBtn) cancelSubBtn.style.display = 'none';
                if (subEndingBtn) {
                    subEndingBtn.style.display = 'block';
                    // Format the end date
                    if (subscription.subscriptionEndsAt) {
                        const endDate = new Date(subscription.subscriptionEndsAt);
                        const dateStr = endDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        });
                        subEndingBtn.textContent = `Ends ${dateStr}`;
                    } else {
                        subEndingBtn.textContent = 'Subscription ending';
                    }
                }
            } else {
                // Show cancel button
                if (cancelSubBtn) cancelSubBtn.style.display = 'block';
                if (subEndingBtn) subEndingBtn.style.display = 'none';
            }
            
            if (premiumBanner) premiumBanner.style.display = 'none';
        } else {
            // Free user
            if (userPlan) {
                userPlan.innerHTML = '<span class="plan-badge free">Free Plan</span>';
            }
            if (upgradeBtn) upgradeBtn.style.display = 'block';
            if (cancelSubBtn) cancelSubBtn.style.display = 'none';
            if (subEndingBtn) subEndingBtn.style.display = 'none';
            if (premiumBanner) premiumBanner.style.display = 'block';
        }
    }
}

// ============================================
// AUTH EVENT LISTENERS
// ============================================

function setupAuthListeners() {
    // Sign In button - expands to show sign in form
    const showSigninBtn = document.getElementById('showSigninBtn');
    if (showSigninBtn) {
        showSigninBtn.addEventListener('click', () => {
            expandAuthForm('signin');
        });
    }
    
    // Sign Up button - expands to show sign up form
    const showSignupBtn = document.getElementById('showSignupBtn');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => {
            expandAuthForm('signup');
        });
    }
    
    // Sign in button
    const signinBtn = document.getElementById('signinBtn');
    if (signinBtn) {
        signinBtn.addEventListener('click', handleSignIn);
    }
    
    // Sign up button
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', handleSignUp);
    }
    
    // Sign out button
    const signoutBtn = document.getElementById('signoutBtn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', handleSignOut);
    }
    
    // Close button for auth section
    const authCloseBtn = document.getElementById('authCloseBtn');
    if (authCloseBtn) {
        authCloseBtn.addEventListener('click', () => {
            document.getElementById('authSection').style.display = 'none';
        });
    }
    
    // Upgrade buttons
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', handleUpgrade);
    }
    
    const premiumCta = document.getElementById('premiumCta');
    if (premiumCta) {
        premiumCta.addEventListener('click', handleUpgrade);
    }
    
    // Manage subscription button
    const cancelSubBtn = document.getElementById('cancelSubBtn');
    if (cancelSubBtn) {
        cancelSubBtn.addEventListener('click', showCancelSubscriptionModal);
    }
    
    // Cancel subscription modal buttons
    const cancelSubCancelBtn = document.getElementById('cancelSubCancelBtn');
    const cancelSubConfirmBtn = document.getElementById('cancelSubConfirmBtn');
    const cancelSubDoneBtn = document.getElementById('cancelSubDoneBtn');
    
    if (cancelSubCancelBtn) {
        cancelSubCancelBtn.addEventListener('click', hideCancelSubscriptionModal);
    }
    if (cancelSubConfirmBtn) {
        cancelSubConfirmBtn.addEventListener('click', handleCancelSubscription);
    }
    if (cancelSubDoneBtn) {
        cancelSubDoneBtn.addEventListener('click', hideCancelSubscriptionModal);
    }
    
    // Forgot password
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', handleForgotPassword);
    }
    
    // Enter key handlers for forms
    document.getElementById('signinEmail')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignIn();
    });
    document.getElementById('signinPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignIn();
    });
    document.getElementById('signupEmail')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignUp();
    });
    document.getElementById('signupPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignUp();
    });
    document.getElementById('signupConfirmPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignUp();
    });
    
    // Success modal close
    const successOkBtn = document.getElementById('successOkBtn');
    if (successOkBtn) {
        successOkBtn.addEventListener('click', () => {
            document.getElementById('paymentSuccessModal').style.display = 'none';
        });
    }
}


function expandAuthForm(formType) {
    const authFormsContainer = document.getElementById('authFormsContainer');
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    const showSigninBtn = document.getElementById('showSigninBtn');
    const showSignupBtn = document.getElementById('showSignupBtn');
    
    // Check if already expanded with this form
    const isExpanded = authFormsContainer.style.display !== 'none';
    const isSigninVisible = signinForm.style.display !== 'none';
    
    if (isExpanded) {
        // If clicking the same button, collapse
        if ((formType === 'signin' && isSigninVisible) || (formType === 'signup' && !isSigninVisible)) {
            authFormsContainer.style.display = 'none';
            showSigninBtn.classList.remove('active');
            showSignupBtn.classList.remove('active');
            return;
        }
    }
    
    // Expand and show the correct form
    authFormsContainer.style.display = 'block';
    
    if (formType === 'signin') {
        signinForm.style.display = 'flex';
        signupForm.style.display = 'none';
        showSigninBtn.classList.add('active');
        showSignupBtn.classList.remove('active');
    } else {
        signinForm.style.display = 'none';
        signupForm.style.display = 'flex';
        showSigninBtn.classList.remove('active');
        showSignupBtn.classList.add('active');
    }
    
    // Clear messages
    const signinMessage = document.getElementById('signinMessage');
    const signupMessage = document.getElementById('signupMessage');
    if (signinMessage) signinMessage.textContent = '';
    if (signupMessage) signupMessage.textContent = '';
}

async function handleSignIn() {
    const email = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value;
    const messageEl = document.getElementById('signinMessage');
    const signinBtn = document.getElementById('signinBtn');
    
    if (!email || !password) {
        showAuthMessage(messageEl, 'Please enter email and password', 'error');
        return;
    }
    
    signinBtn.disabled = true;
    signinBtn.textContent = 'Signing in...';
    
    const result = await window.ReadifyAuth?.signIn(email, password);
    
    signinBtn.disabled = false;
    signinBtn.textContent = 'Sign In';
    
    if (result?.error) {
        showAuthMessage(messageEl, result.error.message || 'Sign in failed', 'error');
    } else {
        showAuthMessage(messageEl, 'Signed in successfully!', 'success');
        document.getElementById('authSection').style.display = 'none';
        
        // Clear form
        document.getElementById('signinEmail').value = '';
        document.getElementById('signinPassword').value = '';
        
        // Update UI
        await updateAuthUI();
        await loadMySites();
        await updateLimitDisplay();
        
        // Note: Migration functionality handled automatically in storage-manager.js
    }
}

async function handleSignUp() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const messageEl = document.getElementById('signupMessage');
    const signupBtn = document.getElementById('signupBtn');
    
    if (!email || !password || !confirmPassword) {
        showAuthMessage(messageEl, 'Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthMessage(messageEl, 'Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage(messageEl, 'Password must be at least 6 characters', 'error');
        return;
    }
    
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    
    const result = await window.ReadifyAuth?.signUp(email, password);
    
    signupBtn.disabled = false;
    signupBtn.textContent = 'Create Account';
    
    if (result?.error) {
        showAuthMessage(messageEl, result.error.message || 'Sign up failed', 'error');
    } else if (result?.message) {
        showAuthMessage(messageEl, result.message, 'success');
    } else {
        showAuthMessage(messageEl, 'Account created! Please check your email to verify.', 'success');
        
        // Clear form
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupConfirmPassword').value = '';
    }
}

async function handleSignOut() {
    await window.ReadifyAuth?.signOut();
    
    await updateAuthUI();
    await loadMySites();
    await updateLimitDisplay();
}

async function handleUpgrade() {
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Show auth section
        document.getElementById('authSection').style.display = 'block';
        return;
    }
    
    // Create checkout session
    if (window.ReadifyStripe) {
        const result = await window.ReadifyStripe.createCheckout();
        if (result.error) {
            alert(result.error.message || 'Failed to start checkout');
        }
    } else if (window.ReadifySubscription) {
        const result = await window.ReadifySubscription.createCheckoutSession();
        if (result.error) {
            alert(result.error.message || 'Failed to start checkout');
        }
    }
}

function showCancelSubscriptionModal() {
    const modal = document.getElementById('cancelSubModal');
    const confirmState = document.getElementById('cancelSubConfirmState');
    const successState = document.getElementById('cancelSubSuccessState');
    
    if (modal) {
        // Reset to confirmation state
        if (confirmState) confirmState.style.display = 'block';
        if (successState) successState.style.display = 'none';
        modal.style.display = 'flex';
    }
}

function hideCancelSubscriptionModal() {
    const modal = document.getElementById('cancelSubModal');
    const confirmState = document.getElementById('cancelSubConfirmState');
    const successState = document.getElementById('cancelSubSuccessState');
    
    if (modal) {
        modal.style.display = 'none';
        // Reset states for next time
        if (confirmState) confirmState.style.display = 'block';
        if (successState) successState.style.display = 'none';
    }
}

async function handleCancelSubscription() {
    const confirmBtn = document.getElementById('cancelSubConfirmBtn');
    const cancelBtn = document.getElementById('cancelSubCancelBtn');
    const confirmState = document.getElementById('cancelSubConfirmState');
    const successState = document.getElementById('cancelSubSuccessState');
    const successMessage = document.getElementById('cancelSuccessMessage');
    
    // Disable buttons and show loading
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Cancelling...';
    }
    if (cancelBtn) {
        cancelBtn.disabled = true;
    }
    
    try {
        const client = window.ReadifySupabase?.getClient();
        const user = window.ReadifyAuth?.getCurrentUser();
        
        if (!client || !user) {
            throw new Error('Not authenticated');
        }
        
        // Step 1: Get user's subscription info
        const { data: profile, error: profileError } = await client
            .from('user_profiles')
            .select('stripe_subscription_id')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            throw new Error('Failed to get subscription info');
        }
        
        if (!profile?.stripe_subscription_id) {
            throw new Error('No active subscription found');
        }
        
        // Step 2: Cancel the Stripe subscription at period end via Edge Function
        const { data: sessionData } = await client.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        
        if (!accessToken) {
            throw new Error('No valid session');
        }
        
        const response = await fetch(
            `${window.READIFY_CONFIG.SUPABASE_URL}/functions/v1/cancel-subscription`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': window.READIFY_CONFIG.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    subscriptionId: profile.stripe_subscription_id
                })
            }
        );
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('Cancel subscription error:', result);
            throw new Error(result.error || 'Failed to cancel subscription');
        }
        
        // Step 3: Clear subscription cache
        if (window.ReadifySubscription) {
            await window.ReadifySubscription.refresh();
        }
        
        // Format the end date
        let endDateStr = 'your billing date';
        if (result.current_period_end) {
            const endDate = new Date(result.current_period_end);
            endDateStr = endDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        // Show success state in modal
        if (confirmState) confirmState.style.display = 'none';
        if (successState) successState.style.display = 'block';
        if (successMessage) {
            successMessage.textContent = `Premium access ends on ${endDateStr}.`;
        }
        
        // Refresh UI
        await updateAuthUI();
        await loadMySites();
        await updateLimitDisplay();
        
    } catch (error) {
        console.error('Cancel subscription error:', error);
        // Show error in modal or fallback to alert
        if (successMessage) {
            if (confirmState) confirmState.style.display = 'none';
            if (successState) successState.style.display = 'block';
            successMessage.textContent = 'Failed to cancel: ' + (error.message || 'Unknown error');
            document.querySelector('#cancelSubSuccessState .modal-title').textContent = '❌ Error';
        } else {
            alert('Failed to cancel subscription: ' + (error.message || 'Unknown error'));
        }
    } finally {
        // Re-enable buttons
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Cancel';
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('signinEmail').value.trim();
    const messageEl = document.getElementById('signinMessage');
    
    if (!email) {
        showAuthMessage(messageEl, 'Please enter your email address', 'error');
        return;
    }
    
    const result = await window.ReadifyAuth?.resetPassword(email);
    
    if (result?.error) {
        showAuthMessage(messageEl, result.error.message || 'Failed to send reset email', 'error');
    } else {
        showAuthMessage(messageEl, 'Password reset email sent! Check your inbox.', 'success');
    }
}

function showAuthMessage(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = 'auth-message ' + type;
}

function checkPaymentStatusOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
        // Show success modal
        document.getElementById('paymentSuccessModal').style.display = 'flex';
        
        // Refresh subscription status
        setTimeout(async () => {
            await updateAuthUI();
            await loadMySites();
            await updateLimitDisplay();
        }, 500);
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'canceled') {
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
    }
}

function setupMySitesListener() {
    // Listen for messages from content scripts about site changes
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'mySitesUpdate') {
            handleMySitesUpdate(message);
        }
    });
}

async function handleMySitesUpdate(message) {
    // Reload the My Sites list when changes are made
    await loadMySites();
    
    // Update limit display
    await updateLimitDisplay();
    
    // Optional: Show a brief visual indicator that the list was updated
    const sitesList = document.getElementById('sitesList');
    if (sitesList) {
        sitesList.style.opacity = '0.7';
        setTimeout(() => {
            sitesList.style.opacity = '1';
        }, 200);
    }
}

async function loadMySites() {
    try {
        console.log('Loading My Sites...');
        const sites = await getAllSavedSites();
        console.log('Got sites:', sites.length);
        displaySites(sites);
    } catch (error) {
        console.error('Error loading sites:', error);
    }
}

function displaySites(sites) {
    const sitesList = document.getElementById('sitesList');
    const deleteChangesSection = document.getElementById('deleteChangesSection');
    
    // Remove existing event listener to prevent duplicates
    sitesList.removeEventListener('click', handleSiteClick);
    
    if (sites.length === 0) {
        sitesList.innerHTML = `
            <div class="empty-sites">
                <p>No saved sites yet</p>
                <small>Your highlighted and noted websites will appear here</small>
            </div>
        `;
        // Hide delete changes section when no sites
        if (deleteChangesSection) deleteChangesSection.style.display = 'none';
        return;
    }
    
    // Show delete changes section when there are sites
    if (deleteChangesSection) deleteChangesSection.style.display = 'block';

    sitesList.innerHTML = sites.map(site => `
        <div class="site-item">
            <div class="site-info" data-url="${escapeHtml(site.info.url)}">
                <div class="site-title">${escapeHtml(site.info.title)}</div>
                <div class="site-url">${escapeHtml(site.info.hostname)} • ${site.changeCount} change${site.changeCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="site-actions">
                <button class="site-delete-btn" data-digest="${site.digest}" title="Delete all changes for this site">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');

    // Add event listeners using event delegation
    sitesList.addEventListener('click', handleSiteClick);
}

function handleSiteClick(event) {
    const target = event.target;
    
    // Handle site info click (open site)
    if (target.closest('.site-info')) {
        const siteInfo = target.closest('.site-info');
        const url = siteInfo.dataset.url;
        if (url) {
            openSite(url);
        }
    }
    
    // Handle delete button click
    if (target.classList.contains('site-delete-btn')) {
        const digest = target.dataset.digest;
        if (digest) {
            deleteSite(digest);
        }
    }
}

function openSite(url) {
    chrome.tabs.create({ url: url });
}

async function deleteSite(digest) {
    // Store the digest for the modal confirmation
    window.pendingSiteDelete = digest;
    
    // Show the same confirmation modal
    const modal = document.getElementById("confirmationModal");
    
    // Update modal text for individual site deletion
    const modalTitle = modal.querySelector('.modal-title');
    const modalText = modal.querySelector('.modal-text');
    
    if (modalTitle) modalTitle.textContent = 'Delete Site Changes';
    if (modalText) modalText.textContent = 'Delete all changes for this site? This action cannot be undone.';
    
    modal.style.display = "flex";
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper function to get all saved sites
async function getAllSavedSites() {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - no saved sites (session-only mode)
        console.log('Not logged in - no saved sites');
        return [];
    }
    
    // All logged-in users (free and premium) use Supabase
    console.log('Loading sites from Supabase');
    return await getAllSitesFromSupabase();
}

async function getAllSitesFromSupabase() {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        console.log('No client or user for Supabase sites');
        return [];
    }
    
    try {
        const { data, error } = await client
            .from('user_sites')
            .select('*')
            .eq('user_id', user.id)
            .order('last_modified', { ascending: false });
        
        if (error) {
            console.error('Get all sites from Supabase error:', error);
            return [];
        }
        
        return (data || []).map(site => ({
            digest: site.url_digest,
            info: {
                url: site.url,
                title: site.title,
                hostname: site.hostname,
                lastModified: new Date(site.last_modified).getTime()
            },
            changeCount: site.changes?.length || 0,
            changes: site.changes
        }));
    } catch (e) {
        console.error('Get all sites from Supabase exception:', e);
        return [];
    }
}

async function getAllSitesFromChromeLocal() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, function(allData) {
            if (chrome.runtime.lastError) {
                console.error('Error getting sites from chrome.storage.local:', chrome.runtime.lastError);
                resolve([]);
                return;
            }
            
            const sites = [];
            const allKeys = Object.keys(allData);
            const siteKeys = allKeys.filter(k => k.startsWith('readify-site-'));
            
            console.log('Chrome storage keys:', allKeys.length, 'total,', siteKeys.length, 'site keys');
            
            // Look for new format keys
            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('readify-site-')) {
                    const digest = key.replace('readify-site-', '');
                    const changesCount = value.changes?.length || 0;
                    const notesCount = Object.keys(value.notes || {}).length;
                    const totalChanges = changesCount + notesCount;
                    
                    console.log(`Site ${digest}: ${changesCount} changes, ${notesCount} notes, info:`, value.info ? 'yes' : 'no');
                    
                    if (value.info && totalChanges > 0) {
                        sites.push({
                            digest: digest,
                            info: value.info,
                            changeCount: totalChanges,
                            changes: value.changes || [],
                            notes: value.notes || {},
                            sizeBytes: value.sizeBytes || 0
                        });
                    }
                }
            }
            
            console.log('Found', sites.length, 'sites with changes');
            
            // Sort by last modified
            sites.sort((a, b) => (b.info?.lastModified || 0) - (a.info?.lastModified || 0));
            resolve(sites);
        });
    });
}

// Helper function to delete site data
async function deleteSiteData(digest) {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - nothing to delete (session-only mode)
        console.log('Not logged in - nothing to delete');
        return;
    }
    
    // All logged-in users delete from Supabase
    await deleteSiteFromSupabase(digest);
}

async function deleteSiteFromSupabase(digest) {
    const client = window.ReadifySupabase?.getClient();
    const user = window.ReadifyAuth?.getCurrentUser();
    
    if (!client || !user) {
        console.error('No client or user for Supabase delete');
        return;
    }
    
    try {
        const { error } = await client
            .from('user_sites')
            .delete()
            .eq('user_id', user.id)
            .eq('url_digest', digest);
        
        if (error) {
            console.error('Delete from Supabase error:', error);
        }
    } catch (e) {
        console.error('Delete from Supabase exception:', e);
    }
}

async function deleteSiteFromChromeLocal(digest) {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: async function(digest) {
                        const siteKey = `readify-site-${digest}`;
                        
                        // Remove site data from local storage
                        await chrome.storage.local.remove(siteKey);
                        
                        // Update global stats
                        const GLOBAL_STATS_KEY = 'readify-global-stats';
                        const result = await chrome.storage.local.get(GLOBAL_STATS_KEY);
                        const stats = result[GLOBAL_STATS_KEY] || {
                            totalSizeBytes: 0,
                            siteCount: 0,
                            sites: []
                        };
                        
                        // Remove site from list and update counts
                        stats.sites = stats.sites.filter(d => d !== digest);
                        stats.siteCount = stats.sites.length;
                        
                        // Recalculate total size by getting all remaining sites
                        const allData = await chrome.storage.local.get(null);
                        let totalSize = 0;
                        for (const [key, value] of Object.entries(allData)) {
                            if (key.startsWith('readify-site-') && value.sizeBytes) {
                                totalSize += value.sizeBytes;
                            }
                        }
                        stats.totalSizeBytes = totalSize;
                        
                        await chrome.storage.local.set({ [GLOBAL_STATS_KEY]: stats });
                    },
                    args: [digest]
                }, function() {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

function modifyDOM(action, boldPercent, skipWords, opacityLevel, color) {
    var elements = document.querySelectorAll("p,h1,h2,h3,h4,h5,h6,span.wrapped-text");
    elements.forEach(function (elem) {
        if (!elem.classList.contains("note-anchor")) {
            if (action === "increase") {
                elem.style.lineHeight = parseFloat(getComputedStyle(elem).lineHeight) + 3 + "px";
            } else if (action === "decrease") {
                elem.style.lineHeight = parseFloat(getComputedStyle(elem).lineHeight) - 3 + "px";
            }
        }
    });
}

document.getElementById("increase").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: modifyDOM,
            args: ["increase", 0, 0, 1, "black"],
        });
    });
});

document.getElementById("decrease").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: modifyDOM,
            args: ["decrease", 0, 0, 1, "black"],
        });
    });
});

// Study Mode Toggle
document.getElementById("enableCheckbox").addEventListener("change", async function(event) {
    const toggleLabel = event.target.closest('.modern-toggle');
    const toggleText = toggleLabel.querySelector('.toggle-text');
    
    if (event.target.checked) {
        // Check if study mode is allowed (within limit)
        const allowed = await checkStudyModeAllowed();
        if (!allowed) {
            // Revert the checkbox and show warning
            event.target.checked = false;
            
            const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
            if (!isAuthenticated) {
                alert('Please sign in to save your highlights. You can still use Study Mode, but changes won\'t be saved.');
            } else {
                alert('You have reached the maximum limit of 5 websites. Please delete some sites or upgrade to Premium for unlimited sites.');
            }
            return;
        }
    }
    
    toggleText.textContent = event.target.checked ? 'Disable Study Mode' : 'Enable Study Mode';
    
    // Save the extension state
    chrome.storage.sync.set({ extensionEnabled: event.target.checked });
    
    // Get current tab and send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggleExtension",
            enabled: event.target.checked
        });
    });
});

// Delete Changes Button
document.getElementById("deleteChangesButton").addEventListener("click", function() {
    // Show confirmation modal
    const modal = document.getElementById("confirmationModal");
    modal.style.display = "flex";
});

// Modal event listeners
document.getElementById("cancelBtn").addEventListener("click", function() {
    const modal = document.getElementById("confirmationModal");
    modal.style.display = "none";
    
    // Clear any pending site deletion
    if (window.pendingSiteDelete) {
        window.pendingSiteDelete = null;
        
        // Reset modal text back to default
        const modalTitle = modal.querySelector('.modal-title');
        const modalText = modal.querySelector('.modal-text');
        if (modalTitle) modalTitle.textContent = 'Delete All Changes';
        if (modalText) modalText.textContent = 'Are you sure you want to delete all changes on this page? This action cannot be undone.';
    }
});

document.getElementById("confirmBtn").addEventListener("click", function() {
    const modal = document.getElementById("confirmationModal");
    modal.style.display = "none";
    
    // Check if this is for individual site deletion
    if (window.pendingSiteDelete) {
        const digest = window.pendingSiteDelete;
        window.pendingSiteDelete = null; // Clear the pending deletion
        
        // Delete the individual site
        deleteSiteData(digest).then(() => {
            loadMySites(); // Refresh the list
            updateLimitDisplay(); // Update the limit counter
        }).catch(error => {
            console.error('Error deleting site:', error);
        });
        
        // Reset modal text back to default
        const modalTitle = modal.querySelector('.modal-title');
        const modalText = modal.querySelector('.modal-text');
        if (modalTitle) modalTitle.textContent = 'Delete All Changes';
        if (modalText) modalText.textContent = 'Are you sure you want to delete all changes on this page? This action cannot be undone.';
        
    } else {
        // This is for "Delete All Changes" button
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "deleteChanges"
            });
            
            // Refresh My Sites and limit display after a short delay to allow the delete to complete
            setTimeout(() => {
                loadMySites();
                updateLimitDisplay();
            }, 1000);
        });
    }
});

// Close modal when clicking outside
document.getElementById("confirmationModal").addEventListener("click", function(event) {
    if (event.target === this) {
        this.style.display = "none";
        
        // Clear any pending site deletion
        if (window.pendingSiteDelete) {
            window.pendingSiteDelete = null;
            
            // Reset modal text back to default
            const modalTitle = this.querySelector('.modal-title');
            const modalText = this.querySelector('.modal-text');
            if (modalTitle) modalTitle.textContent = 'Delete All Changes';
            if (modalText) modalText.textContent = 'Are you sure you want to delete all changes on this page? This action cannot be undone.';
        }
    }
}); 

// Website limit functions
async function getWebsiteLimit() {
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (!isAuthenticated) {
        // Not logged in - session only mode
        return { used: 0, max: 0, isPremium: false, isSessionOnly: true };
    }
    
    // All logged-in users get count from Supabase
    const siteCount = await getSiteCountFromSupabase();
    
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

async function getSiteCountFromSupabase() {
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

async function getSiteCountFromChromeLocal() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, function(allData) {
            if (chrome.runtime.lastError) {
                console.error('Error getting site count:', chrome.runtime.lastError);
                resolve(0);
                return;
            }
            
            let count = 0;
            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('readify-site-') && value.info) {
                    const changesCount = value.changes?.length || 0;
                    const notesCount = Object.keys(value.notes || {}).length;
                    if (changesCount > 0 || notesCount > 0) {
                        count++;
                    }
                }
            }
            resolve(count);
        });
    });
}

async function getSiteCountForPremium() {
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
            console.error('Error getting site count:', error);
            return 0;
        }
        
        return count || 0;
    } catch (e) {
        console.error('Exception getting site count:', e);
        return 0;
    }
}

async function syncSiteTracking() {
    // For the new system, this function is no longer needed since global stats
    // are automatically maintained in storage-manager.js
    // However, we'll keep it for backward compatibility and just return
    console.log('syncSiteTracking: Using new global stats system');
    return Promise.resolve();
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

// Note: Manual sync function removed - no longer needed with new storage system 