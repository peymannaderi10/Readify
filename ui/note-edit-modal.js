// Readify Extension - Note Edit Modal
// Modal for editing notes with color options for highlights

// Note Edit Modal - shows note text + color options for highlights with notes
async function showNoteEditModal(mark) {
    const markId = mark.getAttribute('data-mark-id');
    const highlightId = mark.getAttribute('data-highlight-id');
    const currentColor = mark.style.backgroundColor;
    const isUnderline = mark.classList.contains('readify-underline');
    
    // Get the note text from storage or data attribute
    const urlDigest = await getURLDigest();
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    let noteText = '';
    
    // First try to get from data attribute (works for session-only mode)
    noteText = mark.getAttribute('data-note-text') || '';
    
    // If not found, try storage
    if (!noteText) {
        try {
            if (isAuthenticated) {
                const siteData = await loadFromSupabase(urlDigest);
                noteText = siteData?.notes?.[markId] || '';
            } else {
                // For non-authenticated users, check local storage (session data)
                const siteData = await loadSiteFromLocal(urlDigest);
                noteText = siteData?.notes?.[markId] || '';
            }
        } catch (e) {
            console.log('Could not load note:', e.message);
        }
    }
    
    // Remove any existing popup
    if (summaryBox) {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    }
    
    // Create the modal
    summaryBox = document.createElement("div");
    summaryBox.style.cssText = `
        position: fixed;
        width: min(420px, 90vw);
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1);
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
        border: 1px solid rgba(0, 151, 255, 0.1);
        backdrop-filter: blur(10px);
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 10000;
    `;
    
    // Header
    const header = document.createElement("div");
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
    `;
    
    const title = document.createElement("h3");
    title.textContent = "Edit Note";
    title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
    `;
    
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
    `;
    closeBtn.onclick = () => {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    summaryBox.appendChild(header);
    
    // Color picker (stored for later use with note label)
    let colorRow = null;
    let selectedColor = currentColor;
    
    if (!isUnderline) {
        colorRow = document.createElement("div");
        colorRow.style.cssText = `
            display: flex;
            gap: 4px;
            align-items: center;
        `;
        
        const colors = [
            { color: "#fdffb4", label: "Yellow" },
            { color: "#fbbf24", label: "Orange" },
            { color: "#f472b6", label: "Pink" },
            { color: "#4ade80", label: "Green" },
            { color: "#60a5fa", label: "Blue" },
            { color: "#c084fc", label: "Purple" }
        ];
        
        colors.forEach(colorOpt => {
            const btn = document.createElement("button");
            btn.title = colorOpt.label;
            btn.setAttribute('data-color', colorOpt.color);
            btn.style.cssText = `
                width: 16px;
                height: 16px;
                border: 2px solid ${isCurrentColor(currentColor, colorOpt.color) ? '#0097ff' : 'transparent'};
                border-radius: 4px;
                background: ${colorOpt.color};
                cursor: pointer;
                transition: all 0.15s ease;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                padding: 0;
            `;
            
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.15)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });
            
            btn.addEventListener('click', () => {
                // Update selection visual
                colorRow.querySelectorAll('button').forEach(b => {
                    b.style.borderColor = 'transparent';
                });
                btn.style.borderColor = '#0097ff';
                selectedColor = colorOpt.color;
            });
            
            colorRow.appendChild(btn);
        });
        
        // Store selectedColor accessor for save button
        summaryBox.getSelectedColor = () => selectedColor;
    }
    
    // Note textarea
    const noteSection = document.createElement("div");
    noteSection.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    // Label row with Note label on left and color boxes on right
    const labelRow = document.createElement("div");
    labelRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const noteLabel = document.createElement("div");
    noteLabel.textContent = "Note";
    noteLabel.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;
    
    labelRow.appendChild(noteLabel);
    if (colorRow) {
        labelRow.appendChild(colorRow);
    }
    
    const noteTextArea = document.createElement("textarea");
    noteTextArea.value = noteText;
    noteTextArea.placeholder = "Add your note here...";
    noteTextArea.style.cssText = `
        width: 100%;
        min-height: 120px;
        resize: vertical;
        border-radius: 10px;
        font-size: 14px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 14px;
        border: 2px solid #e5e7eb;
        background: #fafafa;
        outline: none;
        transition: all 0.2s ease;
        line-height: 1.5;
        color: #2d3748;
        box-sizing: border-box;
    `;
    
    noteTextArea.addEventListener("focus", function() {
        this.style.borderColor = "#0097ff";
        this.style.backgroundColor = "#fff";
    });
    noteTextArea.addEventListener("blur", function() {
        this.style.borderColor = "#e5e7eb";
        this.style.backgroundColor = "#fafafa";
    });
    
    noteSection.appendChild(labelRow);
    noteSection.appendChild(noteTextArea);
    summaryBox.appendChild(noteSection);
    
    // Button row
    const buttonRow = document.createElement("div");
    buttonRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 8px;
    `;
    
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.style.cssText = `
        padding: 10px 20px;
        border-radius: 8px;
        border: 2px solid rgba(239, 68, 68, 0.2);
        background: transparent;
        color: #ef4444;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
        deleteBtn.style.borderColor = '#ef4444';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.backgroundColor = 'transparent';
        deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    });
    deleteBtn.addEventListener('click', () => {
        // Remove the highlight entirely (instant DOM update, background save)
        removeMark(highlightId, isUnderline);
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    });
    
    // Right side buttons container
    const rightButtons = document.createElement("div");
    rightButtons.style.cssText = `display: flex; gap: 10px;`;
    
    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
        padding: 10px 20px;
        border-radius: 8px;
        border: 2px solid rgba(0, 151, 255, 0.2);
        background: transparent;
        color: #0097ff;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = 'rgba(0, 151, 255, 0.05)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = 'transparent';
    });
    cancelBtn.onclick = () => {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    // Save button
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.style.cssText = `
        padding: 10px 24px;
        border-radius: 8px;
        border: none;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        color: white;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
    `;
    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.transform = 'translateY(-1px)';
        saveBtn.style.boxShadow = '0 6px 16px rgba(0, 151, 255, 0.4)';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.transform = 'translateY(0)';
        saveBtn.style.boxShadow = '0 4px 12px rgba(0, 151, 255, 0.3)';
    });
    saveBtn.addEventListener('click', () => {
        const newNoteText = noteTextArea.value.trim();
        const newColor = summaryBox.getSelectedColor ? summaryBox.getSelectedColor() : currentColor;
        
        // Update note if changed
        if (newNoteText !== noteText) {
            if (newNoteText) {
                // Update visual immediately
                addNoteToHighlight(markId, newNoteText);
                // Save in background
                saveChangeToDisk("note", newNoteText, false, { markId });
            } else {
                // Note was cleared - remove note but keep highlight
                // Update visual immediately
                const marks = document.querySelectorAll(`readify-mark[data-mark-id="${markId}"]`);
                marks.forEach(m => {
                    m.classList.remove('readify-with-notes');
                    m.removeAttribute('data-note-text');
                    m.style.borderBottomColor = '';
                });
                // Save in background
                saveChangeToDisk("note", markId, true);
            }
        }
        
        // Update color if changed
        if (!isUnderline && newColor !== currentColor) {
            // changeMarkColor updates DOM immediately, saves in background
            changeMarkColor(highlightId, newColor, false);
        }
        
        // Close immediately
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    });
    
    rightButtons.appendChild(cancelBtn);
    rightButtons.appendChild(saveBtn);
    buttonRow.appendChild(deleteBtn);
    buttonRow.appendChild(rightButtons);
    summaryBox.appendChild(buttonRow);
    
    // Position the modal
    containerRoot.appendChild(summaryBox);
    
    const rect = mark.getBoundingClientRect();
    const boxHeight = summaryBox.getBoundingClientRect().height;
    const boxWidth = summaryBox.getBoundingClientRect().width;
    
    let top = rect.bottom + 10;
    let left = rect.left;
    
    // Ensure it stays in viewport
    if (top + boxHeight > window.innerHeight - 20) {
        top = rect.top - boxHeight - 10;
    }
    if (left + boxWidth > window.innerWidth - 20) {
        left = window.innerWidth - boxWidth - 20;
    }
    if (left < 20) left = 20;
    if (top < 20) top = 20;
    
    summaryBox.style.top = top + 'px';
    summaryBox.style.left = left + 'px';
    
    makeDraggable(summaryBox);
    noteTextArea.focus();
}

