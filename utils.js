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