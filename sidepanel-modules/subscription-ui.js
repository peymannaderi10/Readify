// Readify Extension - Sidepanel Subscription UI
// Handles subscription display and management

async function updateSubscriptionUI() {
    const userEmail = document.getElementById('userEmail');
    const userPlan = document.getElementById('userPlan');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const cancelSubBtn = document.getElementById('cancelSubBtn');
    const subEndingBtn = document.getElementById('subEndingBtn');
    const premiumBanner = document.getElementById('premiumBanner');
    const limitCounter = document.getElementById('limitCounter');
    const voiceSettingsSection = document.getElementById('voiceSettingsSection');
    
    const user = window.ReadifyAuth?.getCurrentUser();
    if (userEmail && user) {
        userEmail.textContent = user.email || 'Unknown';
    }
    
    // Get subscription status
    if (window.ReadifySubscription) {
        const subscription = await window.ReadifySubscription.getStatus();
        
        // Update voice settings visibility (TTS is premium only)
        if (voiceSettingsSection) {
            if (subscription.isPremium) {
                voiceSettingsSection.style.display = 'block';
            } else {
                voiceSettingsSection.style.display = 'none';
            }
        }
        
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

function setupSubscriptionListeners() {
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

