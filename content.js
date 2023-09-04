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
    closeButton.addEventListener('click', function() {
        parent.remove();
    });
    parent.appendChild(closeButton);
}
async function summarizeText(text) {
    const url = 'https://text-summarize-pro.p.rapidapi.com/summarizeFromText';
const options = {
	method: 'POST',
	headers: {
		'content-type': 'application/x-www-form-urlencoded',
		'X-RapidAPI-Key': '3cdc0f83bamsh352682d013fb8c3p17e2e4jsn2195a6a640eb',
		'X-RapidAPI-Host': 'text-summarize-pro.p.rapidapi.com'
	},
	body: new URLSearchParams({
		text: text,
        percentage: '40'
	})
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

    // Create a container div instead of directly creating a textarea.
    summaryBox = document.createElement('div');
    summaryBox.style.position = 'fixed';
    summaryBox.style.left = selectionBox.style.left;
    summaryBox.style.top = (parseFloat(selectionBox.style.top) + 60) + 'px';
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
    let positionLeft = anchorElement ? anchorElement.getBoundingClientRect().left : parseFloat(selectionBox.style.left);
    let positionTop = anchorElement ? anchorElement.getBoundingClientRect().bottom + 5 : parseFloat(selectionBox.style.top) + 60;
    
    summaryBox.style.left = positionLeft + 'px';
    summaryBox.style.top = positionTop + 'px';
    summaryBox.style.width = '30vw';
    summaryBox.style.maxWidth = '500px';
    summaryBox.style.minHeight = '20vh';
    summaryBox.style.backgroundColor = 'white';
    summaryBox.style.border = '1px solid black';
    summaryBox.style.padding = '5px';

    let noteTextArea = document.createElement('textarea');
    noteTextArea.style.width = '30vw';
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
    document.body.appendChild(summaryBox);
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

attachNoteEvents();


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

        // Determine the position based on the visibility of the bottom of the selected text
        let boxTop;
        if (rect.bottom + 60 > window.innerHeight) {  // 60 is an arbitrary number. Adjust if needed.
            // Bottom is out of view, place box at the top of the highlighted text
            boxTop = rect.top - 60;  // Adjust this value as per the expected height of your box.
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
        
        const colors = ["yellow", "green", "orange", "blue"];
        for (const color of colors) {
            let btn = document.createElement('button');
            btn.classList.add('highlight-btn');
            btn.style.backgroundColor = color;
            btn.addEventListener('click', function() {
                highlightSelectedText(color);
            });
            selectionBox.appendChild(btn);
        }


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
