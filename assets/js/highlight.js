document.addEventListener('DOMContentLoaded', function () {
  // When checkbox changes, save its state
  document.getElementById('enableCheckbox').addEventListener('change', function () {
    let enabled = this.checked;
    chrome.storage.local.set({ enabled: enabled }, function () {
      // Send a message to the content script to enable/disable
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { enabled: enabled });
      });
    });
  });

  // Load the saved checkbox state when the popup is opened
  chrome.storage.local.get('enabled', function (data) {
    document.getElementById('enableCheckbox').checked = data.enabled || false;
  });
});
