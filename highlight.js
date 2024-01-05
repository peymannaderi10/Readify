document.addEventListener("DOMContentLoaded", function () {
    const enableCheckbox = document.getElementById("enableCheckbox");
    const deleteChangesButton = document.getElementById("deleteChangesButton");

    // Initially set the deleteChangesButton state
    chrome.storage.sync.get("enabled", function (data) {
        enableCheckbox.checked = data.enabled || false;
        deleteChangesButton.disabled = !data.enabled;
    });

    // When checkbox changes, save its state and toggle the deleteChangesButton
    enableCheckbox.addEventListener("change", function () {
        let isChecked = this.checked;

        if (isChecked) {
            // Show the modal
            var modal = new bootstrap.Modal(document.getElementById("confirmationModal"));
            modal.show();

            // On Confirm
            document.getElementById("confirmBtn").addEventListener("click", function () {
                saveCheckboxState(isChecked);
                deleteChangesButton.disabled = false;
                modal.hide();
            });

            // On Cancel
            document.getElementById("cancelBtn").addEventListener("click", function () {
                enableCheckbox.checked = false; // Uncheck the checkbox
                deleteChangesButton.disabled = true;
                modal.hide();
            });
        } else {
            saveCheckboxState(isChecked);
            deleteChangesButton.disabled = true;
        }
    });

    // Function to save the checkbox state and send a message to the content script
    function saveCheckboxState(enabled) {
        chrome.storage.sync.set({ enabled: enabled }, function () {
            // Send a message to the content script to enable/disable
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { enabled: enabled });
            });
        });
    }

    // Add click listener to deleteChangesButton
    deleteChangesButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "deleteChanges"});
        });
    });
});
