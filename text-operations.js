// Readify Extension - Text Operations
// Web Highlights-style split highlighting system for cross-tag selections

// Generate unique IDs
function generateMarkId() {
    return 'rm-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateHighlightId() {
    return crypto.randomUUID ? crypto.randomUUID() : 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
}

// Initialize text nodes wrapping
function wrapDivTextNodesInP() {
    let divs = document.querySelectorAll("div:not(:empty):not(script):not(style):not(link):not(meta)");
    divs.forEach((div) => {
        let children = Array.from(div.childNodes);
        children.forEach((child) => {
            if (child.nodeType === 3 && child.nodeValue.trim() !== "") {
                let wrapper = document.createElement("span");
                wrapper.className = "wrapped-text";
                div.insertBefore(wrapper, child);
                wrapper.appendChild(child);
            }
        });
    });
}

// ============================================
// READIFY-MARK CUSTOM ELEMENT SYSTEM
// ============================================

// Create a readify-mark element
function createMarkElement(options) {
    const mark = document.createElement('readify-mark');
    mark.className = 'readify-highlight';
    
    if (options.hasNotes) mark.classList.add('readify-with-notes');
    if (options.isUnderline) mark.classList.add('readify-underline');
    
    mark.setAttribute('data-highlight-id', options.highlightId);
    mark.setAttribute('data-mark-id', options.markId);
    mark.setAttribute('data-split-type', options.splitType || 'none');
    
    if (options.extraIds) {
        mark.setAttribute('data-highlight-id-extra', options.extraIds.join(';'));
    }
    
    // Apply styles
    if (options.color && !options.isUnderline) {
        mark.style.backgroundColor = options.color;
        mark.style.cursor = 'pointer';
        // Darker border for notes indicator
        if (options.hasNotes) {
            const rgb = hexToRgb(options.color);
            if (rgb) {
                mark.style.borderBottomColor = `rgb(${Math.max(0, rgb.r - 51)}, ${Math.max(0, rgb.g - 51)}, ${Math.max(0, rgb.b - 51)})`;
            }
        }
    }
    
    if (options.isUnderline) {
        mark.style.borderBottom = '2px solid black';
        mark.style.cursor = 'pointer';
    }
    
    return mark;
}

// Helper to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// ============================================
// CROSS-TAG HIGHLIGHTING SYSTEM
// ============================================

function highlightSelectedText(color, noteText = null) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return null;
    }

    const range = temporaryRange || selection.getRangeAt(0);
    if (range.collapsed) return null;

    // For clearing highlights
    if (color === "none" || color === "transparent") {
        return clearHighlightsInRange(range);
    }

    const highlightId = generateHighlightId();
    const markId = generateMarkId();
    const hasNotes = !!noteText;

    // Get all text nodes in the range
    const textNodes = getTextNodesInRange(range);
    
    if (textNodes.length === 0) return null;

    const markData = {
        highlightId,
        markId,
        color,
        hasNotes,
        noteText,
        text: selection.toString(),
        segments: []
    };

    // Process each text node
    textNodes.forEach((nodeInfo, index) => {
        const { node, startOffset, endOffset } = nodeInfo;
        
        // Determine split type
        let splitType = 'none';
        if (textNodes.length > 1) {
            if (index === 0) splitType = 'head';
            else if (index === textNodes.length - 1) splitType = 'tail';
            else splitType = 'both';
        }

        // Create the mark element
        const mark = createMarkElement({
            highlightId,
            markId,
            color,
            hasNotes,
            splitType,
            isUnderline: false
        });

        // Extract and wrap the text
        const textContent = node.textContent;
        const beforeText = textContent.substring(0, startOffset);
        const highlightText = textContent.substring(startOffset, endOffset);
        const afterText = textContent.substring(endOffset);

        // Create new nodes
        const parent = node.parentNode;
        const fragment = document.createDocumentFragment();

        if (beforeText) {
            fragment.appendChild(document.createTextNode(beforeText));
        }

        mark.textContent = highlightText;
        fragment.appendChild(mark);

        if (afterText) {
            fragment.appendChild(document.createTextNode(afterText));
        }

        parent.replaceChild(fragment, node);

        // Store segment info for storage
        markData.segments.push({
            splitType,
            parentTagName: parent.tagName,
            text: highlightText
        });

        // Attach click handler for notes
        if (hasNotes) {
            mark.addEventListener('click', () => showNoteForMark(markId));
        }
    });

    // Clear selection
    selection.removeAllRanges();
    temporaryRange = null;
    removeSelectionBox();

    return markData;
}

// Get all text nodes within a range with their offsets
function getTextNodesInRange(range) {
    const textNodes = [];
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    // Same node case
    if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
        textNodes.push({
            node: startContainer,
            startOffset: startOffset,
            endOffset: endOffset
        });
        return textNodes;
    }

    // Walk through all nodes in range
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const nodeRange = document.createRange();
                nodeRange.selectNodeContents(node);
                
                if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) >= 0 ||
                    range.compareBoundaryPoints(Range.START_TO_END, nodeRange) <= 0) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
        let nodeStart = 0;
        let nodeEnd = currentNode.textContent.length;

        if (currentNode === startContainer) {
            nodeStart = startOffset;
        }
        if (currentNode === endContainer) {
            nodeEnd = endOffset;
        }

        if (nodeEnd > nodeStart && currentNode.textContent.substring(nodeStart, nodeEnd).trim()) {
            textNodes.push({
                node: currentNode,
                startOffset: nodeStart,
                endOffset: nodeEnd
            });
        }

        currentNode = walker.nextNode();
    }

    return textNodes;
}

// Clear highlights in a range
function clearHighlightsInRange(range) {
    const marks = document.querySelectorAll('readify-mark.readify-highlight');
    const clearedIds = new Set();

    marks.forEach(mark => {
        const markRange = document.createRange();
        markRange.selectNodeContents(mark);

        // Check if mark overlaps with selection range
        if (!(range.compareBoundaryPoints(Range.END_TO_START, markRange) >= 0 ||
              range.compareBoundaryPoints(Range.START_TO_END, markRange) <= 0)) {
            
            const highlightId = mark.getAttribute('data-highlight-id');
            clearedIds.add(highlightId);
        }
    });

    // Remove all segments with matching highlight IDs
    clearedIds.forEach(id => {
        removeHighlightById(id);
    });

    window.getSelection()?.removeAllRanges();
    removeSelectionBox();

    return Array.from(clearedIds);
}

// Remove highlight by ID (removes all segments)
function removeHighlightById(highlightId) {
    const marks = document.querySelectorAll(`readify-mark[data-highlight-id="${highlightId}"]`);
    
    marks.forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize(); // Merge adjacent text nodes
    });
}

// ============================================
// UNDERLINE SYSTEM
// ============================================

function underlineSelectedText(action = "add") {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return null;

    if (action === "remove") {
        return clearUnderlinesInRange(range);
    }

    const highlightId = generateHighlightId();
    const markId = generateMarkId();

    // Get all text nodes in the range
    const textNodes = getTextNodesInRange(range);
    if (textNodes.length === 0) return null;

    const markData = {
        highlightId,
        markId,
        isUnderline: true,
        text: selection.toString(),
        segments: []
    };

    // Process each text node
    textNodes.forEach((nodeInfo, index) => {
        const { node, startOffset, endOffset } = nodeInfo;
        
        let splitType = 'none';
        if (textNodes.length > 1) {
            if (index === 0) splitType = 'head';
            else if (index === textNodes.length - 1) splitType = 'tail';
            else splitType = 'both';
        }

        const mark = createMarkElement({
            highlightId,
            markId,
            splitType,
            isUnderline: true
        });

        const textContent = node.textContent;
        const beforeText = textContent.substring(0, startOffset);
        const underlineText = textContent.substring(startOffset, endOffset);
        const afterText = textContent.substring(endOffset);

        const parent = node.parentNode;
        const fragment = document.createDocumentFragment();

        if (beforeText) {
            fragment.appendChild(document.createTextNode(beforeText));
        }

        mark.textContent = underlineText;
        fragment.appendChild(mark);

        if (afterText) {
            fragment.appendChild(document.createTextNode(afterText));
        }

        parent.replaceChild(fragment, node);

        markData.segments.push({
            splitType,
            parentTagName: parent.tagName,
            text: underlineText
        });
    });

    selection.removeAllRanges();
    removeColorPicker();
    removeSelectionBox();

    return markData;
}

function clearUnderlinesInRange(range) {
    const marks = document.querySelectorAll('readify-mark.readify-underline');
    const clearedIds = new Set();

    marks.forEach(mark => {
        const markRange = document.createRange();
        markRange.selectNodeContents(mark);

        if (!(range.compareBoundaryPoints(Range.END_TO_START, markRange) >= 0 ||
              range.compareBoundaryPoints(Range.START_TO_END, markRange) <= 0)) {
            
            const highlightId = mark.getAttribute('data-highlight-id');
            clearedIds.add(highlightId);
        }
    });

    clearedIds.forEach(id => {
        removeHighlightById(id);
    });

    window.getSelection()?.removeAllRanges();
    removeColorPicker();
    removeSelectionBox();

    return Array.from(clearedIds);
}

function isExactUnderlineSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const underlines = document.querySelectorAll('readify-mark.readify-underline');
    
    return Array.from(underlines).some(underline => {
        const underlineRange = document.createRange();
        underlineRange.selectNodeContents(underline);
        return range.compareBoundaryPoints(Range.START_TO_START, underlineRange) >= 0 &&
               range.compareBoundaryPoints(Range.END_TO_END, underlineRange) <= 0;
    });
}

// ============================================
// NOTE SYSTEM
// ============================================

function showNoteForMark(markId) {
    // Find all marks with this ID
    const marks = document.querySelectorAll(`readify-mark[data-mark-id="${markId}"]`);
    if (marks.length === 0) return;

    // Get note from storage and show note input
    getURLDigest().then(async urlDigest => {
        const isPremium = window.ReadifySubscription ? await window.ReadifySubscription.isPremium() : false;
        const siteData = isPremium ? await loadFromSupabase(urlDigest) : await loadSiteFromLocal(urlDigest);
        const noteText = siteData?.notes?.[markId] || '';
        
        // Show note input near the first mark
        showNoteInput(noteText, marks[0]);
    });
}

function addNoteToHighlight(markId, noteText) {
    const marks = document.querySelectorAll(`readify-mark[data-mark-id="${markId}"]`);
    
    marks.forEach(mark => {
        if (noteText && noteText.trim()) {
            mark.classList.add('readify-with-notes');
            // Add border indicator
            const color = mark.style.backgroundColor;
            if (color) {
                const rgb = hexToRgb(color) || parseRgb(color);
                if (rgb) {
                    mark.style.borderBottomColor = `rgb(${Math.max(0, rgb.r - 51)}, ${Math.max(0, rgb.g - 51)}, ${Math.max(0, rgb.b - 51)})`;
                }
            }
        } else {
            mark.classList.remove('readify-with-notes');
            mark.style.borderBottomColor = '';
        }
    });
}

// Parse rgb(r, g, b) string
function parseRgb(rgbString) {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        };
    }
    return null;
}

// ============================================
// RESTORATION SYSTEM
// ============================================

function restoreHighlight(changeData) {
    const { type, data, markId, highlightId, segments, text, noteText } = changeData;
    
    if (!text || !segments || segments.length === 0) {
        console.warn('Cannot restore highlight: missing data');
        return false;
    }

    // Try to find the text in the page
    const textToFind = text;
    const textNodes = findTextInPage(textToFind);
    
    if (textNodes.length === 0) {
        console.warn('Could not find text to restore:', textToFind.substring(0, 50));
        return false;
    }

    // Restore the highlight
    segments.forEach((segment, index) => {
        // Find matching text node
        if (index < textNodes.length) {
            const nodeInfo = textNodes[index];
            const mark = createMarkElement({
                highlightId: highlightId || generateHighlightId(),
                markId: markId || generateMarkId(),
                color: data,
                hasNotes: !!noteText,
                splitType: segment.splitType,
                isUnderline: type === 'underline'
            });

            // Wrap the text
            const { node, startOffset, endOffset } = nodeInfo;
            const parent = node.parentNode;
            const textContent = node.textContent;
            const fragment = document.createDocumentFragment();

            if (startOffset > 0) {
                fragment.appendChild(document.createTextNode(textContent.substring(0, startOffset)));
            }

            mark.textContent = textContent.substring(startOffset, endOffset);
            fragment.appendChild(mark);

            if (endOffset < textContent.length) {
                fragment.appendChild(document.createTextNode(textContent.substring(endOffset)));
            }

            parent.replaceChild(fragment, node);

            // Attach note click handler
            if (noteText) {
                mark.addEventListener('click', () => showNoteForMark(markId));
            }
        }
    });

    return true;
}

// Find text in the page (returns text nodes with offsets)
function findTextInPage(searchText) {
    const results = [];
    const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
    
    // Get all text nodes
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );

    let fullText = '';
    const nodeMap = [];
    let node;

    while (node = walker.nextNode()) {
        const text = node.textContent;
        nodeMap.push({
            node,
            start: fullText.length,
            end: fullText.length + text.length
        });
        fullText += text;
    }

    // Find the search text
    const normalizedFull = fullText.replace(/\s+/g, ' ');
    const searchIndex = normalizedFull.indexOf(normalizedSearch);
    
    if (searchIndex === -1) return results;

    // Map back to original positions
    let currentPos = 0;
    let matchStart = searchIndex;
    let matchEnd = searchIndex + normalizedSearch.length;

    for (const { node, start, end } of nodeMap) {
        if (end <= matchStart) continue;
        if (start >= matchEnd) break;

        const nodeStart = Math.max(0, matchStart - start);
        const nodeEnd = Math.min(node.textContent.length, matchEnd - start);

        if (nodeEnd > nodeStart) {
            results.push({
                node,
                startOffset: nodeStart,
                endOffset: nodeEnd
            });
        }
    }

    return results;
}

// ============================================
// STYLES INJECTION
// ============================================

function injectHighlightStyles() {
    if (document.getElementById('readify-highlight-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'readify-highlight-styles';
    style.textContent = `
        readify-mark {
            display: inline;
            padding: 0;
            margin: 0;
        }
        
        readify-mark.readify-highlight {
            border-radius: 2px;
        }
        
        readify-mark.readify-with-notes {
            border-bottom: 2px solid;
            padding-bottom: 1px;
        }
        
        readify-mark.readify-underline {
            text-decoration: none;
            border-bottom: 2px solid black;
        }
        
        readify-mark:hover {
            filter: brightness(0.95);
        }
    `;
    document.head.appendChild(style);
}

// Auto-inject styles
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectHighlightStyles);
    } else {
        injectHighlightStyles();
    }
}
