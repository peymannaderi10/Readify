// Readify Extension - DOM Utility Functions
// Functions for DOM manipulation, selection handling, and URL operations

// Remove the selection toolbar
function removeSelectionBox() {
    if (selectionBox) {
        removeElementWithCleanup(selectionBox);
        selectionBox = null;
    }
}

// Generate SHA-1 digest of current URL (used as storage key)
async function getURLDigest() {
    const textencoder = new TextEncoder();
    const url = new URL(window.location.href);
    url.hash = "";
    const data = textencoder.encode(url.href);
    const hashBuffer = await window.crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

// Save current text selection
function saveSelection() {
    if (window.getSelection().rangeCount > 0) {
        savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
    }
}

// Restore previously saved selection
function restoreSelection() {
    if (savedSelectionRange) {
        let selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelectionRange);
    }
}

// Serialize selection range for storage
function serializeSelection() {
    const range = window.getSelection().getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    const startContainerPath = [];
    let startContainerNode = startContainer;
    while (startContainerNode != document.body) {
        startContainerPath.push(Array.from(startContainerNode.parentNode.childNodes).indexOf(startContainerNode));
        startContainerNode = startContainerNode.parentNode;
    }
    startContainerPath.reverse();

    const endContainerPath = [];
    let endContainerNode = endContainer;
    while (endContainerNode != document.body) {
        endContainerPath.push(Array.from(endContainerNode.parentNode.childNodes).indexOf(endContainerNode));
        endContainerNode = endContainerNode.parentNode;
    }
    endContainerPath.reverse();

    return { startContainerPath, endContainerPath, startOffset, endOffset };
}

// Check if two serialized ranges overlap
function rangesOverlap(range1, range2) {
    // Compare the paths to determine if ranges overlap
    function comparePaths(path1, offset1, path2, offset2) {
        const minLength = Math.min(path1.length, path2.length);
        
        for (let i = 0; i < minLength; i++) {
            if (path1[i] < path2[i]) return -1;
            if (path1[i] > path2[i]) return 1;
        }
        
        // If paths are identical up to the shorter length, compare by path length and offset
        if (path1.length < path2.length) return -1;
        if (path1.length > path2.length) return 1;
        
        // Same path length, compare offsets
        if (offset1 < offset2) return -1;
        if (offset1 > offset2) return 1;
        return 0;
    }
    
    // Determine the start and end points for both ranges
    const range1Start = { path: range1.startContainerPath, offset: range1.startOffset };
    const range1End = { path: range1.endContainerPath, offset: range1.endOffset };
    const range2Start = { path: range2.startContainerPath, offset: range2.startOffset };
    const range2End = { path: range2.endContainerPath, offset: range2.endOffset };
    
    // Check if ranges overlap: range1.start <= range2.end && range2.start <= range1.end
    const range1StartVsRange2End = comparePaths(range1Start.path, range1Start.offset, range2End.path, range2End.offset);
    const range2StartVsRange1End = comparePaths(range2Start.path, range2Start.offset, range1End.path, range1End.offset);
    
    return range1StartVsRange2End <= 0 && range2StartVsRange1End <= 0;
}

/**
 * Validates if a selection is safe for highlighting or underlining
 * Returns false if selection spans across paragraph boundaries or block elements
 * @returns {boolean} True if selection is safe, false otherwise
 */
function isSelectionSafe() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return false;
    }
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
        return false;
    }
    
    // Get start and end containers
    let startContainer = range.startContainer;
    let endContainer = range.endContainer;
    
    // If containers are text nodes, get their parent elements
    if (startContainer.nodeType === Node.TEXT_NODE) {
        startContainer = startContainer.parentElement;
    }
    if (endContainer.nodeType === Node.TEXT_NODE) {
        endContainer = endContainer.parentElement;
    }
    
    // Find the nearest block-level ancestors for both containers
    const blockElements = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'BLOCKQUOTE', 'ARTICLE', 'SECTION', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV'];
    
    function findNearestBlock(element) {
        while (element && element !== document.body) {
            if (blockElements.includes(element.tagName)) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }
    
    const startBlock = findNearestBlock(startContainer);
    const endBlock = findNearestBlock(endContainer);
    
    // If we can't find block ancestors or they're different, the selection spans across blocks
    if (!startBlock || !endBlock || startBlock !== endBlock) {
        return false;
    }
    
    return true;
}

/**
 * Shows a user-friendly message when selection is invalid
 */
function showSelectionWarning() {
    // Remove any existing warning
    const existingWarning = document.getElementById('readify-selection-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    // Create warning element
    const warning = document.createElement('div');
    warning.id = 'readify-selection-warning';
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        z-index: 10001;
        animation: slideInDown 0.3s ease-out;
    `;
    warning.innerHTML = '⚠️ Selection cannot span across paragraphs or sections';
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(warning);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (warning.parentNode) {
            warning.style.animation = 'slideInDown 0.3s ease-out reverse';
            setTimeout(() => {
                warning.remove();
                style.remove();
            }, 300);
        }
    }, 3000);
}

