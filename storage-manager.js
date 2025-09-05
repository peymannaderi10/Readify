// Readify Extension - Storage Manager
// Handles data persistence, restoration, and storage operations

async function saveChangeToDisk(type, data, isDelete = false) {
    let key = `saved-${await getURLDigest()}`;
    let savedChanges = await chrome.storage.sync.get(key);
    let changes = savedChanges[key] || [];
    
    if (isDelete) {
        // Remove the saved change for the deleted note
        changes = changes.filter(change => !(change.type === 'note' && change.data === data));
    } else {
        let range = serializeSelection();
        changes.push({ type, range, data });
    }

    chrome.storage.sync.set({ [key]: changes });
}

async function restoreChangesFromDisk(i = 0) {
    try {
        let key = `saved-${await getURLDigest()}`;
        const saved = await chrome.storage.sync.get(key);
        const results = saved[key];

        if (results) {
            for (const result of results) {
                let { type, range, data } = result;
                let startContainer = document.body;
                let endContainer = document.body;

                for (let i = 0; i < range.startContainerPath.length; i++) {
                    startContainer = startContainer.childNodes[range.startContainerPath[i]];
                }

                for (let i = 0; i < range.endContainerPath.length; i++) {
                    endContainer = endContainer.childNodes[range.endContainerPath[i]];
                }

                let selection = window.getSelection();
                let newRange = document.createRange();
                newRange.setStart(startContainer, range.startOffset);
                newRange.setEnd(endContainer, range.endOffset);
                selection.removeAllRanges();
                selection.addRange(newRange);

                switch (type) {
                    case "highlight":
                        highlightSelectedText(data);
                        break;
                        
                    case "underline":
                        underlineSelectedText();
                        break;
                    case "underlineRemove":
                        underlineSelectedText("remove");
                        break;

                    case "note":
                        if (!localStorage.getItem(data)) {
                            // Only restore the note if it hasn't been deleted
                            createNoteAnchor(data);
                        }
                        break;
                }
            }
        } else {
            console.log("No data found");
        }
    } catch (e) {
        if (i < 10) {
            setTimeout(() => {
                restoreChangesFromDisk(i + 1);
            }, 1000);
        }
    }
}

async function deleteChangesFromDisk() {
    let key = `saved-${await getURLDigest()}`;

    chrome.storage.sync.remove(key, function() {
        console.log(`All changes under the key '${key}' have been deleted.`);
        // Refresh the page after deletion
        location.reload();
    });
}

// Note management functions
function attachNoteEvents() {
    document.querySelectorAll("a").forEach((anchor) => {
        if (localStorage.getItem(anchor.textContent)) {
            anchor.onclick = function (e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };
        }
    });
}

function createNoteAnchor(noteText) {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            let contents = range.extractContents();
            let anchor = document.createElement("a");
            anchor.className = "note-anchor";
            anchor.href = "#";
            anchor.onclick = function (e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };

            // Highlight the anchor text if there's content in the textarea
            let span = document.createElement("span");
            span.style.backgroundColor = "yellow";
            span.appendChild(contents);
            anchor.appendChild(span);

            range.insertNode(anchor);
            localStorage.setItem(anchor.textContent, noteText);
            window.getSelection().removeAllRanges();
        }
    }
} 