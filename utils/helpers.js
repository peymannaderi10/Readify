// Readify Extension - Helper Utility Functions
// Common utility functions used across the extension

// Debounce function - delays execution until after wait milliseconds have elapsed
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Cleanup registry for proper memory management
const cleanupRegistry = new WeakMap();

function registerCleanup(element, cleanupFn) {
    const existing = cleanupRegistry.get(element) || [];
    existing.push(cleanupFn);
    cleanupRegistry.set(element, existing);
}

function runCleanup(element) {
    const cleanups = cleanupRegistry.get(element);
    if (cleanups) {
        cleanups.forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error("Cleanup error:", e);
            }
        });
        cleanupRegistry.delete(element);
    }
}

function removeElementWithCleanup(element) {
    if (!element) return;
    runCleanup(element);
    if (element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

// Make an element draggable
function makeDraggable(elem) {
    let localIsDragging = false;
    let localOffsetX, localOffsetY;
    
    function handleMouseDown(event) {
        const tagName = event.target.tagName.toLowerCase();
        // Don't start dragging if clicking on interactive elements
        if (tagName === "textarea" || tagName === "input" || tagName === "button" || tagName === "select") {
            return;
        }

        localIsDragging = true;
        localOffsetX = event.clientX - elem.getBoundingClientRect().left;
        localOffsetY = event.clientY - elem.getBoundingClientRect().top;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    function handleMouseMove(event) {
        if (localIsDragging) {
            elem.style.left = event.clientX - localOffsetX + "px";
            elem.style.top = event.clientY - localOffsetY + "px";
        }
    }
    
    function handleMouseUp() {
        localIsDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    elem.addEventListener('mousedown', handleMouseDown);
    
    // Register cleanup to remove event listeners when element is removed
    registerCleanup(elem, () => {
        elem.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    });
}

// Copy text to clipboard with fallback
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers or when Clipboard API is unavailable
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = text;
        tempTextArea.style.position = "fixed";
        tempTextArea.style.opacity = "0";
        tempTextArea.style.pointerEvents = "none";
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
            document.execCommand("copy");
        } catch (e) {
            console.error("Fallback copy failed:", e);
            return false;
        }
        document.body.removeChild(tempTextArea);
        return true;
    }
}

// Create tooltip for a button
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

// Show loading spinner overlay
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

