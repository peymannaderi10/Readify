let selectionBox = null;
let summaryBox = null;
let isDragging = false;
let offsetX, offsetY;
let savedRange = null;

function saveSelection() {
    if (window.getSelection().rangeCount > 0) {
        savedRange = window.getSelection().getRangeAt(0);
    }
}
function restoreSelection() {
    if (savedRange) {
        let selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }
}


function makeDraggable(elem) {
    elem.onmousedown = function(event) {
        isDragging = true;
        
        // Calculating the offset position
        offsetX = event.clientX - elem.getBoundingClientRect().left;
        offsetY = event.clientY - elem.getBoundingClientRect().top;

        document.onmousemove = function(event) {
            if (isDragging) {
                elem.style.left = (event.clientX - offsetX) + 'px';
                elem.style.top = (event.clientY - offsetY) + 'px';
            }
        };

        document.onmouseup = function() {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

function createCloseButton(parent) {
    const closeButton = document.createElement('button');
    closeButton.innerText = 'x';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '5px';
    closeButton.style.top = '5px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';

    closeButton.addEventListener('click', function() {
        parent.remove();
    });
    parent.appendChild(closeButton);
}
async function summarizeText(text) {
    const url = 'https://open-ai21.p.rapidapi.com/summary';
const options = {
	method: 'POST',
	headers: {
		'content-type': 'application/json',
		'X-RapidAPI-Key': '8ccd3fae7emshc43c6ba75dd5fd2p1764aajsn3d60722cf4c1',
		'X-RapidAPI-Host': 'open-ai21.p.rapidapi.com'
	},
	body: {
		text: text
    }
};

try {
	const response = await fetch(url, options);
	const result = await response.json();
	return result.summary;
} catch (error) {
	console.error(error);
}
}

function showSummary(summary) {
    if (summaryBox) summaryBox.remove();

    summaryBox = document.createElement('div');
    summaryBox.style.position = 'fixed';
    summaryBox.style.left = selectionBox.style.left;
    
    // Check if adding the summary box below would push it out of the viewport.
    let potentialBottomPosition = parseFloat(selectionBox.style.top) + 60 + 25 * window.innerHeight / 100;
    if (potentialBottomPosition > window.innerHeight) {
        // Position it above the selection box.
        summaryBox.style.top = (parseFloat(selectionBox.style.top) - 25 * window.innerHeight / 100) + 'px';
    } else {
        summaryBox.style.top = (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height) + 'px';

    }
    summaryBox.style.width = '500px';
    summaryBox.style.height = '25vh';  // Set the height to 50% of the viewport height.
    summaryBox.style.backgroundColor = 'white';
    summaryBox.style.border = '1px solid black';
    summaryBox.style.overflow = 'auto';  // This allows for scrolling if the content exceeds the div size.
    document.body.appendChild(summaryBox);

    const textArea = document.createElement('textarea');
    textArea.style.width = '100%';
    textArea.style.height = '100%';  // Adjust this value based on the height of the close button and desired padding.
    textArea.style.resize = 'none';  // Prevent users from resizing the textarea.
    textArea.style.boxSizing = 'border-box';  // Ensure padding and border are included in height & width.
    textArea.style.padding = '10px';  // Added padding for better appearance.
    textArea.value = summary;

    summaryBox.appendChild(textArea);
    
    createCloseButton(summaryBox);
    makeDraggable(summaryBox);
}



function showNoteInput(initialText, anchorElement) {
    saveSelection();

    if (summaryBox) summaryBox.remove();

    summaryBox = document.createElement('div');
    summaryBox.style.position = 'fixed';
    summaryBox.style.width = '30vw';
    summaryBox.style.maxWidth = '500px';
    summaryBox.style.backgroundColor = 'white';
    summaryBox.style.border = '1px solid black';
    summaryBox.style.padding = '5px';

    let noteTextArea = document.createElement('textarea');
    noteTextArea.style.width = '100%'; // 100% to ensure it takes the full width of its parent div
    noteTextArea.style.maxWidth = '500px';
    noteTextArea.style.minHeight = '20vh';
    noteTextArea.style.resize = 'none';
    noteTextArea.value = initialText || '';

    let cancelButton = document.createElement('button');
    cancelButton.innerText = 'Cancel';
    cancelButton.onclick = function() {
        summaryBox.remove();
    };

    let doneButton = document.createElement('button');
    doneButton.innerText = 'Done';
    doneButton.onclick = function() {
        restoreSelection();
        let noteText = noteTextArea.value.trim();
        if (noteText) {
            if (!anchorElement) {
                createNoteAnchor(noteText);
            } else {
                localStorage.setItem(anchorElement.textContent, noteText);
            }
        }
        summaryBox.remove();
    };

    summaryBox.appendChild(noteTextArea);
    summaryBox.appendChild(cancelButton);
    summaryBox.appendChild(doneButton);

    // Temporarily append to body to get accurate height
    document.body.appendChild(summaryBox);

    let boxHeight = summaryBox.getBoundingClientRect().height;

    let positionLeft = anchorElement ? anchorElement.getBoundingClientRect().left : parseFloat(selectionBox.style.left);
    let spaceAbove = anchorElement ? anchorElement.getBoundingClientRect().top : parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (anchorElement ? anchorElement.getBoundingClientRect().bottom : parseFloat(selectionBox.style.top) + 60);

    let positionTop;
    if (spaceBelow > boxHeight) {
        positionTop = anchorElement ? anchorElement.getBoundingClientRect().bottom + 5 : parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height;
    } else if (spaceAbove > boxHeight) {
        positionTop = spaceAbove - boxHeight;
    } else {
        // Default to above if neither space is sufficient
        positionTop = spaceAbove - boxHeight;
    }

    summaryBox.style.top = positionTop + 'px';
    summaryBox.style.left = positionLeft + 'px';
}



function createNoteAnchor(noteText) {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            let contents = range.extractContents();
            let anchor = document.createElement('a');
            anchor.className = 'note-anchor'; // Add this line
            anchor.href = '#';
            anchor.onclick = function(e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };
            
            // Highlight the anchor text if there's content in the textarea
            let span = document.createElement('span');
            span.style.backgroundColor = "yellow"; // Choose the desired highlight color here
            span.appendChild(contents);
            anchor.appendChild(span);
            
            range.insertNode(anchor);
            localStorage.setItem(anchor.textContent, noteText);
            window.getSelection().removeAllRanges();
        }
    }
}


function attachNoteEvents() {
    document.querySelectorAll('a').forEach(anchor => {
        if (localStorage.getItem(anchor.textContent)) {
            anchor.onclick = function(e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };
        }
    });
}
let colorPickerDialog = null; // Declare this at the top of your script to keep a reference to the color picker dialog



attachNoteEvents();
function showColorPicker(selection) {
    removeColorPicker();  // remove existing color picker if there's any

    // Create the color picker
    const colorPicker = document.createElement('div');
    colorPicker.setAttribute('id', 'colorPickerDialog');
    colorPicker.style.border = '1px solid #ccc';
    colorPicker.style.backgroundColor = '#fff';
    colorPicker.style.position = 'fixed';
    colorPicker.style.zIndex = 9999;

    const colorInput = document.createElement('input');
    colorInput.setAttribute('type', 'color');
    colorPicker.appendChild(colorInput);

    const applyButton = document.createElement('button');
    applyButton.innerText = 'Apply';
    applyButton.onclick = function() {
        const color = colorInput.value;
        highlightSelectedText(color);
        removeColorPicker();
    };
    colorPicker.appendChild(applyButton);

    // Create the cancel button
    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'Cancel';
    cancelButton.onclick = function() {
        removeColorPicker();
    };
    colorPicker.appendChild(cancelButton); // Append it next to the apply button

    // Use the selectionBox to position the color picker
    const boxRect = selectionBox.getBoundingClientRect();

    // Position the color picker above the selection box
    colorPicker.style.left = boxRect.left + 'px';
    colorPicker.style.top = (boxRect.top - boxRect.height+4) + 'px';

    colorPickerDialog = colorPicker;
    document.body.appendChild(colorPicker);
    document.addEventListener('mousedown', handleDocumentClick);
}




function removeColorPicker() {
    if (colorPickerDialog) {
        document.body.removeChild(colorPickerDialog);
        colorPickerDialog = null;
    }
    document.removeEventListener('mousedown', handleDocumentClick);
}


// Function to show selection box
function showSelectionBox(evt) {
    if (selectionBox && selectionBox.contains(evt.target)) {
        console.log('Inside selection box');
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

        selectionBox = document.createElement('div');
        selectionBox.style.position = 'fixed';
        selectionBox.style.left = rect.left + 'px';
        selectionBox.style.top = boxTop + 'px';
        selectionBox.style.backgroundColor = 'white';
        selectionBox.style.border = '1px solid black';
        selectionBox.style.padding = '5px';
        selectionBox.style.display = 'flex';
        selectionBox.style.gap = '5px';

        // Color picker button
        const colorPickerButton = document.createElement('button');
        colorPickerButton.innerText = "Choose Color";
        colorPickerButton.addEventListener('click', function() {
            const selection = window.getSelection();
            showColorPicker(selection);
        });

        selectionBox.appendChild(colorPickerButton);

        const summaryBtn = document.createElement('button');
        summaryBtn.innerText = "Summarize";
        summaryBtn.addEventListener('click', async function() {
            const text = window.getSelection().toString();
            const summarizedText = await summarizeText(text);
            showSummary(summarizedText);
        });

        selectionBox.appendChild(summaryBtn);
        
        const noteButton = document.createElement('button');
        noteButton.innerText = "Note";
        noteButton.addEventListener('click', function() {
            showNoteInput();
        });

        selectionBox.appendChild(noteButton);

        document.body.appendChild(selectionBox);
    }
}


function highlightSelectedText(color) {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            let contents = range.extractContents();
            let span = document.createElement('span');
            span.style.backgroundColor = color;
            span.appendChild(contents);
            range.insertNode(span);
            window.getSelection().removeAllRanges();
        }
    }
    removeSelectionBox();
}


function removeSelectionBox() {
    if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }
}

function handleMouseUp(evt) {
    showSelectionBox(evt);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.enabled) {
        document.addEventListener('mouseup', handleMouseUp);
    } else {
        document.removeEventListener('mouseup', handleMouseUp);
        removeSelectionBox();
    }
});

chrome.storage.local.get('enabled', function(data) {
    if (data.enabled) {
        document.addEventListener('mouseup', handleMouseUp);
    }
});


function handleDocumentClick(event) {
    let colorPicker = document.getElementById('colorPickerDialog'); 
    // Ensuring the selectionBox is accessible in this scope
    if (!colorPicker.contains(event.target) && !selectionBox.contains(event.target)) {
        colorPicker.style.display = 'none';
        selectionBox.style.display = 'none';
    }
}