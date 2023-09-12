document.addEventListener('DOMContentLoaded', function() {

  // When checkbox changes, save its state
  document.getElementById('enableCheckbox').addEventListener('change', function() {

      let checkbox = this;

      if (checkbox.checked) {
          // Show the modal
          var modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
          modal.show();
          

          // On Confirm
          document.getElementById('confirmBtn').addEventListener('click', function() {
              saveCheckboxState(checkbox.checked);
              modal.hide();
            });

          // On Cancel
          document.getElementById('cancelBtn').addEventListener('click', function() {
              checkbox.checked = false;  // Uncheck the checkbox
              modal.hide();
            });
      } else {
          saveCheckboxState(checkbox.checked);
      }
  });

  // Function to save the checkbox state and send a message to the content script
  function saveCheckboxState(enabled) {
      chrome.storage.local.set({ enabled: enabled }, function() {
          // Send a message to the content script to enable/disable
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
              chrome.tabs.sendMessage(tabs[0].id, { enabled: enabled });
          });
      });
  }

  // Load the saved checkbox state when the popup is opened
  chrome.storage.local.get('enabled', function(data) {
      document.getElementById('enableCheckbox').checked = data.enabled || false;
  });
});
