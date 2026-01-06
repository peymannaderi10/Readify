// Readify Extension - Storage UI Components
// UI elements for storage-related notifications and prompts

// Show session-only notice for non-logged-in users
let sessionNoticeShown = false;
function showSessionOnlyNotice() {
    // Only show once per session
    if (sessionNoticeShown) return;
    sessionNoticeShown = true;
    
    const existingNotice = document.querySelector('#readify-session-notice');
    if (existingNotice) return;
    
    const notice = document.createElement('div');
    notice.id = 'readify-session-notice';
    notice.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        max-width: 320px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideIn 0.3s ease-out;
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    notice.innerHTML = `
        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="font-size: 24px;">💡</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">Session Only Mode</div>
                <div style="font-size: 12px; opacity: 0.85; line-height: 1.4;">
                    Your changes won't be saved after refresh. 
                    Sign in to save your highlights permanently.
                </div>
            </div>
            <button id="readify-dismiss-notice" style="
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.5);
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                line-height: 1;
            ">×</button>
        </div>
    `;
    
    document.body.appendChild(notice);
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (notice.parentNode) {
            notice.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notice.remove(), 300);
        }
    }, 8000);
    
    // Manual dismiss
    document.getElementById('readify-dismiss-notice')?.addEventListener('click', () => {
        notice.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notice.remove(), 300);
    });
    
    // Sign in link
    document.getElementById('readify-signin-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        notice.remove();
        chrome.runtime.sendMessage({ type: 'openSidepanel' }).catch(() => {});
    });
}

// Show upgrade prompt for premium features
function showUpgradePrompt(feature) {
    // Check if user is authenticated
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    const featureContent = {
        'website_limit': {
            icon: '📚',
            title: 'Site Limit Reached',
            message: 'You\'ve reached the free limit of 5 websites. Upgrade to Premium for unlimited sites!',
            signInMessage: 'Please sign in as a premium user to save more than 5 websites.'
        },
        'storage_limit': {
            icon: '💾',
            title: 'Storage Full',
            message: 'You\'ve reached the 10MB storage limit. Upgrade to Premium for unlimited storage!',
            signInMessage: 'Please sign in as a premium user for unlimited storage.'
        },
        'tts': {
            icon: '🔊',
            title: 'Limit Reached',
            message: 'You\'ve used all your tokens this month. Upgrade to Premium for 500k tokens/month!',
            signInMessage: 'Please sign in to use Text-to-Speech. Free users get 5,000 tokens/month!'
        },
        'default': {
            icon: '⚡',
            title: 'Limit Reached',
            message: 'You\'ve used all your tokens this month. Upgrade to Premium for more!',
            signInMessage: 'Please sign in to use this feature.'
        }
    };
    
    const content = featureContent[feature] || featureContent['default'];
    const displayMessage = isAuthenticated ? content.message : content.signInMessage;
    
    // Create overlay
    const existingOverlay = document.querySelector('#readify-upgrade-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'readify-upgrade-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
    `;
    
    // Create prompt modal
    const prompt = document.createElement('div');
    prompt.id = 'readify-upgrade-prompt';
    prompt.style.cssText = `
        position: relative;
        background: #ffffff;
        padding: 32px;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1);
        z-index: 10002;
        max-width: 380px;
        width: 90%;
        text-align: center;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border: 1px solid rgba(0, 151, 255, 0.1);
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Add animation styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;
    document.head.appendChild(styleSheet);
    
    prompt.innerHTML = `
        <button id="readify-close-x" style="
            position: absolute;
            top: 16px;
            right: 16px;
            background: transparent;
            border: none;
            font-size: 20px;
            color: #9ca3af;
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s ease;
            line-height: 1;
        ">×</button>
        
        <div style="
            width: 72px;
            height: 72px;
            margin: 0 auto 20px;
            background: linear-gradient(135deg, rgba(0, 151, 255, 0.1) 0%, rgba(0, 180, 255, 0.1) 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
        ">${content.icon}</div>
        
        <h3 style="
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: 700;
            color: #1a202c;
            line-height: 1.2;
        ">${content.title}</h3>
        
        <p style="
            margin: 0 0 24px 0;
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
            max-width: 300px;
            margin-left: auto;
            margin-right: auto;
        ">${displayMessage}</p>
        
        <div style="
            display: inline-block;
            padding: 8px 16px;
            background: rgba(0, 151, 255, 0.08);
            border-radius: 20px;
            margin-bottom: 24px;
            border: 1px solid rgba(0, 151, 255, 0.15);
        ">
            <span style="
                font-size: 12px;
                font-weight: 600;
                color: #0097ff;
                letter-spacing: 0.3px;
            ">${isAuthenticated ? '⚡ Limit Reached' : '🔐 Sign In Required'}</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${isAuthenticated ? `
                <button id="readify-upgrade-btn" style="
                    width: 100%;
                    background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
                    color: white;
                    border: none;
                    padding: 14px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 15px;
                    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                ">✨ Upgrade Now</button>
                <button id="readify-close-upgrade" style="
                    width: 100%;
                    background: transparent;
                    color: #6b7280;
                    border: 2px solid rgba(0, 151, 255, 0.15);
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 14px;
                    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                ">Maybe Later</button>
            ` : `
                <button id="readify-signin-btn" style="
                    width: 100%;
                    background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
                    color: white;
                    border: none;
                    padding: 14px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 15px;
                    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                ">👤 Sign In</button>
                <button id="readify-close-upgrade" style="
                    width: 100%;
                    background: transparent;
                    color: #6b7280;
                    border: 2px solid rgba(0, 151, 255, 0.15);
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 14px;
                    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                ">Close</button>
            `}
        </div>
    `;
    
    overlay.appendChild(prompt);
    document.body.appendChild(overlay);
    
    // Get button elements
    const upgradeBtn = document.getElementById('readify-upgrade-btn');
    const signInBtn = document.getElementById('readify-signin-btn');
    const closeBtn = document.getElementById('readify-close-upgrade');
    const closeX = document.getElementById('readify-close-x');
    
    // Primary button (upgrade or sign in) - add hover effects
    const primaryBtn = upgradeBtn || signInBtn;
    if (primaryBtn) {
        primaryBtn.addEventListener('mouseenter', function() {
            this.style.background = 'linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 20px rgba(0, 151, 255, 0.4)';
        });
        primaryBtn.addEventListener('mouseleave', function() {
            this.style.background = 'linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(0, 151, 255, 0.3)';
        });
    }
    
    closeBtn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(0, 151, 255, 0.05)';
        this.style.borderColor = 'rgba(0, 151, 255, 0.3)';
        this.style.color = '#0097ff';
    });
    closeBtn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.borderColor = 'rgba(0, 151, 255, 0.15)';
        this.style.color = '#6b7280';
    });
    
    closeX.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        this.style.color = '#374151';
    });
    closeX.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.color = '#9ca3af';
    });
    
    // Close modal function
    const closeModal = () => {
        overlay.style.opacity = '0';
        prompt.style.transform = 'translateY(10px) scale(0.95)';
        prompt.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };
    
    // Add event listeners
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', async () => {
            closeModal();
            if (window.ReadifySubscription) {
                await window.ReadifySubscription.createCheckoutSession();
            } else {
                // Fallback: Open sidepanel
                chrome.runtime.sendMessage({ type: 'openSidepanel' });
            }
        });
    }
    
    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            closeModal();
            // Open sidepanel and scroll to top for sign in
            chrome.runtime.sendMessage({ type: 'openSidepanel' }).then(() => {
                // Send message to scroll sidepanel to top
                chrome.runtime.sendMessage({ type: 'scrollSidepanelToTop' });
            }).catch(() => {
                // Fallback if sendMessage fails
            });
        });
    }
    
    closeBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
}

