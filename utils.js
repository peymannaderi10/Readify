// Readify Extension - Utility Functions and Constants
// Common utilities used across the extension

// Global state variables
let selectionBox = null;
let container = null;
let containerRoot = null;
let summaryBox = null;
let ttsBox = null;
let isDragging = false;
let offsetX, offsetY;
let savedRange = null;
let extensionEnabled = false;
let temporaryRange = null;
let colorPickerDialog = null;
let savedSelectionRange = null;

// CSS Styles
const spinnerCss = `
  @keyframes spinner {
    to {transform: rotate(360deg);}
  }
  .spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 24px;
    height: 24px;
    margin: -12px 0 0 -12px;
    border: 2px solid transparent;
    border-top-color: #0097ff;
    border-radius: 50%;
    animation: spinner .6s linear infinite;
    z-index: 10;
  }
`;

const styles = `
${spinnerCss}
.dropdown-container {
    position: relative;
    font-family: 'Arial', sans-serif;
}
.dropdown-menu, .submenu {
    display: none;
    position: absolute;
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid #ddd;
    background-color: #ffffff;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
    border-radius: 4px;
}
.dropdown-menu li, .submenu li {
    padding: 10px 20px;
    cursor: pointer;
    transition: background-color 0.3s;
}
.dropdown-menu li:hover, .submenu li:hover {
    background-color: #f7f7f7;
}
.has-submenu {
    position: relative;
}
.has-submenu:hover .submenu {
    display: block;
    left: 100%;
    top: 0;
    border-left: none;
}
.dropdown-toggle {
    padding: 10px 20px !important;
    font-size: 16px !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    transition: background-color 0.3s !important;
    outline: none !important;
    border: 2px solid #000 !important;
    background-color: #B0DCFF !important;
}
.dropdown-toggle:hover {
    background-color: #0097FF !important;
}
.submenu {
    max-height: 200px; 
    overflow-y: auto; 
    width: 200px; 
}
.highlight-btn {
    width:20px;
    height:20px;
    border:none;
    border-radius:50%;
}
`;

const commonButtonStyle = `
padding: 5px 15px !important;
border-radius: 5px !important;
border: 1px solid #ccc !important;
background: transparent !important;
cursor: pointer !important;
transition: background-color 0.2s ease !important;
`;

// Utility Functions
function makeDraggable(elem) {
    elem.onmousedown = function (event) {
        if (event.target.tagName.toLowerCase() === "textarea") {
            return;
        }

        isDragging = true;
        offsetX = event.clientX - elem.getBoundingClientRect().left;
        offsetY = event.clientY - elem.getBoundingClientRect().top;

        document.onmousemove = function (event) {
            if (isDragging) {
                elem.style.left = event.clientX - offsetX + "px";
                elem.style.top = event.clientY - offsetY + "px";
            }
        };

        document.onmouseup = function () {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

function copyToClipboard(text) {
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = text;
    containerRoot.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand("copy");
    containerRoot.removeChild(tempTextArea);
}

function createTooltip(button, tooltipText) {
    const tooltip = document.createElement("span");
    tooltip.innerText = tooltipText;
    tooltip.style.visibility = "hidden";
    tooltip.style.width = "120px";
    tooltip.style.backgroundColor = "#555";
    tooltip.style.color = "#fff";
    tooltip.style.textAlign = "center";
    tooltip.style.borderRadius = "6px";
    tooltip.style.padding = "5px";
    tooltip.style.position = "absolute";
    tooltip.style.zIndex = "1";
    tooltip.style.bottom = "100%";
    tooltip.style.left = "50%";
    tooltip.style.marginLeft = "-60px";
    tooltip.style.opacity = "0";
    tooltip.style.transition = "opacity 0.3s";

    button.appendChild(tooltip);

    button.addEventListener("mouseover", function () {
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = "1";
    });

    button.addEventListener("mouseout", function () {
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = "0";
    });
}

function saveSelection() {
    if (window.getSelection().rangeCount > 0) {
        savedSelectionRange = window.getSelection().getRangeAt(0).cloneRange();
    }
}

function restoreSelection() {
    if (savedSelectionRange) {
        let selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelectionRange);
    }
}

function showLoadingOverlay(textArea) {
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "10";

    const spinner = document.createElement("div");
    spinner.className = "spinner";
    overlay.appendChild(spinner);

    textArea.parentNode.appendChild(overlay);
    return overlay;
}

// Smart positioning function for popups
function calculatePopupPosition(popup, selectionBox, preferAbove = false) {
    let boxHeight = popup.getBoundingClientRect().height;
    let positionLeft = parseFloat(selectionBox.style.left);
    let spaceAbove = parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height);

    let positionTop;
    
    if (preferAbove) {
        if (spaceAbove > boxHeight + 20) {
            positionTop = spaceAbove - boxHeight - 10;
        } else if (spaceBelow > boxHeight + 20) {
            positionTop = parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10;
        } else {
            positionTop = Math.max(10, spaceAbove - boxHeight - 10);
        }
    } else {
        if (spaceBelow > boxHeight + 20) {
            positionTop = parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10;
        } else if (spaceAbove > boxHeight + 20) {
            positionTop = spaceAbove - boxHeight - 10;
        } else {
            positionTop = Math.max(10, spaceAbove - boxHeight - 10);
        }
    }

    return {
        top: positionTop,
        left: positionLeft
    };
}

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

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // State variables
        selectionBox, container, containerRoot, summaryBox, ttsBox,
        isDragging, offsetX, offsetY, savedRange, extensionEnabled,
        temporaryRange, colorPickerDialog, savedSelectionRange,
        
        // Constants
        styles, commonButtonStyle,
        
        // Functions
        makeDraggable, copyToClipboard, createTooltip, saveSelection,
        restoreSelection, showLoadingOverlay, calculatePopupPosition,
        getURLDigest, serializeSelection
    };
} 