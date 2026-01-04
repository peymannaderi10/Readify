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
        const underlineColor = options.color || 'black';
        mark.style.borderBottom = `2px solid ${underlineColor}`;
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

        // Store segment info for storage with position data
        markData.segments.push({
            splitType,
            parentTagName: parent.tagName,
            parentIndex: getElementIndex(parent),
            text: highlightText,
            textOffset: startOffset,
            // Store path for more reliable restoration
            path: getNodePath(parent)
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
            parentIndex: getElementIndex(parent),
            text: underlineText,
            textOffset: startOffset,
            path: getNodePath(parent)
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
        const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
        const siteData = isAuthenticated ? await loadFromSupabase(urlDigest) : await loadSiteFromLocal(urlDigest);
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
            // Store note text as data attribute for session-only mode
            mark.setAttribute('data-note-text', noteText);
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
            mark.removeAttribute('data-note-text');
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

// Get the index of an element among siblings of the same tag
function getElementIndex(element) {
    if (!element || !element.parentNode) return 0;
    const siblings = Array.from(element.parentNode.children).filter(
        el => el.tagName === element.tagName
    );
    return siblings.indexOf(element);
}

// Get a path to a node from body
function getNodePath(node) {
    const path = [];
    let current = node;
    while (current && current !== document.body && current.parentNode) {
        const parent = current.parentNode;
        const index = Array.from(parent.childNodes).indexOf(current);
        path.unshift(index);
        current = parent;
    }
    return path;
}

// Get a node from a path
function getNodeFromPath(path) {
    let current = document.body;
    for (const index of path) {
        if (!current || !current.childNodes || !current.childNodes[index]) {
            return null;
        }
        current = current.childNodes[index];
    }
    return current;
}

// ============================================
// RESTORATION SYSTEM
// ============================================

function restoreHighlight(changeData) {
    const { type, data, markId, highlightId, segments, text, noteText } = changeData;
    
    if (!text) {
        console.warn('Cannot restore highlight: missing text');
        return false;
    }

    // Find all text nodes that contain our full highlight text
    const textNodes = findAllTextNodesForText(text);
    
    if (textNodes.length === 0) {
        console.warn('Could not find text to restore:', text.substring(0, 50));
        return false;
    }

    // Restore in reverse order to prevent DOM position shifts
    const nodesToProcess = [...textNodes].reverse();
    let restoredCount = 0;
    
    for (let i = 0; i < nodesToProcess.length; i++) {
        const nodeInfo = nodesToProcess[i];
        const originalIndex = textNodes.length - 1 - i; // Original forward index
        
        try {
            // Determine split type based on position
            let splitType = 'none';
            if (textNodes.length > 1) {
                if (originalIndex === 0) splitType = 'head';
                else if (originalIndex === textNodes.length - 1) splitType = 'tail';
                else splitType = 'both';
            }
            
            // Create the mark element
            const mark = createMarkElement({
                highlightId: highlightId || generateHighlightId(),
                markId: markId || generateMarkId(),
                color: data,
                hasNotes: !!noteText,
                splitType: splitType,
                isUnderline: type === 'underline'
            });
            
            // Apply the highlight
            const { node, startOffset, endOffset } = nodeInfo;
            const parent = node.parentNode;
            
            // Skip if parent is already a readify-mark (avoid double-wrapping)
            if (parent.tagName === 'READIFY-MARK') {
                continue;
            }
            
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
            
            restoredCount++;
        } catch (e) {
            console.warn('Error restoring segment:', e.message);
        }
    }

    return restoredCount > 0;
}

// Find all text nodes that together contain the full search text
// This handles text that spans across multiple inline elements (a, i, span, etc.)
function findAllTextNodesForText(searchText) {
    const results = [];
    if (!searchText) return results;
    
    // Build a map of all text nodes with their positions in the full text stream
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // Skip script, style, and our own marks
                const parent = node.parentNode;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tagName = parent.tagName;
                if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                // Skip hidden elements
                if (parent.offsetParent === null && tagName !== 'BODY') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const nodeMap = [];
    let fullText = '';
    let node;

    while (node = walker.nextNode()) {
        const text = node.textContent;
        if (text.length > 0) {
            nodeMap.push({
                node,
                start: fullText.length,
                end: fullText.length + text.length,
                text: text
            });
            fullText += text;
        }
    }

    // Try to find the search text - first exact match
    let searchIndex = fullText.indexOf(searchText);
    
    // If exact match fails, try with normalized whitespace
    if (searchIndex === -1) {
        const normalizedSearch = searchText.replace(/\s+/g, ' ');
        const normalizedFull = fullText.replace(/\s+/g, ' ');
        const normalizedIndex = normalizedFull.indexOf(normalizedSearch);
        
        if (normalizedIndex !== -1) {
            // Map normalized position back to original
            // Count characters in original that correspond to normalized position
            let origPos = 0;
            let normPos = 0;
            while (normPos < normalizedIndex && origPos < fullText.length) {
                if (/\s/.test(fullText[origPos])) {
                    // Skip extra whitespace
                    while (origPos + 1 < fullText.length && /\s/.test(fullText[origPos + 1])) {
                        origPos++;
                    }
                }
                origPos++;
                normPos++;
            }
            searchIndex = origPos;
        }
    }
    
    if (searchIndex === -1) {
        // Try fuzzy match with first 30 chars and last 30 chars
        const prefix = searchText.substring(0, Math.min(30, searchText.length));
        const suffix = searchText.substring(Math.max(0, searchText.length - 30));
        
        const prefixIndex = fullText.indexOf(prefix);
        const suffixIndex = fullText.indexOf(suffix, prefixIndex);
        
        if (prefixIndex !== -1 && suffixIndex !== -1 && suffixIndex >= prefixIndex) {
            searchIndex = prefixIndex;
        }
    }
    
    if (searchIndex === -1) return results;

    const matchStart = searchIndex;
    const matchEnd = searchIndex + searchText.length;

    // Find all text nodes that overlap with our match
    for (const entry of nodeMap) {
        // Skip nodes that don't overlap with our match range
        if (entry.end <= matchStart) continue;
        if (entry.start >= matchEnd) break;

        // Calculate the portion of this node that's in our match
        const nodeMatchStart = Math.max(0, matchStart - entry.start);
        const nodeMatchEnd = Math.min(entry.text.length, matchEnd - entry.start);

        if (nodeMatchEnd > nodeMatchStart) {
            results.push({
                node: entry.node,
                startOffset: nodeMatchStart,
                endOffset: nodeMatchEnd
            });
        }
    }

    return results;
}

// Find text in the page (returns text nodes with offsets) - simplified version
function findTextInPage(searchText) {
    return findAllTextNodesForText(searchText);
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
