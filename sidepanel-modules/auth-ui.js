// Readify Extension - Sidepanel Auth UI
// Handles authentication UI updates and state management

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
    const voiceSettingsSection = document.getElementById('voiceSettingsSection');
    const premiumBanner = document.getElementById('premiumBanner');
    const authFormsContainer = document.getElementById('authFormsContainer');
    
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (isAuthenticated) {
        // User is logged in
        // Hide auth section
        if (authSection) authSection.style.display = 'none';
        
        // Always show profile section when logged in
        if (userProfileSection) userProfileSection.style.display = 'block';
        
        // Show voice settings section
        if (voiceSettingsSection) {
            voiceSettingsSection.style.display = 'block';
            loadVoicePreference();
        }
        
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
        
        // Hide voice settings section
        if (voiceSettingsSection) voiceSettingsSection.style.display = 'none';
        
        // Show premium banner for non-logged in users
        if (premiumBanner) {
            premiumBanner.style.display = 'block';
        }
    }
}

// Load voice preference from storage
function loadVoicePreference() {
    const voiceSelector = document.getElementById('voiceSelector');
    if (!voiceSelector) return;
    
    chrome.storage.local.get(['ttsVoice'], (result) => {
        if (result.ttsVoice) {
            voiceSelector.value = result.ttsVoice;
        }
    });
}

// Save voice preference to storage
function saveVoicePreference(voice) {
    chrome.storage.local.set({ ttsVoice: voice });
}

// Initialize voice selector
function initVoiceSelector() {
    const voiceSelector = document.getElementById('voiceSelector');
    if (voiceSelector) {
        voiceSelector.addEventListener('change', (e) => {
            saveVoicePreference(e.target.value);
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

function showAuthMessage(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = 'auth-message ' + type;
}

