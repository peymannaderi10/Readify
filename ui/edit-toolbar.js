// Readify Extension - Edit Toolbar Component
// Toolbar for editing existing highlights and underlines

let editToolbar = null;
let currentEditMark = null;

function initEditToolbarListeners() {
    // Add click listener for marks - use capture to intercept before other handlers
    document.addEventListener('click', handleMarkClick, true);
}

function handleMarkClick(event) {
    const mark = event.target.closest('readify-mark');
    
    // If clicking on a mark, show the appropriate UI
    if (mark) {
        // Don't show if there's an active text selection being made
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return; // Let the selection happen
        }
        
        // Prevent the click from bubbling (don't follow links inside marks, etc.)
        event.preventDefault();
        event.stopPropagation();
        
        const hasNote = mark.classList.contains('readify-with-notes');
        
        // If mark has a note, show the note edit modal instead of the color toolbar
        if (hasNote) {
            removeEditToolbar(); // Close any existing toolbar
            const markId = mark.getAttribute('data-mark-id');
            if (markId) {
                showNoteEditModal(mark);
            }
            return;
        }
        
        // Toggle toolbar - if clicking same mark, close it; if different mark, show new toolbar
        if (currentEditMark === mark && editToolbar) {
            removeEditToolbar();
        } else {
            showEditToolbar(mark);
        }
        return;
    }
    
    // If clicking outside of marks and toolbar, close the toolbar
    if (editToolbar && !editToolbar.contains(event.target)) {
        removeEditToolbar();
    }
}

function showEditToolbar(mark) {
    // Don't show if there's an active text selection
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    
    // Remove existing toolbar
    removeEditToolbar();
    
    currentEditMark = mark;
    const markId = mark.getAttribute('data-mark-id');
    const highlightId = mark.getAttribute('data-highlight-id');
    const isUnderline = mark.classList.contains('readify-underline');
    const hasNote = mark.classList.contains('readify-with-notes');
    const currentColor = mark.style.backgroundColor;
    
    // Create the toolbar
    editToolbar = document.createElement('div');
    editToolbar.id = 'readify-edit-toolbar';
    editToolbar.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 12px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-width: 180px;
        border: 1px solid rgba(0, 151, 255, 0.1);
    `;
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 6px;
        border-bottom: 1px solid #e5e7eb;
    `;
    title.textContent = isUnderline ? 'Edit Underline' : 'Edit Highlight';
    editToolbar.appendChild(title);
    
    // Color options row
    const colorRow = document.createElement('div');
    colorRow.style.cssText = `
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: center;
    `;
    
    const colors = isUnderline ? [
        { name: "black", color: "#000000", label: "Black" },
        { name: "blue", color: "#3b82f6", label: "Blue" },
        { name: "red", color: "#ef4444", label: "Red" },
        { name: "green", color: "#22c55e", label: "Green" },
        { name: "purple", color: "#8b5cf6", label: "Purple" }
    ] : [
        { name: "#fdffb4", color: "#fdffb4", label: "Yellow" },
        { name: "#fbbf24", color: "#fbbf24", label: "Orange" },
        { name: "#f472b6", color: "#f472b6", label: "Pink" },
        { name: "#4ade80", color: "#4ade80", label: "Green" },
        { name: "#60a5fa", color: "#60a5fa", label: "Blue" },
        { name: "#c084fc", color: "#c084fc", label: "Purple" }
    ];
    
    // Add color buttons
    for (const colorOption of colors) {
        const btn = document.createElement('button');
        btn.title = colorOption.label;
        btn.style.cssText = `
            width: 28px;
            height: 28px;
            border: 2px solid ${isCurrentColor(currentColor, colorOption.color) ? '#0097ff' : 'rgba(255, 255, 255, 0.8)'};
            border-radius: 6px;
            background: ${colorOption.color};
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.borderColor = '#0097ff';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.borderColor = isCurrentColor(currentColor, colorOption.color) ? '#0097ff' : 'rgba(255, 255, 255, 0.8)';
        });
        
        btn.addEventListener('click', async () => {
            await changeMarkColor(highlightId, colorOption.color, isUnderline);
            removeEditToolbar();
        });
        
        colorRow.appendChild(btn);
    }
    
    // Add remove button as a color-box style button with X
    const removeBtn = document.createElement('button');
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '✕';
    removeBtn.style.cssText = `
        width: 28px;
        height: 28px;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        background: #fff;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    `;
    
    removeBtn.addEventListener('mouseenter', () => {
        removeBtn.style.transform = 'scale(1.1)';
        removeBtn.style.borderColor = '#ef4444';
        removeBtn.style.color = '#ef4444';
        removeBtn.style.background = '#fef2f2';
    });
    removeBtn.addEventListener('mouseleave', () => {
        removeBtn.style.transform = 'scale(1)';
        removeBtn.style.borderColor = '#e5e7eb';
        removeBtn.style.color = '#9ca3af';
        removeBtn.style.background = '#fff';
    });
    
    removeBtn.addEventListener('click', async () => {
        await removeMark(highlightId, isUnderline);
        removeEditToolbar();
    });
    
    colorRow.appendChild(removeBtn);
    editToolbar.appendChild(colorRow);
    
    // Position the toolbar
    const rect = mark.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - 90;
    
    // Ensure it stays in viewport
    if (top + 150 > window.innerHeight) {
        top = rect.top - 150;
    }
    if (left < 10) left = 10;
    if (left + 180 > window.innerWidth) {
        left = window.innerWidth - 190;
    }
    
    editToolbar.style.top = top + 'px';
    editToolbar.style.left = left + 'px';
    
    // Prevent clicks inside toolbar from closing it
    editToolbar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    containerRoot.appendChild(editToolbar);
}

function removeEditToolbar() {
    if (editToolbar) {
        editToolbar.remove();
        editToolbar = null;
    }
    currentEditMark = null;
}

function isCurrentColor(current, option) {
    if (!current) return false;
    // Normalize color comparison
    const tempDiv = document.createElement('div');
    tempDiv.style.color = current;
    const currentNorm = tempDiv.style.color;
    tempDiv.style.color = option;
    const optionNorm = tempDiv.style.color;
    return currentNorm === optionNorm;
}

async function changeMarkColor(highlightId, newColor, isUnderline) {
    // Find all mark segments with this highlightId
    const marks = document.querySelectorAll(`readify-mark[data-highlight-id="${highlightId}"]`);
    
    marks.forEach(mark => {
        if (isUnderline) {
            mark.style.borderBottomColor = newColor;
        } else {
            mark.style.backgroundColor = newColor;
            // Update note indicator border if has notes
            if (mark.classList.contains('readify-with-notes')) {
                const rgb = hexToRgb(newColor) || parseRgb(newColor);
                if (rgb) {
                    mark.style.borderBottomColor = `rgb(${Math.max(0, rgb.r - 51)}, ${Math.max(0, rgb.g - 51)}, ${Math.max(0, rgb.b - 51)})`;
                }
            }
        }
    });
    
    // Update storage
    const urlDigest = await getURLDigest();
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    const siteData = isAuthenticated ? await loadFromSupabase(urlDigest) : await loadSiteFromLocal(urlDigest);
    
    if (siteData && siteData.changes) {
        const change = siteData.changes.find(c => c.highlightId === highlightId);
        if (change) {
            change.data = newColor;
            // Save updated data
            if (isAuthenticated) {
                await saveToSupabase(urlDigest, siteData.changes, siteData.info, siteData.notes);
            } else {
                await saveSiteToLocal(urlDigest, siteData);
            }
        }
    }
}

function removeMark(highlightId, isUnderline) {
    // Remove from DOM immediately
    removeHighlightById(highlightId);
    
    // Save in background (don't await)
    const type = isUnderline ? 'clearUnderline' : 'clearHighlight';
    saveChangeToDisk(type, [highlightId], true);
    
    // Notify update
    notifyMySitesUpdate('updated');
}

// Initialize edit toolbar when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEditToolbarListeners);
    } else {
        initEditToolbarListeners();
    }
}

