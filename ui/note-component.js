// Readify Extension - Note Input Component
// Handles note creation and editing UI

// Note popup functionality
function showNoteInput(initialText, anchorElement) {
    saveSelection();

    if (summaryBox) {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    }

    summaryBox = document.createElement("div");
    summaryBox.style.position = "fixed";
    summaryBox.style.width = "min(400px, 90vw)";
    summaryBox.style.backgroundColor = "#ffffff";
    summaryBox.style.borderRadius = "16px";
    summaryBox.style.boxShadow = "0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)";
    summaryBox.style.padding = "24px";
    summaryBox.style.display = "flex";
    summaryBox.style.flexDirection = "column";
    summaryBox.style.alignItems = "stretch";
    summaryBox.style.gap = "20px";
    summaryBox.style.border = "1px solid rgba(0, 151, 255, 0.1)";
    summaryBox.style.backdropFilter = "blur(10px)";
    summaryBox.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    summaryBox.style.zIndex = "10000";

    // Add a modern header
    let headerContainer = document.createElement("div");
    headerContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    `;
    
    let titleElement = document.createElement("h3");
    titleElement.innerText = initialText ? "Note" : "Add Note";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    let iconElement = document.createElement("div");
    iconElement.innerHTML = "📝";
    iconElement.style.cssText = `
        font-size: 20px;
        opacity: 0.7;
    `;
    
    headerContainer.appendChild(titleElement);
    headerContainer.appendChild(iconElement);
    summaryBox.appendChild(headerContainer);

    let noteTextArea = document.createElement("textarea");
    noteTextArea.style.width = "100%";
    noteTextArea.style.minHeight = "140px";
    noteTextArea.style.resize = "vertical";
    noteTextArea.value = initialText || "";
    noteTextArea.style.borderRadius = "12px";
    noteTextArea.style.fontSize = "15px";
    noteTextArea.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    noteTextArea.style.padding = "16px";
    noteTextArea.style.border = "2px solid rgba(182, 240, 233, 0.3)";
    noteTextArea.style.backgroundColor = "rgba(182, 240, 233, 0.05)";
    noteTextArea.style.outline = "none";
    noteTextArea.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    noteTextArea.style.lineHeight = "1.5";
    noteTextArea.style.color = "#2d3748";
    noteTextArea.style.boxSizing = "border-box";
    noteTextArea.placeholder = "Add your note here...";
    
    // Focus and hover effects for textarea
    noteTextArea.addEventListener("focus", function() {
        this.style.borderColor = "#0097ff";
        this.style.backgroundColor = "rgba(182, 240, 233, 0.1)";
        this.style.boxShadow = "0 0 0 3px rgba(0, 151, 255, 0.1)";
    });
    
    noteTextArea.addEventListener("blur", function() {
        this.style.borderColor = "rgba(182, 240, 233, 0.3)";
        this.style.backgroundColor = "rgba(182, 240, 233, 0.05)";
        this.style.boxShadow = "none";
    });

    let cancelButton = document.createElement("button");
    cancelButton.innerText = "Cancel";
    cancelButton.onclick = function () {
        removeSelectionBox();
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    // Modern button styling for cancel
    cancelButton.style.cssText = `
        padding: 12px 24px;
        border-radius: 10px;
        border: 2px solid rgba(0, 151, 255, 0.2);
        background: transparent;
        color: #0097ff;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: 80px;
    `;
    
    cancelButton.addEventListener("mouseenter", function() {
        this.style.backgroundColor = "rgba(0, 151, 255, 0.05)";
        this.style.borderColor = "#0097ff";
        this.style.transform = "translateY(-1px)";
    });
    
    cancelButton.addEventListener("mouseleave", function() {
        this.style.backgroundColor = "transparent";
        this.style.borderColor = "rgba(0, 151, 255, 0.2)";
        this.style.transform = "translateY(0)";
    });

    let doneButton = document.createElement("button");
    doneButton.innerText = "Save Note";
    doneButton.onclick = function () {
        restoreSelection();
        let noteText = noteTextArea.value.trim();
        if (noteText) {
            if (!anchorElement) {
                // Create new highlight with note - noteText is already in markData
                const markData = highlightSelectedText('#fdffb4', noteText); // Yellow highlight with note
                if (markData) {
                    // Update visual indicator immediately
                    addNoteToHighlight(markData.markId, noteText);
                    // Save in background - noteText is included in markData, no separate note save needed
                    saveChangeToDisk("highlight", '#fdffb4', false, markData);
                }
            } else {
                // Update existing note - anchorElement is now a readify-mark
                const markId = anchorElement.getAttribute('data-mark-id');
                if (markId) {
                    // Update visual indicator immediately
                    addNoteToHighlight(markId, noteText);
                    // Save note update in background
                    saveChangeToDisk("note", noteText, false, { markId });
                }
            }
        }
        // Close immediately - don't wait for save
        removeSelectionBox();
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    // Modern primary button styling for done
    doneButton.style.cssText = `
        padding: 12px 24px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        color: white;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: 100px;
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
    `;
    
    doneButton.addEventListener("mouseenter", function() {
        this.style.background = "linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)";
        this.style.transform = "translateY(-2px)";
        this.style.boxShadow = "0 6px 20px rgba(0, 151, 255, 0.4)";
    });
    
    doneButton.addEventListener("mouseleave", function() {
        this.style.background = "linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)";
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "0 4px 12px rgba(0, 151, 255, 0.3)";
    });

    summaryBox.appendChild(noteTextArea);
    // Create a button container to keep them side by side
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.gap = "12px";
    buttonContainer.style.width = "100%";
    buttonContainer.style.marginTop = "8px";
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(doneButton);

    if (initialText) {
        let deleteButton = document.createElement("button");
        deleteButton.innerText = "Delete Note";
        deleteButton.onclick = function () {
            // Check if the anchor element exists and has a first child that is an element node
            if (anchorElement && anchorElement.firstChild && anchorElement.firstChild.nodeType === Node.ELEMENT_NODE) {
                // Change the background color of the text inside the anchor to transparent
                anchorElement.firstChild.style.backgroundColor = "transparent";
        
                // Unwrap the text from the anchor tag
                while (anchorElement.firstChild) {
                    anchorElement.parentNode.insertBefore(anchorElement.firstChild, anchorElement);
                }
                anchorElement.remove();
            }
        
            // Save the deletion to disk
            saveChangeToDisk("note", initialText, true);
            removeSelectionBox();
            removeElementWithCleanup(summaryBox);
            summaryBox = null;
        };
        
        // Modern danger button styling for delete
        deleteButton.style.cssText = `
            padding: 12px 24px;
            border-radius: 10px;
            border: 2px solid rgba(239, 68, 68, 0.2);
            background: transparent;
            color: #ef4444;
            font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: 100px;
        `;
        
        deleteButton.addEventListener("mouseenter", function() {
            this.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
            this.style.borderColor = "#ef4444";
            this.style.transform = "translateY(-1px)";
        });
        
        deleteButton.addEventListener("mouseleave", function() {
            this.style.backgroundColor = "transparent";
            this.style.borderColor = "rgba(239, 68, 68, 0.2)";
            this.style.transform = "translateY(0)";
        });

        // Add the delete button to the button container at the beginning
        buttonContainer.style.justifyContent = "space-between";
        buttonContainer.insertBefore(deleteButton, buttonContainer.firstChild);
    }
    
    summaryBox.appendChild(buttonContainer);

    // Temporarily append to body to get accurate height
    containerRoot.appendChild(summaryBox);

    let boxHeight = summaryBox.getBoundingClientRect().height;

    let positionLeft = anchorElement ? anchorElement.getBoundingClientRect().left : parseFloat(selectionBox.style.left);
    let spaceAbove = anchorElement ? anchorElement.getBoundingClientRect().top : parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (anchorElement ? anchorElement.getBoundingClientRect().bottom : parseFloat(selectionBox.style.top) + 60);

    let positionTop;
    if (spaceBelow > boxHeight) {
        positionTop = anchorElement
            ? anchorElement.getBoundingClientRect().bottom + 5
            : parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height;
    } else if (spaceAbove > boxHeight) {
        positionTop = spaceAbove - boxHeight;
    } else {
        // Default to above if neither space is sufficient
        positionTop = spaceAbove - boxHeight;
    }

    summaryBox.style.top = positionTop + "px";
    summaryBox.style.left = positionLeft + "px";
    makeDraggable(summaryBox);
}

