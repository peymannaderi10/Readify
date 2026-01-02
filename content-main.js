// Readify Extension - Main Entry Point
// Initializes the extension and handles Chrome messaging

// Initialize shadow DOM and styles
container = document.createElement("div");
container.id = chrome.runtime.id;

containerRoot = container.attachShadow({ mode: "open" });

document.body.appendChild(container);

// Inject shadow DOM styles (isolated from the page)
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
containerRoot.appendChild(styleSheet);

// Inject page-level styles for elements added to the actual webpage (like underlines)
// These are scoped with specific class names to avoid conflicts
const pageStyleSheet = document.createElement("style");
pageStyleSheet.type = "text/css";
pageStyleSheet.id = "readify-page-styles";
pageStyleSheet.innerText = pageStyles;
document.head.appendChild(pageStyleSheet);

// Initialize extension when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", afterDOMLoaded);
} else {
    afterDOMLoaded();
}

function afterDOMLoaded() {
    wrapDivTextNodesInP();
    restoreChangesFromDisk();
    attachNoteEvents();
}

// Chrome extension messaging
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // Only handle toggleExtension action - ignore other messages
    if (request.action === "toggleExtension") {
        if (request.enabled) {
            document.addEventListener("mouseup", handleMouseUp);
            extensionEnabled = true;
        } else {
            document.removeEventListener("mouseup", handleMouseUp);
            removeSelectionBox();
            extensionEnabled = false;
        }
    }
    // Ignore other message types (authStateChange, subscriptionUpdated, etc.)
});

chrome.storage.sync.get("extensionEnabled", function (data) {
    if (data.extensionEnabled) {
        document.addEventListener("mouseup", handleMouseUp);
        extensionEnabled = true;
    } else {
        extensionEnabled = false;
    }
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "deleteChanges") {
            deleteChangesFromDisk();
        }
    }
); 