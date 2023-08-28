let selectionBox = null;
let summaryBox = null;
let isDragging = false;
let offsetX, offsetY;

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
        selectionBox = document.createElement('div');
        selectionBox.style.position = 'fixed';
        selectionBox.style.left = rect.left + 'px';
        selectionBox.style.top = (rect.bottom + 5) + 'px';
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
