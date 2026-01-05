// Readify Extension - Sidepanel Auth Handlers
// Event handlers for authentication actions

function setupAuthListeners() {
    // Google Sign In button
    const googleSigninBtn = document.getElementById('googleSigninBtn');
    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', handleGoogleSignIn);
    }
    
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
        
        // Clear old cache and refresh
        if (typeof clearSitesCache === 'function') {
            clearSitesCache();
        }
        
        // Update UI
        await updateAuthUI();
        await loadMySites(true); // Force refresh after sign-in
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
    
    // Clear sites cache on sign-out
    if (typeof clearSitesCache === 'function') {
        clearSitesCache();
    }
    
    await updateAuthUI();
    await loadMySites(true); // Force refresh since we're signed out now
    await updateLimitDisplay();
}

async function handleGoogleSignIn() {
    const googleSigninBtn = document.getElementById('googleSigninBtn');
    const originalContent = googleSigninBtn.innerHTML;
    
    // Show loading state
    googleSigninBtn.disabled = true;
    googleSigninBtn.innerHTML = `
        <svg class="google-icon spinner" viewBox="0 0 24 24" width="18" height="18">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"/>
        </svg>
        <span>Signing in...</span>
    `;
    
    const result = await window.ReadifyAuth?.signInWithGoogle();
    
    // Restore button
    googleSigninBtn.disabled = false;
    googleSigninBtn.innerHTML = originalContent;
    
    if (result?.error) {
        // Show error message - use signin message element or create alert
        const messageEl = document.getElementById('signinMessage');
        if (messageEl) {
            // Expand signin form to show the message
            const authFormsContainer = document.getElementById('authFormsContainer');
            const signinForm = document.getElementById('signinForm');
            if (authFormsContainer) authFormsContainer.style.display = 'block';
            if (signinForm) signinForm.style.display = 'flex';
            showAuthMessage(messageEl, result.error.message || 'Google sign in failed', 'error');
        } else {
            alert(result.error.message || 'Google sign in failed');
        }
    } else {
        // Success - hide auth section and update UI
        document.getElementById('authSection').style.display = 'none';
        
        // Clear old cache and refresh
        if (typeof clearSitesCache === 'function') {
            clearSitesCache();
        }
        
        // Update UI
        await updateAuthUI();
        await loadMySites(true);
        await updateLimitDisplay();
    }
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

