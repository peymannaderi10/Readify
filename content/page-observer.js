// Readify Extension - Page Observer
// Monitors for context changes: URL changes, SPA navigation, infinite scroll
// Notifies the sidepanel when page context changes

(function() {
    'use strict';

    // Track current state
    let lastUrl = window.location.href;
    let lastTitle = document.title;

    // Debounce timer for rapid changes
    let debounceTimer = null;
    const DEBOUNCE_MS = 100;

    /**
     * Send context change notification to background/sidepanel
     */
    function notifyContextChange(reason) {
        const newUrl = window.location.href;
        const newTitle = document.title;

        // Only notify if something actually changed
        if (newUrl === lastUrl && newTitle === lastTitle) {
            return;
        }

        console.log('[Readify Observer] Context changed:', reason, {
            oldUrl: lastUrl,
            newUrl: newUrl,
            oldTitle: lastTitle,
            newTitle: newTitle
        });

        // Debounce rapid changes (e.g., infinite scroll)
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            try {
                chrome.runtime.sendMessage({
                    type: 'contextChanged',
                    reason: reason,
                    url: newUrl,
                    title: newTitle,
                    previousUrl: lastUrl,
                    previousTitle: lastTitle
                });
            } catch (e) {
                // Extension context may be invalidated
                console.log('[Readify Observer] Could not send message:', e.message);
            }

            // Update tracked state
            lastUrl = newUrl;
            lastTitle = newTitle;
        }, DEBOUNCE_MS);
    }

    /**
     * Intercept History API methods (pushState, replaceState)
     * This catches SPA navigation and infinite scroll URL changes
     */
    function interceptHistoryAPI() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            const result = originalPushState.apply(this, args);
            notifyContextChange('pushState');
            return result;
        };

        history.replaceState = function(...args) {
            const result = originalReplaceState.apply(this, args);
            notifyContextChange('replaceState');
            return result;
        };
    }

    /**
     * Listen for popstate events (back/forward navigation)
     */
    function listenPopstate() {
        window.addEventListener('popstate', () => {
            notifyContextChange('popstate');
        });
    }

    /**
     * Monitor document title changes using MutationObserver
     */
    function observeTitleChanges() {
        const titleElement = document.querySelector('title');
        if (!titleElement) {
            // If no title element, watch for it to be created
            const headObserver = new MutationObserver((mutations) => {
                const titleEl = document.querySelector('title');
                if (titleEl) {
                    headObserver.disconnect();
                    setupTitleObserver(titleEl);
                }
            });

            if (document.head) {
                headObserver.observe(document.head, { childList: true });
            }
            return;
        }

        setupTitleObserver(titleElement);
    }

    function setupTitleObserver(titleElement) {
        const observer = new MutationObserver(() => {
            if (document.title !== lastTitle) {
                notifyContextChange('titleChange');
            }
        });

        observer.observe(titleElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    /**
     * Listen for hashchange events (anchor navigation)
     */
    function listenHashChange() {
        window.addEventListener('hashchange', () => {
            notifyContextChange('hashchange');
        });
    }

    /**
     * Initialize all observers
     */
    function init() {
        // Don't run in iframes
        if (window !== window.top) {
            return;
        }

        console.log('[Readify Observer] Initializing page observer');

        interceptHistoryAPI();
        listenPopstate();
        listenHashChange();
        observeTitleChanges();

        console.log('[Readify Observer] Page observer ready, watching:', lastUrl);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

