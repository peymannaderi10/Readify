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
        
        // Check for migration
        if (window.ReadifyStorage?.needsMigration) {
            const needsMigration = await window.ReadifyStorage.needsMigration();
            if (needsMigration) {
                const isPremium = await window.ReadifySubscription?.isPremium();
                if (isPremium) {
                    await window.ReadifyStorage.migrateToCloud();
                    await loadMySites();
                }
            }
        }
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
        // Sync site tracking first to ensure all sites are properly listed
        await syncSiteTracking();
        
        // Small delay to ensure sync completes
        setTimeout(async () => {
            const sites = await getAllSavedSites();
            displaySites(sites);
        }, 100);
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
    // Check if user is premium - use Supabase
    if (window.ReadifySubscription) {
        const subscription = await window.ReadifySubscription.getStatus();
        if (subscription.isPremium) {
            return await getAllSitesFromSupabase();
        }
    }
    
    // Free users - use Chrome storage
    return await getAllSitesFromChromeStorage();
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

async function getAllSitesFromChromeStorage() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(null, function(allData) {
            if (chrome.runtime.lastError) {
                resolve([]);
                return;
            }
            
            const sites = [];
            const siteInfoKeys = Object.keys(allData).filter(key => key.startsWith('site-info-'));
            
            for (const siteInfoKey of siteInfoKeys) {
                const digest = siteInfoKey.replace('site-info-', '');
                const savedKey = `saved-${digest}`;
                
                if (allData[savedKey] && allData[savedKey].length > 0) {
                    sites.push({
                        digest: digest,
                        info: allData[siteInfoKey],
                        changeCount: allData[savedKey].length,
                        changes: allData[savedKey]
                    });
                }
            }
            
            // Sort by last modified
            sites.sort((a, b) => (b.info?.lastModified || 0) - (a.info?.lastModified || 0));
            resolve(sites);
        });
    });
}

// Helper function to delete site data
async function deleteSiteData(digest) {
    // Check if user is premium - delete from Supabase
    if (window.ReadifySubscription) {
        const subscription = await window.ReadifySubscription.getStatus();
        if (subscription.isPremium) {
            await deleteSiteFromSupabase(digest);
            return;
        }
    }
    
    // Free users - delete from Chrome storage
    await deleteSiteFromChromeStorage(digest);
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

async function deleteSiteFromChromeStorage(digest) {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: async function(digest) {
                        const siteInfoKey = `site-info-${digest}`;
                        const savedKey = `saved-${digest}`;
                        
                        // Remove site data
                        chrome.storage.sync.remove([siteInfoKey, savedKey]);
                        
                        // Remove from all sites list
                        const allSitesKey = 'readify-all-sites';
                        const allSites = await chrome.storage.sync.get(allSitesKey);
                        const siteDigests = allSites[allSitesKey] || [];
                        
                        const updatedDigests = siteDigests.filter(d => d !== digest);
                        chrome.storage.sync.set({ [allSitesKey]: updatedDigests });
                        
                        // Decrement the website limit counter
                        const limitResult = await chrome.storage.sync.get('websiteLimit');
                        const limit = limitResult.websiteLimit || { used: 0, max: 5 };
                        if (limit.used > 0) {
                            limit.used--;
                            await chrome.storage.sync.set({ websiteLimit: limit });
                        }
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
            alert('You have reached the maximum limit of 5 websites. Please delete some sites to continue using Study Mode.');
            return;
        }
    }
    
    toggleText.textContent = event.target.checked ? 'Disable Study Mode' : 'Enable Study Mode';
    
    // Save the extension state
    chrome.storage.sync.set({ extensionEnabled: event.target.checked });
    
    // Get current tab and send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "toggleExtension",
                enabled: event.target.checked
            }).catch(() => {});
        }
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
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "deleteChanges"
                }).catch(() => {});
            }
            
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
    // Check if user is premium
    if (window.ReadifySubscription) {
        const subscription = await window.ReadifySubscription.getStatus();
        if (subscription.isPremium) {
            // Premium users have unlimited sites - count from Supabase
            const siteCount = await getSiteCountForPremium();
            return { used: siteCount, max: Infinity, isPremium: true };
        }
    }
    
    // Free users - count from Chrome storage
    return new Promise((resolve) => {
        chrome.storage.sync.get('websiteLimit', function(result) {
            const limit = result.websiteLimit || { used: 0, max: 5 };
            limit.isPremium = false;
            resolve(limit);
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
    // Get all storage keys to find all sites
    chrome.storage.sync.get(null, function(allData) {
        const siteInfoKeys = Object.keys(allData).filter(key => key.startsWith('site-info-'));
        const savedKeys = Object.keys(allData).filter(key => key.startsWith('saved-'));
        
        // Find all site digests that have both site-info and saved data
        const validSiteDigests = [];
        
        siteInfoKeys.forEach(siteInfoKey => {
            const digest = siteInfoKey.replace('site-info-', '');
            const savedKey = `saved-${digest}`;
            
            // Check if this site has saved changes
            if (allData[savedKey] && allData[savedKey].length > 0) {
                validSiteDigests.push(digest);
            }
        });
        
        // Update the readify-all-sites array
        chrome.storage.sync.set({ 'readify-all-sites': validSiteDigests });
        
        // Update the website limit to match actual count
        const currentLimit = allData.websiteLimit || { used: 0, max: 5 };
        currentLimit.used = validSiteDigests.length;
        chrome.storage.sync.set({ websiteLimit: currentLimit });
        
        console.log(`Synced site tracking: Found ${validSiteDigests.length} sites`);
    });
}

async function updateLimitDisplay() {
    try {
        const limit = await getWebsiteLimit();
        const limitCounter = document.getElementById('limitCounter');
        
        if (limitCounter) {
            if (limit.isPremium) {
                // Premium users - show site count without limit
                limitCounter.textContent = limit.used > 0 ? `(${limit.used} sites)` : '';
                limitCounter.classList.remove('limit-reached');
                limitCounter.classList.add('premium-unlimited');
            } else {
                // Free users - show used/max format
                // Sync site tracking for free users
                await syncSiteTracking();
                
                // Small delay to ensure sync completes
                setTimeout(async () => {
                    const updatedLimit = await getWebsiteLimit();
                    limitCounter.textContent = `(${updatedLimit.used}/${updatedLimit.max})`;
                    if (updatedLimit.used >= updatedLimit.max) {
                        limitCounter.classList.add('limit-reached');
                    } else {
                        limitCounter.classList.remove('limit-reached');
                    }
                    limitCounter.classList.remove('premium-unlimited');
                }, 100);
            }
        }
    } catch (error) {
        console.error('Error updating limit display:', error);
    }
}

async function checkStudyModeAllowed() {
    const limit = await getWebsiteLimit();
    return limit.used < limit.max;
} 

// Manual sync function to fix inconsistent state - can be called from console
window.fixSiteTracking = function() {
    chrome.storage.sync.get(null, function(allData) {
        console.log('Current storage data:', allData);
        
        const siteInfoKeys = Object.keys(allData).filter(key => key.startsWith('site-info-'));
        const savedKeys = Object.keys(allData).filter(key => key.startsWith('saved-'));
        
        console.log('Found site-info keys:', siteInfoKeys);
        console.log('Found saved keys:', savedKeys);
        
        // Find all site digests that have both site-info and saved data
        const validSiteDigests = [];
        
        siteInfoKeys.forEach(siteInfoKey => {
            const digest = siteInfoKey.replace('site-info-', '');
            const savedKey = `saved-${digest}`;
            
            console.log(`Checking digest ${digest}:`, {
                hasSiteInfo: !!allData[siteInfoKey],
                hasSaved: !!allData[savedKey],
                savedLength: allData[savedKey] ? allData[savedKey].length : 0
            });
            
            // Check if this site has saved changes
            if (allData[savedKey] && allData[savedKey].length > 0) {
                validSiteDigests.push(digest);
            }
        });
        
        console.log('Valid site digests:', validSiteDigests);
        
        // Update the readify-all-sites array
        chrome.storage.sync.set({ 'readify-all-sites': validSiteDigests }, function() {
            console.log('Updated readify-all-sites to:', validSiteDigests);
        });
        
        // Update the website limit to match actual count
        const currentLimit = allData.websiteLimit || { used: 0, max: 5 };
        currentLimit.used = validSiteDigests.length;
        chrome.storage.sync.set({ websiteLimit: currentLimit }, function() {
            console.log('Updated websiteLimit to:', currentLimit);
        });
        
        // Refresh the UI
        setTimeout(() => {
            loadMySites();
            updateLimitDisplay();
        }, 200);
    });
};

// ============================================
// AI CHAT PANEL
// ============================================

let chatMessages = [];
let chatIsLoading = false;
let currentPageContent = null;

// ============================================
// OPENAI REALTIME API - Voice Mode State
// ============================================
let realtimeWs = null;           // WebSocket connection
let realtimeActive = false;      // Is voice mode active?
let realtimeAudioContext = null; // AudioContext for playback
let realtimeMicStream = null;    // Microphone stream
let realtimeScriptProcessor = null; // For PCM encoding
let realtimeAudioQueue = [];     // Queue of audio chunks to play
let realtimeIsPlaying = false;   // Is AI currently speaking?
let realtimeNextPlayTime = 0;    // For gapless playback
let realtimeActiveSources = [];  // Track scheduled audio sources for stopping
let realtimeResponseActive = false; // Track if API has an active response

// Initialize chat panel listeners
document.addEventListener('DOMContentLoaded', function() {
    setupChatListeners();
});

function setupChatListeners() {
    const openChatBtn = document.getElementById('openChatBtn');
    const chatBackBtn = document.getElementById('chatBackBtn');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const chatVoiceBtn = document.getElementById('chatVoiceBtn');
    const voiceOverlay = document.getElementById('voiceOverlay');
    const voiceStopBtn = document.getElementById('voiceStopBtn');
    const voiceText = document.getElementById('voiceText');
    
    if (openChatBtn) {
        openChatBtn.addEventListener('click', openChatPanel);
    }
    
    if (chatBackBtn) {
        chatBackBtn.addEventListener('click', closeChatPanel);
    }
    
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendChatMessage);
    }

    if (chatVoiceBtn) {
        chatVoiceBtn.addEventListener('click', toggleVoiceMode);
    }

    if (voiceOverlay) {
        voiceOverlay.addEventListener('click', stopRealtimeVoice);
    }

    if (voiceStopBtn) {
        voiceStopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stopRealtimeVoice();
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        
        // Auto-resize textarea up to max height, then scroll
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            const maxHeight = 120;
            if (chatInput.scrollHeight > maxHeight) {
                chatInput.style.height = maxHeight + 'px';
                chatInput.style.overflowY = 'auto';
            } else {
                chatInput.style.height = chatInput.scrollHeight + 'px';
                chatInput.style.overflowY = 'hidden';
            }
        });
    }
    
    // Suggestion button clicks
    if (chatMessages) {
        chatMessages.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-suggestion')) {
                const prompt = e.target.dataset.prompt;
                if (prompt && chatInput) {
                    chatInput.value = prompt;
                    sendChatMessage();
                }
            }
        });
    }
}

async function openChatPanel() {
    // Check premium access (unless testing mode)
    const config = window.READIFY_CONFIG;
    if (config && config.TESTING_MODE !== true) {
        // Check if user has premium access
        if (window.ReadifySubscription) {
            const canAccess = await window.ReadifySubscription.canAccessFeature('summarize');
            if (!canAccess) {
                alert('AI Chat is a premium feature. Please upgrade to access it.');
                return;
            }
        }
    }
    
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) {
        chatPanel.classList.add('open');
        
        // Extract page content from current tab
        await extractCurrentPageContent();
    }
}

function closeChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) {
        chatPanel.classList.remove('open');
    }
    stopRealtimeVoice();
}

async function extractCurrentPageContent() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            updateWelcomeMessage('Unable to access page content', '');
            return;
        }
        
        // Execute script to extract page content
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const title = document.title || 'Untitled Page';
                
                // Get main content
                const contentSelectors = ['article', 'main', '[role="main"]', '.content', '#content', '.post'];
                let mainContent = null;
                
                for (const selector of contentSelectors) {
                    const el = document.querySelector(selector);
                    if (el && el.innerText.length > 500) {
                        mainContent = el;
                        break;
                    }
                }
                
                if (!mainContent) {
                    mainContent = document.body;
                }
                
                // Clone and clean
                const clone = mainContent.cloneNode(true);
                ['script', 'style', 'nav', 'header', 'footer', 'aside', '.sidebar', '.menu', '.ad', 'iframe']
                    .forEach(sel => clone.querySelectorAll(sel).forEach(el => el.remove()));
                
                let text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
                
                // Limit content (very large for long articles like Wikipedia)
                if (text.length > 120000) {
                    text = text.substring(0, 120000) + '... [truncated]';
                }
                
                return { title, url: window.location.href, content: text };
            }
        });
        
        if (results && results[0] && results[0].result) {
            currentPageContent = results[0].result;
            console.log('[Readify] Page content extracted:', {
                title: currentPageContent.title,
                url: currentPageContent.url,
                contentLength: currentPageContent.content?.length || 0,
                contentPreview: currentPageContent.content?.substring(0, 200) + '...'
            });
            const shortTitle = currentPageContent.title.length > 40 
                ? currentPageContent.title.substring(0, 40) + '...' 
                : currentPageContent.title;
            updateWelcomeMessage(`I've read "${shortTitle}"`, 'Ask me anything about it!');
        } else {
            console.warn('[Readify] Page content extraction returned empty result');
        }
    } catch (error) {
        console.error('[Readify] Error extracting page content:', error);
        updateWelcomeMessage('Unable to read page content', 'The page may be restricted.');
    }
}

function updateWelcomeMessage(title, subtitle) {
    const welcomeText = document.getElementById('chatWelcomeText');
    if (welcomeText) {
        welcomeText.innerHTML = `<strong>${title}</strong><br>${subtitle}`;
    }
}

function parseMarkdown(text) {
    // Escape HTML
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+?)_/g, '<em>$1</em>');
    
    // Code
    html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
    
    // Bullet points
    const lines = html.split('\n');
    let inList = false;
    let result = [];
    
    for (let line of lines) {
        const bulletMatch = line.match(/^(\s*)[-•]\s+(.+)$/);
        if (bulletMatch) {
            if (!inList) {
                result.push('<ul>');
                inList = true;
            }
            result.push(`<li>${bulletMatch[2]}</li>`);
        } else {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            if (line.trim()) {
                result.push(`<p>${line}</p>`);
            }
        }
    }
    
    if (inList) result.push('</ul>');
    
    return result.join('');
}

function addChatMessage(content, role) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    // Remove welcome
    const welcome = document.getElementById('chatWelcome');
    if (welcome) welcome.remove();
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${role}`;
    
    if (role === 'assistant') {
        messageEl.innerHTML = parseMarkdown(content);
    } else {
        messageEl.textContent = content;
    }
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatMessages.push({ role, content });
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'chatTyping';
    typing.innerHTML = `
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
    `;
    
    messagesContainer.appendChild(typing);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const typing = document.getElementById('chatTyping');
    if (typing) typing.remove();
}

// ============================================
// OPENAI REALTIME API - Voice Mode Functions
// ============================================

function toggleVoiceMode() {
    if (realtimeActive) {
        stopRealtimeVoice();
    } else {
        startRealtimeVoice();
    }
}

async function startRealtimeVoice() {
    const overlay = document.getElementById('voiceOverlay');
    const voiceLabel = document.getElementById('voiceText');
    if (!overlay) return;
    
    realtimeActive = true;
    overlay.classList.add('active');
    if (voiceLabel) voiceLabel.textContent = 'Connecting...';
    
    try {
        // Get microphone access first
        realtimeMicStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                sampleRate: 24000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        // Connect to OpenAI Realtime API
        await connectRealtimeSession();
        
        // Start streaming audio to the API
        await startAudioCapture();
        
        if (voiceLabel) voiceLabel.textContent = 'Listening... (speak anytime)';
        
    } catch (err) {
        console.error('[Realtime] Setup error:', err);
        stopRealtimeVoice();
        addChatMessage(
            'Voice mode failed to start: ' + (err.message || 'Unknown error') + '\n' +
            'Please check microphone permissions.',
            'system'
        );
    }
}

function stopRealtimeVoice() {
    const overlay = document.getElementById('voiceOverlay');
    const voiceLabel = document.getElementById('voiceText');
    
    realtimeActive = false;
    if (overlay) overlay.classList.remove('active');
    if (voiceLabel) voiceLabel.textContent = 'Speak naturally. Tap to stop.';
    
    // Stop all audio playback first
    stopRealtimePlayback();
    
    // Reset state flags
    realtimeResponseActive = false;
    
    // Close WebSocket
    if (realtimeWs) {
        try {
            realtimeWs.close();
        } catch (e) {}
        realtimeWs = null;
    }
    
    // Stop microphone
    if (realtimeMicStream) {
        realtimeMicStream.getTracks().forEach(t => t.stop());
        realtimeMicStream = null;
    }
    
    // Stop and disconnect worklet
    if (realtimeScriptProcessor) {
        realtimeScriptProcessor.disconnect();
        realtimeScriptProcessor = null;
    }
    
    // Close audio context
    if (realtimeAudioContext) {
        realtimeAudioContext.close().catch(() => {});
        realtimeAudioContext = null;
    }
    
    console.log('[Realtime] Voice mode stopped');
}

async function connectRealtimeSession() {
    const config = window.READIFY_CONFIG || {};
    const apiKey = config.OPENAI_API_KEY;
    const realtimeConfig = config.AI_REALTIME || {};
    const model = realtimeConfig.MODEL || 'gpt-4o-realtime-preview-2024-12-17';
    
    if (!apiKey || apiKey.startsWith('YOUR_')) {
        throw new Error('OpenAI API key not configured');
    }
    
    return new Promise((resolve, reject) => {
        const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;
        
        realtimeWs = new WebSocket(wsUrl, [
            'realtime',
            `openai-insecure-api-key.${apiKey}`,
            'openai-beta.realtime-v1'
        ]);
        
        realtimeWs.onopen = () => {
            console.log('[Realtime] WebSocket connected');
            
            // Initialize playback audio context if needed
            if (!realtimeAudioContext || realtimeAudioContext.state === 'closed') {
                realtimeAudioContext = new AudioContext({ sampleRate: 24000 });
            }
            
            // Initialize playback timing
            realtimeNextPlayTime = realtimeAudioContext.currentTime;
            
            // Configure the session with page context
            const sessionConfig = buildSessionConfig();
            console.log('[Realtime] Sending session config...');
            realtimeWs.send(JSON.stringify(sessionConfig));
            
            resolve();
        };
        
        realtimeWs.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleRealtimeMessage(message);
            } catch (e) {
                console.error('[Realtime] Message parse error:', e);
            }
        };
        
        realtimeWs.onerror = (err) => {
            console.error('[Realtime] WebSocket error:', err);
            reject(new Error('WebSocket connection failed'));
        };
        
        realtimeWs.onclose = (event) => {
            console.log('[Realtime] WebSocket closed:', event.code, event.reason);
            if (realtimeActive) {
                stopRealtimeVoice();
            }
        };
    });
}

function buildSessionConfig() {
    const config = window.READIFY_CONFIG || {};
    const realtimeConfig = config.AI_REALTIME || {};
    const voice = realtimeConfig.VOICE || 'alloy';
    
    // Build system prompt with page context
    let instructions = 'You are a helpful voice assistant. Be concise and conversational. Give brief answers (1-3 sentences) unless asked for more detail.';
    
    if (currentPageContent && currentPageContent.content) {
        instructions = `You are a reading assistant having a voice conversation. Answer questions using ONLY the webpage content below.

RULES:
1. Be CONCISE - give brief, conversational answers (1-3 sentences).
2. Only use information from the page content.
3. If something is not in the content, say "I don't see that on this page."
4. Speak naturally, as if having a conversation.

WEBPAGE: ${currentPageContent.title}
URL: ${currentPageContent.url}

CONTENT:
${currentPageContent.content.substring(0, 50000)}`;
    }
    
    return {
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: instructions,
            voice: voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
                model: 'whisper-1'
            },
            turn_detection: {
                type: 'server_vad',
                threshold: realtimeConfig.VAD_THRESHOLD || 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: realtimeConfig.SILENCE_DURATION_MS || 500
            }
        }
    };
}

// ============================================
// REALTIME API - Audio Capture (PCM Encoder)
// ============================================

async function startAudioCapture() {
    if (!realtimeMicStream || !realtimeWs) return;
    
    // Use existing audio context or create new one at 24kHz
    if (!realtimeAudioContext || realtimeAudioContext.state === 'closed') {
        realtimeAudioContext = new AudioContext({ sampleRate: 24000 });
    }
    
    const source = realtimeAudioContext.createMediaStreamSource(realtimeMicStream);
    
    try {
        // Load AudioWorklet module
        const workletUrl = chrome.runtime.getURL('realtime-worklet.js');
        await realtimeAudioContext.audioWorklet.addModule(workletUrl);
        
        // Create worklet node
        const workletNode = new AudioWorkletNode(realtimeAudioContext, 'realtime-audio-processor');
        
        // Listen for PCM data from worklet
        workletNode.port.onmessage = (event) => {
            if (!realtimeActive || !realtimeWs || realtimeWs.readyState !== WebSocket.OPEN) {
                return;
            }
            
            // event.data is Int16Array buffer
            const base64Audio = arrayBufferToBase64(event.data);
            
            // Send to Realtime API
            realtimeWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64Audio
            }));
        };
        
        // Connect audio graph
        source.connect(workletNode);
        workletNode.connect(realtimeAudioContext.destination);
        
        // Store reference for cleanup
        realtimeScriptProcessor = workletNode;
        
        console.log('[Realtime] Audio capture started with AudioWorklet');
        
    } catch (err) {
        console.error('[Realtime] AudioWorklet setup failed:', err);
        throw err;
    }
}


function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ============================================
// REALTIME API - Message Handler
// ============================================

function handleRealtimeMessage(message) {
    const voiceLabel = document.getElementById('voiceText');
    
    switch (message.type) {
        case 'session.created':
            console.log('[Realtime] Session created');
            break;
            
        case 'session.updated':
            console.log('[Realtime] Session configured');
            break;
            
        case 'input_audio_buffer.speech_started':
            console.log('[Realtime] User started speaking, responseActive:', realtimeResponseActive);
            if (voiceLabel) voiceLabel.textContent = 'Listening...';
            // Cancel any ongoing AI response when user interrupts
            if (realtimeResponseActive && realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                console.log('[Realtime] Cancelling AI response due to user speech');
                try {
                    realtimeWs.send(JSON.stringify({ type: 'response.cancel' }));
                } catch (e) {
                    console.warn('[Realtime] Cancel send failed:', e);
                }
            }
            // Always stop local playback immediately, even if API cancel fails
            stopRealtimePlayback();
            break;
            
        case 'input_audio_buffer.speech_stopped':
            console.log('[Realtime] User stopped speaking');
            if (voiceLabel) voiceLabel.textContent = 'Processing...';
            // Mark that we're expecting a response
            realtimeResponseActive = true;
            break;
            
        case 'conversation.item.input_audio_transcription.completed':
            // User's speech was transcribed
            const userTranscript = message.transcript;
            if (userTranscript && userTranscript.trim()) {
                console.log('[Realtime] User said:', userTranscript);
                addChatMessage(userTranscript.trim(), 'user');
            }
            break;
            
        case 'response.audio_transcript.delta':
            // AI response text (streaming)
            // We could accumulate this for display
            break;
            
        case 'response.audio_transcript.done':
            // AI finished speaking - add to chat
            const aiTranscript = message.transcript;
            if (aiTranscript && aiTranscript.trim()) {
                console.log('[Realtime] AI said:', aiTranscript);
                addChatMessage(aiTranscript.trim(), 'assistant');
            }
            break;
            
        case 'response.created':
            console.log('[Realtime] Response created');
            realtimeResponseActive = true;
            break;
            
        case 'response.audio.delta':
            // Streaming audio chunk from AI
            console.log('[Realtime] Audio delta received, delta field exists:', !!message.delta);
            if (message.delta) {
                playAudioChunk(message.delta);
            }
            break;
            
        case 'response.audio.done':
            console.log('[Realtime] AI audio complete');
            realtimeIsPlaying = false;
            break;
            
        case 'response.done':
            console.log('[Realtime] Response complete');
            realtimeIsPlaying = false;
            realtimeResponseActive = false;
            // Reset playback timing for next response
            if (realtimeAudioContext && realtimeAudioContext.state !== 'closed') {
                realtimeNextPlayTime = realtimeAudioContext.currentTime;
            }
            if (voiceLabel && realtimeActive) {
                voiceLabel.textContent = 'Listening... (speak anytime)';
            }
            break;
            
        case 'response.cancelled':
            console.log('[Realtime] Response cancelled');
            realtimeResponseActive = false;
            break;
            
        case 'error':
            console.error('[Realtime] API error:', JSON.stringify(message.error));
            
            // If it's a cancellation error, the response wasn't active anyway
            if (message.error?.code === 'response_cancel_not_active') {
                realtimeResponseActive = false;
                // Don't show to user, just log
            } else if (message.error?.message) {
                addChatMessage('Error: ' + message.error.message, 'system');
            }
            break;
            
        default:
            // Log other message types for debugging
            if (message.type && !message.type.includes('delta')) {
                console.log('[Realtime] Message:', message.type);
            }
            // Log full message for audio-related events
            if (message.type && message.type.includes('audio')) {
                console.log('[Realtime] Full audio message:', JSON.stringify(message).substring(0, 200));
            }
    }
}

// ============================================
// REALTIME API - Streaming Audio Playback
// ============================================

async function playAudioChunk(base64Audio) {
    if (!realtimeActive) return;
    
    try {
        const voiceLabel = document.getElementById('voiceText');
        if (voiceLabel) voiceLabel.textContent = 'AI is speaking...';
        
        realtimeIsPlaying = true;
        
        // Decode base64 to PCM16
        const arrayBuffer = base64ToArrayBuffer(base64Audio);
        const int16Array = new Int16Array(arrayBuffer);
        
        console.log('[Realtime] Playing audio chunk, samples:', int16Array.length);
        
        // Convert Int16 to Float32 for Web Audio
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }
        
        // Create audio buffer (24kHz, mono)
        if (!realtimeAudioContext || realtimeAudioContext.state === 'closed') {
            realtimeAudioContext = new AudioContext({ sampleRate: 24000 });
        }
        
        // Resume if suspended
        if (realtimeAudioContext.state === 'suspended') {
            await realtimeAudioContext.resume();
        }
        
        const audioBuffer = realtimeAudioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);
        
        // Schedule for gapless playback
        const source = realtimeAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(realtimeAudioContext.destination);
        
        const currentTime = realtimeAudioContext.currentTime;
        const startTime = Math.max(currentTime, realtimeNextPlayTime);
        
        // Track this source so we can stop it on interruption
        realtimeActiveSources.push(source);
        
        // Remove from tracking when it ends
        source.onended = () => {
            const index = realtimeActiveSources.indexOf(source);
            if (index > -1) {
                realtimeActiveSources.splice(index, 1);
            }
        };
        
        source.start(startTime);
        realtimeNextPlayTime = startTime + audioBuffer.duration;
        
        console.log('[Realtime] Audio chunk scheduled at', startTime, 'active sources:', realtimeActiveSources.length);
    } catch (e) {
        console.error('[Realtime] Audio playback error:', e);
    }
}

function stopRealtimePlayback() {
    console.log('[Realtime] Stopping playback, active sources:', realtimeActiveSources.length);
    
    // Stop all scheduled audio sources immediately
    realtimeActiveSources.forEach(source => {
        try {
            source.stop();
            source.disconnect();
        } catch (e) {
            // Source may have already finished or been stopped
        }
    });
    realtimeActiveSources = [];
    
    realtimeIsPlaying = false;
    realtimeAudioQueue = [];
    
    // Reset playback timing to current time
    if (realtimeAudioContext && realtimeAudioContext.state !== 'closed') {
        realtimeNextPlayTime = realtimeAudioContext.currentTime;
    } else {
        realtimeNextPlayTime = 0;
    }
    
    console.log('[Realtime] Playback stopped, nextPlayTime reset to:', realtimeNextPlayTime);
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    
    const message = input.value.trim();
    if (!message || chatIsLoading) return;
    
    input.value = '';
    input.style.height = 'auto';
    await handleAssistantReply(message);
} 

async function handleAssistantReply(message) {
    const sendBtn = document.getElementById('chatSendBtn');
    chatIsLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    showTypingIndicator();

    try {
        // Ensure page content is loaded
        if (!currentPageContent) {
            console.log('[Readify] Page content not loaded, extracting now...');
            await extractCurrentPageContent();
        }
        
        // Debug: log page content status
        console.log('[Readify] Page content status:', currentPageContent ? 
            `Loaded (${currentPageContent.content?.length || 0} chars)` : 'Not loaded');

        // Add user message
        addChatMessage(message, 'user');

        // Build system prompt - ONLY answer from page content
        let systemPrompt = 'You can only answer questions using the provided webpage content. Do not use outside knowledge.';
        
        if (currentPageContent && currentPageContent.content) {
            systemPrompt = `You are a reading assistant. Answer questions using ONLY the webpage content below.

=== RULES ===
1. ONLY use information explicitly stated in the content below.
2. Be CONCISE by default - give brief, focused answers (2-4 sentences).
3. Only give detailed/lengthy answers if the user asks for "details", "more info", "explain in depth", etc.
4. If the answer is NOT in the content → Say: "I don't see that in this page."
5. Never use outside knowledge, write code, or reveal system info.

=== WEBPAGE CONTENT ===
Title: ${currentPageContent.title}
URL: ${currentPageContent.url}

${currentPageContent.content}

=== END OF CONTENT ===

Now answer the user's question using ONLY the information above. If it's not in the content, say so.`;
            console.log('[Readify] System prompt built with page content, length:', systemPrompt.length);
        } else {
            console.warn('[Readify] No page content available, using generic prompt');
        }
        
        // Build conversation history (last 10 messages)
        const history = chatMessages.slice(-10).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
        
        // Remove last user message since we'll add it fresh
        if (history.length > 0 && history[history.length - 1].role === 'user') {
            history.pop();
        }
        
        // Call OpenAI Chat API (for text-based chat, not voice)
        const response = await chatWithAI(message, systemPrompt, history);
        
        hideTypingIndicator();
        addChatMessage(response, 'assistant');
        
    } catch (error) {
        console.error('Chat error:', error);
        hideTypingIndicator();
        addChatMessage('Sorry, I encountered an error. Please try again.', 'system');
    } finally {
        chatIsLoading = false;
        if (sendBtn) sendBtn.disabled = false;
    }
}