// Readify Extension - Main Entry Point
// Initializes the extension and handles Chrome messaging

// Initialize shadow DOM and styles
container = document.createElement("div");
container.id = chrome.runtime.id;

containerRoot = container.attachShadow({ mode: "open" });

document.body.appendChild(container);

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
containerRoot.appendChild(styleSheet);

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
    if (request.enabled) {
        document.addEventListener("mouseup", handleMouseUp);
        extensionEnabled = true;
    } else {
        document.removeEventListener("mouseup", handleMouseUp);
        removeSelectionBox();
        extensionEnabled = false;
    }
});

chrome.storage.sync.get("enabled", function (data) {
    if (data.enabled) {
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