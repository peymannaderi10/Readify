let selectionBox = null;

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
