// Readify Extension - Selection Handler
// Handles text selection and toolbar display

// Check if extension context is still valid
function isExtensionContextValid() {
    try {
        return !!chrome.runtime?.id;
    } catch (e) {
        return false;
    }
}

// Safely get extension URL, returns empty string if context is invalid
function safeGetURL(path) {
    try {
        if (!isExtensionContextValid()) return '';
        return chrome.runtime.getURL(path);
    } catch (e) {
        return '';
    }
}

function removeSelectionBox() {
    if (selectionBox) {
        removeElementWithCleanup(selectionBox);
        selectionBox = null;
    }
}

// Function to show selection box
function showSelectionBox(evt) {
    // Bail out if extension context is invalid (e.g., extension was reloaded)
    if (!isExtensionContextValid()) {
        return;
    }
    
    if (selectionBox && container.contains(evt.target)) {
        return;
    }

    removeSelectionBox();
    let selection = window.getSelection();
    if (selection.toString().length > 0) {
        let range = selection.getRangeAt(0);
        let rect = range.getBoundingClientRect();

        let boxTop;
        if (rect.bottom + 60 > window.innerHeight) {
            boxTop = rect.top - 60;
        } else {
            boxTop = rect.bottom + 5;
        }

        selectionBox = document.createElement("div");
        selectionBox.style.position = "fixed";
        selectionBox.style.width = "200px !important";
        selectionBox.style.height = "30px !important";
        selectionBox.style.left = rect.left + "px";
        selectionBox.style.top = boxTop + "px";
        selectionBox.style.backgroundColor = "white";
        selectionBox.style.zIndex = "9999999";

        // Increased the shadow intensity and spread
        selectionBox.style.boxShadow = "2px 2px 5px rgba(1, 1, 1, 1)";

        // Increased border radius for more rounded appearance
        selectionBox.style.borderRadius = "12px";

        // Increased padding for a thicker appearance
        selectionBox.style.padding = "10px";
        selectionBox.style.display = "flex";
        selectionBox.style.gap = "5px";

        // Optional: Add a gentle transition for the appearance
        selectionBox.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        selectionBox.style.opacity = "0";
        selectionBox.style.transform = "translateY(-5px)"; // Start a bit above the intended position
        setTimeout(() => {
            selectionBox.style.opacity = "1";
            selectionBox.style.transform = "translateY(0)";
        }, 0);

        // Color picker button
        const colorPickerButton = document.createElement("button");
        colorPickerButton.style.width = "25px !important";
        colorPickerButton.style.height = "25px !important";
        colorPickerButton.style.backgroundColor = "transparent";
        colorPickerButton.innerHTML =
        "<img src='" + safeGetURL('images/highlight.png') + "' alt='highlight' style='height: 24px; width: 24px' />";;
        colorPickerButton.style.border = "transparent";
        colorPickerButton.addEventListener("click", function () {
            // Check if selection is safe before showing color picker
            if (!isSelectionSafe()) {
                showSelectionWarning();
                removeSelectionBox();
                return;
            }
            const selection = window.getSelection();
            showColorPicker(selection);
        });
        selectionBox.appendChild(colorPickerButton);
        createTooltip(colorPickerButton, "Highlighter");

        const underlineButton = document.createElement("button");
        underlineButton.style.backgroundColor = "transparent";
        underlineButton.style.width = "25px !important";
        underlineButton.style.height = "25px !important";
        if (isExactUnderlineSelection()) {
            underlineButton.innerHTML = "<img src='" + safeGetURL('images/underlineCancel.png') + "' alt='underlineCancel' style='height: 24px; width: 24px' />";
        } else {
            underlineButton.innerHTML =
            "<img src='" + safeGetURL('images/underline.png') + "' alt='underline' style='height: 24px; width: 24px' />";
        }

        
        underlineButton.style.border = "transparent";

        underlineButton.addEventListener("click", function () {
            if (isExactUnderlineSelection()) {
                // Remove underline if the selection is exactly within underlined text
                saveChangeToDisk("underlineRemove").then(() => {
                    underlineSelectedText("remove");
                });
            } else {
                // Check if selection is safe before applying underline
                if (!isSelectionSafe()) {
                    showSelectionWarning();
                    removeSelectionBox();
                    return;
                }
                // Apply underline otherwise
                saveChangeToDisk("underline").then(() => {
                    underlineSelectedText();
                });
            }
        });
        
        
        
        
        selectionBox.appendChild(underlineButton);
        createTooltip(underlineButton, "Underline");

        // Summarize button removed - now using the floating AI Chat panel instead

        const ttsButton = document.createElement("button");
        ttsButton.style.backgroundColor = "transparent";
        ttsButton.style.width = "25px !important";
        ttsButton.style.height = "25px !important";

        ttsButton.innerHTML ="<img src='" + safeGetURL('images/tts.png') + "' alt='tts' style='height: 28px; width: 28px' />";
        ttsButton.style.border = "transparent";

        ttsButton.addEventListener("click", async function () {
            // Check if user has premium access for TTS
            const canAccess = await checkPremiumFeature('tts');
            if (!canAccess) {
                showUpgradePrompt('tts');
                return;
            }
            
            // TTS for premium users
            const text = window.getSelection().toString();
            showTextToSpeech(text);
        });

        selectionBox.appendChild(ttsButton);
        createTooltip(ttsButton, "Text to Speech");

        const noteButton = document.createElement("button");
        noteButton.style.backgroundColor = "transparent";
        noteButton.style.width = "25px !important";
        noteButton.style.height = "25px !important";

        noteButton.innerHTML = "<img src='" + safeGetURL('images/notes.png') + "' alt='notes' style='height: 24px; width: 24px' />";
        noteButton.style.border = "transparent";

        noteButton.addEventListener("click", function () {
            showNoteInput();
        });

        selectionBox.appendChild(noteButton);
        createTooltip(noteButton, "Note");

        containerRoot.appendChild(selectionBox);
    }
}

// Debounced version of showSelectionBox to prevent rapid firing
const debouncedShowSelectionBox = debounce(showSelectionBox, 150);

function handleMouseUp(evt) {
    if (extensionEnabled) {
        // Check the global variable - use debounced version for performance
        debouncedShowSelectionBox(evt);
    }
}

// Helper function to check premium feature access
async function checkPremiumFeature(featureName) {
    // Check if testing mode is enabled - bypass premium checks
    const config = window.READIFY_CONFIG || READIFY_CONFIG;
    if (config.TESTING_MODE === true) {
        console.log(`[TESTING MODE] Bypassing premium check for: ${featureName}`);
        return true;
    }
    
    // If subscription service is available, use it
    if (window.ReadifySubscription) {
        return await window.ReadifySubscription.canAccessFeature(featureName);
    }
    // Default to false if service not available
    return false;
} 