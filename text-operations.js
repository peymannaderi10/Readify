// Readify Extension - Text Operations
// Handles text highlighting, underlining, and other text manipulations

function wrapDivTextNodesInP() {
    let divs = document.querySelectorAll("div:not(:empty):not(script):not(style):not(link):not(meta)");
    divs.forEach((div) => {
        let children = Array.from(div.childNodes);
        children.forEach((child) => {
            if (child.nodeType === 3 && child.nodeValue.trim() !== "") {
                // Text node
                let wrapper = document.createElement("span");
                wrapper.className = "wrapped-text";
                div.insertBefore(wrapper, child);
                wrapper.appendChild(child);
            }
        });
    });
}

function highlightSelectedText(color) {
    let selection = window.getSelection();
    let range = temporaryRange || (selection.rangeCount > 0 ? selection.getRangeAt(0) : null);

    if (range && !range.collapsed) {
        const processNodes = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                if (color === "none") {
                    // For clearing, just return the text node as is
                    return document.createTextNode(node.nodeValue);
                } else {
                    let span = document.createElement("span");
                    if (color !== "transparent") {
                        span.style.backgroundColor = color;
                    }
                    span.appendChild(document.createTextNode(node.nodeValue));
                    return span;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                let children = Array.from(node.childNodes);
                
                if (color === "none") {
                    // For clearing, if this is a span with only background color, unwrap it
                    if (node.tagName === 'SPAN' && node.style.backgroundColor && 
                        !node.className && !node.id && node.attributes.length <= 1) {
                        // This is likely a highlight span, unwrap its contents
                        let fragment = document.createDocumentFragment();
                        children.forEach(child => {
                            fragment.appendChild(processNodes(child));
                        });
                        return fragment;
                    }
                }
                
                node.innerHTML = '';
                children.forEach(child => {
                    node.appendChild(processNodes(child));
                });
                
                if (node.style.backgroundColor && (color === "transparent" || color === "none")) {
                    node.style.backgroundColor = '';
                }
                return node;
            }
            return node;
        };

        let contents = range.extractContents();

        let newContents = document.createDocumentFragment();
        Array.from(contents.childNodes).forEach(childNode => {
            let processedNode = processNodes(childNode);
            if (processedNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                // If it's a fragment (from unwrapping), append all its children
                while (processedNode.firstChild) {
                    newContents.appendChild(processedNode.firstChild);
                }
            } else {
                newContents.appendChild(processedNode);
            }
        });

        range.insertNode(newContents);
        // Clear the temporary range after use
        temporaryRange = null;
    }

    if (selection) {
        selection.removeAllRanges();
    }

    removeSelectionBox();
}

function underlineSelectedText(action = "add") {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            if (action === "remove") {
                // Function to recursively remove underline spans
                const removeUnderline = (node) => {
                    if (node.nodeName === "SPAN" && node.classList.contains("thicker-underline")) {
                        while (node.firstChild) {
                            node.parentNode.insertBefore(node.firstChild, node);
                        }
                        node.parentNode.removeChild(node);
                    } else {
                        node.childNodes.forEach(child => removeUnderline(child));
                    }
                };

                let ancestor = range.commonAncestorContainer;
                if (ancestor.nodeType !== Node.ELEMENT_NODE) {
                    ancestor = ancestor.parentNode;
                }
                removeUnderline(ancestor);
            } else {
                // Add underline
                let contents = range.extractContents();
                let underlineElem = document.createElement("span");
                underlineElem.className = "thicker-underline";
                underlineElem.appendChild(contents);
                range.insertNode(underlineElem);
            }
            window.getSelection().removeAllRanges();
        }
    }
    removeColorPicker();
    removeSelectionBox();
}

function isExactUnderlineSelection() {
    let selection = window.getSelection();
    if (selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        let underlinedElements = document.getElementsByClassName("thicker-underline");
        return Array.from(underlinedElements).some(underlineElem => {
            let underlineRange = document.createRange();
            underlineRange.selectNodeContents(underlineElem);
            return range.compareBoundaryPoints(Range.START_TO_START, underlineRange) >= 0 &&
                   range.compareBoundaryPoints(Range.END_TO_END, underlineRange) <= 0;
        });
    }
    return false;
} 