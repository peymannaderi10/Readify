function getCurrentTabSettingsKey(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTabId = tabs[0].id;
        var settingsKey = "settings_" + currentTabId;
        callback(settingsKey);
    });
}

function updateStorageSettings() {
    getCurrentTabSettingsKey(function (settingsKey) {
        var saveObj = {};
        saveObj[settingsKey] = {
            toggleBoldState: document.getElementById("toggleBold").checked,
            boldRangeValue: boldRange.value,
            opacityRangeValue: opacityRange.value,
            skipRangeValue: skipRange.value,
            boldedColor: colorSelect.value,
        };
        chrome.storage.sync.set(saveObj);
    });
}

function updateUI(isEnabled) {
    // Get references to the slider elements and select element
    var boldRange = document.getElementById("boldRange");
    var skipRange = document.getElementById("skipRange");
    var opacityRange = document.getElementById("opacityRange");
    var colorSelect = document.getElementById("colorSelect");

    // Disable or enable the UI elements based on the checkbox state
    boldRange.disabled = !isEnabled;
    skipRange.disabled = !isEnabled;
    opacityRange.disabled = !isEnabled;
    colorSelect.disabled = !isEnabled;
}

function updateToggleText(isEnabled, toggleElement) {
    const toggleText = toggleElement.querySelector('.toggle-text');
    if (toggleText) {
        toggleText.textContent = isEnabled ? 'Disable Reading Mode' : 'Enable Reading Mode';
    }
}

// On sidepanel load
document.addEventListener("DOMContentLoaded", function () {
    getCurrentTabSettingsKey(function (settingsKey) {
        chrome.storage.sync.get(settingsKey, function (data) {
            var settings = data[settingsKey];
            if (settings) {
                // Update the toggle text and state
                const toggleBold = document.getElementById("toggleBold");
                const toggleLabel = toggleBold.closest('.modern-toggle');
                
                updateToggleText(settings.toggleBoldState, toggleLabel);
                updateUI(settings.toggleBoldState);
                
                toggleBold.checked = settings.toggleBoldState || false;
                document.getElementById("boldRange").value = settings.boldRangeValue || "1";
                document.getElementById("opacityRange").value = settings.opacityRangeValue || "4";
                document.getElementById("skipRange").value = settings.skipRangeValue || "0";
                document.getElementById("colorSelect").value = settings.boldedColor || "black";
            }
        });
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
            } else if (action === "toggleBold") {
                var words = elem.innerText.split(" ");
                var newContent = "";
                var skipCounter = 0;
                words.forEach(function (word, index) {
                    var boldCharCount = Math.floor(word.length * boldPercent);
                    if (skipCounter === 0) {
                        newContent +=
                            '<b style="color:' +
                            color +
                            '">' +
                            word.substr(0, boldCharCount) +
                            '</b><span style="opacity:' +
                            opacityLevel +
                            '">' +
                            word.substr(boldCharCount) +
                            "</span> ";
                        skipCounter = skipWords;
                    } else {
                        newContent += '<span style="opacity:' + opacityLevel + '">' + word + "</span> ";
                        skipCounter--;
                    }
                });
                elem.innerHTML = newContent;
            } else if (action === "untoggleBold") {
                elem.innerHTML = elem.innerText;
                window.location.reload();
            }
        }
    });
}

var timeout;
var colorSelect = document.getElementById("colorSelect");

document.getElementById("increase").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: modifyDOM,
            args: ["increase", 0, 0, 1, colorSelect.value],
        });
    });
});

document.getElementById("decrease").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: modifyDOM,
            args: ["decrease", 0, 0, 1, colorSelect.value],
        });
    });
});

colorSelect.addEventListener("change", function () {
    var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
    var wordsToSkip = parseInt(skipRange.value);
    var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: modifyDOM,
            args: ["toggleBold", boldPercent, wordsToSkip, opacity, colorSelect.value],
        });
    });
    updateStorageSettings();
});

var boldRange = document.getElementById("boldRange");
boldRange.addEventListener("input", function () {
    var value = this.value;
    var boldPercent = (parseInt(value) + 1) / 10 + 0.2;
    var wordsToSkip = parseInt(skipRange.value);
    var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;

    clearTimeout(timeout);
    timeout = setTimeout(function () {
        if (document.getElementById("toggleBold").checked) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                var currentTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    func: modifyDOM,
                    args: ["toggleBold", boldPercent, wordsToSkip, opacity, colorSelect.value],
                });
            });
        }
    }, 500);
    updateStorageSettings();
});

var skipRange = document.getElementById("skipRange");
skipRange.addEventListener("input", function () {
    var value = this.value;
    var wordsToSkip = parseInt(value);
    var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
    var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;

    clearTimeout(timeout);
    timeout = setTimeout(function () {
        if (document.getElementById("toggleBold").checked) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                var currentTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    func: modifyDOM,
                    args: ["toggleBold", boldPercent, wordsToSkip, opacity, colorSelect.value],
                });
            });
        }
    }, 500);
    updateStorageSettings();
});

var opacityRange = document.getElementById("opacityRange");
opacityRange.addEventListener("input", function () {
    var value = this.value;
    var opacity = parseInt(value) * 0.225 + 0.1;
    var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
    var wordsToSkip = parseInt(skipRange.value);

    clearTimeout(timeout);
    timeout = setTimeout(function () {
        if (document.getElementById("toggleBold").checked) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                var currentTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    func: modifyDOM,
                    args: ["toggleBold", boldPercent, wordsToSkip, opacity, colorSelect.value],
                });
            });
        }
    }, 500);
    updateStorageSettings();
});

// Updated toggle event listeners for new structure
document.getElementById("toggleBold").addEventListener("change", function (event) {
    var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
    var wordsToSkip = parseInt(skipRange.value);
    var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
    
    const toggleLabel = event.target.closest('.modern-toggle');
    updateToggleText(event.target.checked, toggleLabel);
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];
        if (event.target.checked) {
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: modifyDOM,
                args: ["toggleBold", boldPercent, wordsToSkip, opacity, colorSelect.value],
            });
        } else {
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: modifyDOM,
                args: ["untoggleBold", 0, 0, 1, colorSelect.value],
            });
        }
    });
    updateStorageSettings();
    updateUI(event.target.checked);
});

// Study Mode Toggle
document.getElementById("enableCheckbox").addEventListener("change", function(event) {
    const toggleLabel = event.target.closest('.modern-toggle');
    const toggleText = toggleLabel.querySelector('.toggle-text');
    toggleText.textContent = event.target.checked ? 'Disable Study Mode' : 'Enable Study Mode';
    
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

// Initialize Study Mode state on load
document.addEventListener("DOMContentLoaded", function() {
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