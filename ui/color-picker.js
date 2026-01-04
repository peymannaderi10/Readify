// Readify Extension - Color Picker Component
// Handles color selection for highlights

// Color picker functionality
function removeColorPicker() {
    if (colorPickerDialog) {
        removeElementWithCleanup(colorPickerDialog);
        colorPickerDialog = null;
    }
    document.removeEventListener("mousedown", handleDocumentClick);
}

function showColorPicker(selection) {
    removeColorPicker(); // remove existing color picker if there's any

    // Create the color picker
    const colorPicker = document.createElement("div");
    colorPicker.setAttribute("id", "colorPickerDialog");
    colorPicker.style.backgroundColor = "#ffffff";
    colorPicker.style.position = "fixed";
    colorPicker.style.zIndex = "10000";
    colorPicker.style.borderRadius = "16px";
    colorPicker.style.boxShadow = "0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)";
    colorPicker.style.padding = "20px";
    colorPicker.style.border = "1px solid rgba(0, 151, 255, 0.1)";
    colorPicker.style.backdropFilter = "blur(10px)";
    colorPicker.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    colorPicker.style.display = "flex";
    colorPicker.style.flexDirection = "column";
    colorPicker.style.gap = "16px";
    colorPicker.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    
    // Add a modern header
    let headerContainer = document.createElement("div");
    headerContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
        height: 28px;
    `;
    
    let titleContainer = document.createElement("div");
    titleContainer.style.cssText = `
        display: flex;
        align-items: center;
    `;
    
    let iconElement = document.createElement("div");
    iconElement.innerHTML = "🎨";
    iconElement.style.cssText = `
        font-size: 16px;
        opacity: 0.7;
        margin-right: 6px;
        line-height: 1;
    `;
    
    let titleElement = document.createElement("h4");
    titleElement.innerText = "Highlight";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1;
    `;
    
    titleContainer.appendChild(iconElement);
    titleContainer.appendChild(titleElement);
    
    // Modern close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "×";
    closeButton.style.cssText = `
        background: transparent;
        border: none;
        font-size: 20px;
        color: #6b7280;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s ease;
        font-family: system-ui;
        line-height: 1;
        padding: 0;
        margin: 0;
    `;
    
    closeButton.addEventListener("click", removeColorPicker);
    closeButton.addEventListener("mouseenter", function() {
        this.style.backgroundColor = "rgba(107, 114, 128, 0.1)";
        this.style.color = "#374151";
    });
    closeButton.addEventListener("mouseleave", function() {
        this.style.backgroundColor = "transparent";
        this.style.color = "#6b7280";
    });
    
    headerContainer.appendChild(titleContainer);
    headerContainer.appendChild(closeButton);
    colorPicker.appendChild(headerContainer);

    // Create highlight buttons
    const colors = [
        { name: "yellow", color: "#fbbf24", label: "Yellow" },
        { name: "pink", color: "#f472b6", label: "Pink" },
        { name: "lightgreen", color: "#4ade80", label: "Green" },
        { name: "lightblue", color: "#60a5fa", label: "Blue" },
        { name: "none", color: "transparent", label: "Remove" }
    ];
    
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.cssText = `
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
    `;
    
    for (const colorOption of colors) {
        let btn = document.createElement("button");
        btn.title = colorOption.label;
        
        if (colorOption.name === "none") {
            btn.innerHTML = "Clear";
            btn.style.cssText = `
                width: 60px;
                height: 36px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                background: transparent;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            btn.addEventListener("mouseenter", function() {
                this.style.borderColor = "#ef4444";
                this.style.color = "#ef4444";
                this.style.transform = "scale(1.05)";
            });
            btn.addEventListener("mouseleave", function() {
                this.style.borderColor = "#e5e7eb";
                this.style.color = "#6b7280";
                this.style.transform = "scale(1)";
            });
        } else {
            btn.style.cssText = `
                width: 36px;
                height: 36px;
                border: 2px solid rgba(255, 255, 255, 0.8);
                border-radius: 8px;
                background: ${colorOption.color};
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            `;
            
            btn.addEventListener("mouseenter", function() {
                this.style.transform = "scale(1.1)";
                this.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
                this.style.borderColor = "#0097ff";
            });
            btn.addEventListener("mouseleave", function() {
                this.style.transform = "scale(1)";
                this.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                this.style.borderColor = "rgba(255, 255, 255, 0.8)";
            });
        }
        
        btn.addEventListener("click", function () {
            const highlightColor = colorOption.name === "none" ? "none" : colorOption.name;
            
            if (highlightColor === "none") {
                // Clear highlights - returns array of cleared IDs
                const clearedIds = highlightSelectedText("none");
                if (clearedIds && clearedIds.length > 0) {
                    // Save in background
                    saveChangeToDisk("clearHighlight", clearedIds, true);
                }
            } else {
                // Apply highlight - returns markData (visual is instant)
                const markData = highlightSelectedText(highlightColor);
                if (markData) {
                    // Save in background
                    saveChangeToDisk("highlight", highlightColor, false, markData);
                }
            }
            
            // Close immediately
            removeColorPicker();
            removeSelectionBox();
        });
        buttonWrapper.appendChild(btn);
    }
    colorPicker.appendChild(buttonWrapper);

    // Add intelligent positioning like other popups
    containerRoot.appendChild(colorPicker);
    colorPickerDialog = colorPicker;

    // Calculate positioning
    let boxHeight = colorPicker.getBoundingClientRect().height;
    let positionLeft = parseFloat(selectionBox.style.left);
    let spaceAbove = parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height);

    let positionTop;
    if (spaceAbove > boxHeight + 20) { // 20px buffer, prefer above for color picker
        // Position above the selection box
        positionTop = spaceAbove - boxHeight - 10;
    } else if (spaceBelow > boxHeight + 20) { // 20px buffer
        // Position below the selection box
        positionTop = parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10;
    } else {
        // Default to above if neither space is sufficient, but adjust to fit
        positionTop = Math.max(10, spaceAbove - boxHeight - 10);
    }

    colorPicker.style.top = positionTop + "px";
    colorPicker.style.left = positionLeft + "px";

    document.addEventListener("mousedown", handleDocumentClick);
}

function handleDocumentClick(event) {
    let colorPicker = containerRoot.getElementById("colorPickerDialog");
    // Ensuring the selectionBox is accessible in this scope
    if (!container.contains(event.target)) {
        if (colorPicker) {
            colorPicker.style.display = "none";
        }
        if (selectionBox) {
            selectionBox.style.display = "none";
        }
        // Also close edit toolbar if clicking outside
        const editToolbar = containerRoot.getElementById("readify-edit-toolbar");
        if (editToolbar && !editToolbar.contains(event.target)) {
            removeEditToolbar();
        }
    }
}

