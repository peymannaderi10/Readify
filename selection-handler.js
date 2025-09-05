// Readify Extension - Selection Handler
// Handles text selection and toolbar display

function removeSelectionBox() {
    if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }
}

// Function to show selection box
function showSelectionBox(evt) {
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
        "<img src='" + chrome.runtime.getURL('images/highlight.png') + "' alt='highlight' style='height: 24px; width: 24px' />";;
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
            underlineButton.innerHTML = "<img src='" + chrome.runtime.getURL('images/underlineCancel.png') + "' alt='underlineCancel' style='height: 24px; width: 24px' />";
        } else {
            underlineButton.innerHTML =
            "<img src='" + chrome.runtime.getURL('images/underline.png') + "' alt='underline' style='height: 24px; width: 24px' />";
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

        const summaryBtn = document.createElement('button');
        summaryBtn.style.position = 'relative';
        summaryBtn.style.width = '25px !important';
        summaryBtn.style.height = '25px !important';
        summaryBtn.style.backgroundColor = 'transparent';
        summaryBtn.innerHTML = "<img src='" + chrome.runtime.getURL('images/summarize.png') + "' alt='summarize' style='height: 24px; width: 24px' />";
        summaryBtn.style.border = 'transparent';
        
        summaryBtn.addEventListener("click", async function () {
            console.log("Button clicked, showing spinner");
        
            // Get the image inside the button and set its opacity to 50%
            const buttonImage = summaryBtn.querySelector('img');
            buttonImage.style.opacity = '0.5';
        
            // Ensure the button has relative positioning
            summaryBtn.style.position = 'relative';
        
            // Create spinner element and add it to the button
            const spinner = document.createElement("div");
            spinner.className = "spinner";
            summaryBtn.appendChild(spinner);
        
            const cleanText = window.getSelection().toString().replace(/\r?\n|\r/g, " ").replace(/[^\x00-\x7F]/g, function(char) {
                return "\\u" + ("0000" + char.charCodeAt(0).toString(16)).slice(-4);
              });
              
              const text = encodeURIComponent(cleanText);
            try {
                const summarizedText = await summarizeText(text, "summary");
                showSummary(summarizedText, text);
            } catch (error) {
                console.error("Error during summarization:", error);
                // Handle any errors here
            }
        
            // Remove the spinner once the process is complete
            summaryBtn.removeChild(spinner);
        
            // Reset the image opacity to 100%
            buttonImage.style.opacity = '1';
        
            console.log("Summarization complete, hiding spinner");
        });
        
        
        selectionBox.appendChild(summaryBtn);
        createTooltip(summaryBtn, "Summarize");

        const ttsButton = document.createElement("button");
        ttsButton.style.backgroundColor = "transparent";
        ttsButton.style.width = "25px !important";
        ttsButton.style.height = "25px !important";

        ttsButton.innerHTML ="<img src='" + chrome.runtime.getURL('images/tts.png') + "' alt='tts' style='height: 28px; width: 28px' />";
        ttsButton.style.border = "transparent";

        ttsButton.addEventListener("click", async function () {
            const text = window.getSelection().toString();
            showTextToSpeech(text);
        });

        selectionBox.appendChild(ttsButton);
        createTooltip(ttsButton, "Text to Speech");

        const noteButton = document.createElement("button");
        noteButton.style.backgroundColor = "transparent";
        noteButton.style.width = "25px !important";
        noteButton.style.height = "25px !important";

        noteButton.innerHTML = "<img src='" + chrome.runtime.getURL('images/notes.png') + "' alt='notes' style='height: 24px; width: 24px' />";
        noteButton.style.border = "transparent";

        noteButton.addEventListener("click", function () {
            showNoteInput();
        });

        selectionBox.appendChild(noteButton);
        createTooltip(noteButton, "Note");

        containerRoot.appendChild(selectionBox);
    }
}

function handleMouseUp(evt) {
    if (extensionEnabled) {
        // Check the global variable
        showSelectionBox(evt);
    }
} 