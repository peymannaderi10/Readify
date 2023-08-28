let selectionBox = null;

// Function to show selection box
function showSelectionBox() {
  removeSelectionBox();
  let selection = window.getSelection();
  if (selection.toString().length > 0) {
    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();
    selectionBox = document.createElement('div');
    selectionBox.style.position = 'fixed';
    selectionBox.style.left = rect.left + 'px';
    selectionBox.style.top = (rect.bottom + 5) + 'px';
    selectionBox.style.width = '100px';
    selectionBox.style.height = '50px';
    selectionBox.style.backgroundColor = 'white';
    selectionBox.style.border = '1px solid black';
    document.body.appendChild(selectionBox);
  }
}

// Function to remove selection box
function removeSelectionBox() {
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

// Function to handle mouseup event
function handleMouseUp() {
  showSelectionBox();
}

// Listen for messages from the popup to enable/disable
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.enabled) {
    document.addEventListener('mouseup', handleMouseUp);
  } else {
    document.removeEventListener('mouseup', handleMouseUp);
    removeSelectionBox();
  }
});

// Initial check if enabled
chrome.storage.local.get('enabled', function(data) {
  if (data.enabled) {
    document.addEventListener('mouseup', handleMouseUp);
  }
});
