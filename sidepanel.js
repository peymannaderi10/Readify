// On sidepanel load
document.addEventListener("DOMContentLoaded", function () {
    // Initialize Study Mode state
    chrome.storage.sync.get(["extensionEnabled"], function(result) {
        const enableCheckbox = document.getElementById("enableCheckbox");
        const deleteButton = document.getElementById("deleteChangesButton");
        const toggleLabel = enableCheckbox.closest('.modern-toggle');
        const toggleText = toggleLabel.querySelector('.toggle-text');
        
        enableCheckbox.checked = result.extensionEnabled || false;
        deleteButton.disabled = !enableCheckbox.checked;
        toggleText.textContent = enableCheckbox.checked ? 'Disable Study Mode' : 'Enable Study Mode';
    });
});

function modifyDOM(action, boldPercent, skipWords, opacityLevel, color) {
    var elements = document.querySelectorAll("p,h1,h2,h3,h4,h5,h6,span.wrapped-text");
    elements.forEach(function (elem) {
        if (!elem.classList.contains("note-anchor")) {
            if (action === "increase") {
                elem.style.lineHeight = parseFloat(getComputedStyle(elem).lineHeight) + 3 + "px";
            } else if (action === "decrease") {
                elem.style.lineHeight = parseFloat(getComputedStyle(elem).lineHeight) - 3 + "px";
            }
        }
    });
}

document.getElementById("increase").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: modifyDOM,
            args: ["increase", 0, 0, 1, "black"],
        });
    });
});

document.getElementById("decrease").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: modifyDOM,
            args: ["decrease", 0, 0, 1, "black"],
        });
    });
});

// Study Mode Toggle
document.getElementById("enableCheckbox").addEventListener("change", function(event) {
    const toggleLabel = event.target.closest('.modern-toggle');
    const toggleText = toggleLabel.querySelector('.toggle-text');
    toggleText.textContent = event.target.checked ? 'Disable Study Mode' : 'Enable Study Mode';
    
    // Save the extension state
    chrome.storage.sync.set({ extensionEnabled: event.target.checked });
    
    // Get current tab and send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggleExtension",
            enabled: event.target.checked
        });
    });
    
    // Update delete button state
    const deleteButton = document.getElementById("deleteChangesButton");
    deleteButton.disabled = !event.target.checked;
});

// Delete Changes Button
document.getElementById("deleteChangesButton").addEventListener("click", function() {
    // Show confirmation modal
    const modal = document.getElementById("confirmationModal");
    modal.style.display = "flex";
});

// Modal event listeners
document.getElementById("cancelBtn").addEventListener("click", function() {
    const modal = document.getElementById("confirmationModal");
    modal.style.display = "none";
});

document.getElementById("confirmBtn").addEventListener("click", function() {
    const modal = document.getElementById("confirmationModal");
    modal.style.display = "none";
    
    // Send delete message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "deleteChanges"
        });
    });
});

// Close modal when clicking outside
document.getElementById("confirmationModal").addEventListener("click", function(event) {
    if (event.target === this) {
        this.style.display = "none";
    }
}); 