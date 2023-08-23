function getCurrentTabSettingsKey(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var currentTabId = tabs[0].id;
        var settingsKey = 'settings_' + currentTabId;
        callback(settingsKey);
    });
}

function updateStorageSettings(){
    getCurrentTabSettingsKey(function(settingsKey) {
        var saveObj = {};
        saveObj[settingsKey] = {
            toggleBoldState: document.getElementById('toggleBold').checked,
            boldRangeValue: boldRange.value,
            opacityRangeValue: opacityRange.value,
            skipRangeValue: skipRange.value,
            boldedColor: colorSelect.value
        };
        chrome.storage.local.set(saveObj);
    });
}

// On popup load
document.addEventListener('DOMContentLoaded', function() {
    getCurrentTabSettingsKey(function(settingsKey) {
        chrome.storage.local.get(settingsKey, function(data) {
            var settings = data[settingsKey];
            if (settings) {
                document.getElementById('toggleBold').checked = settings.toggleBoldState || false;
                document.getElementById('boldRange').value = settings.boldRangeValue || "1";
                document.getElementById('opacityRange').value = settings.opacityRangeValue || "4";
                document.getElementById('skipRange').value = settings.skipRangeValue || "0";
                document.getElementById('colorSelect').value = settings.boldedColor || "black";
                // Add update code for labels if necessary
                document.getElementById('boldPercent').textContent = percent + '%';
                document.getElementById('opacityLevel').textContent = 'Opacity ' + (opacity * 100).toFixed(0) + '%';
                document.getElementById('skipWords').textContent = 'Skip ' + parseInt(skipValue) + ' words';
            } 
        });
    });
});




function modifyDOM(action, boldPercent, skipWords, opacityLevel, color) {
    var elements = document.querySelectorAll('p,h1,h2,h3,h4,h5,h6');
    elements.forEach(function(elem) {
        if (action === 'increase') {
            elem.style.lineHeight = (parseFloat(getComputedStyle(elem).lineHeight) + 3) + 'px';
        } else if (action === 'decrease') {
            elem.style.lineHeight = (parseFloat(getComputedStyle(elem).lineHeight) - 3) + 'px';
        } else if (action === 'toggleBold') {
            var words = elem.innerText.split(' ');
            var newContent = '';
            var skipCounter = 0;
            words.forEach(function(word, index) {
                var boldCharCount = Math.floor(word.length * boldPercent);
                if (skipCounter === 0) {
                    newContent += '<b style="color:' + color + '">' + word.substr(0, boldCharCount) + '</b><span style="opacity:' + opacityLevel + '">' + word.substr(boldCharCount) + '</span> ';
                    skipCounter = skipWords;
                } else {
                    newContent += '<span style="opacity:' + opacityLevel + '">' + word + '</span> ';
                    skipCounter--;
                }
            });
            elem.innerHTML = newContent;
        } else if (action === 'untoggleBold') {
            elem.innerHTML = elem.innerText;
        }
    });
}

var timeout;

var colorSelect = document.getElementById('colorSelect');


document.getElementById('increase').addEventListener('click', function() {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("increase", 0, 0, 1, "' + colorSelect.value + '");'
    });
});

document.getElementById('decrease').addEventListener('click', function() {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("decrease", 0, 0, 1, "' + colorSelect.value + '");'
    });
});


colorSelect.addEventListener('change', function() {
    var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
    var wordsToSkip = parseInt(skipRange.value);
    var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
    });
    updateStorageSettings();
});



var boldRange = document.getElementById('boldRange');
var boldPercent = document.getElementById('boldPercent');
boldRange.addEventListener('input', function() {
    var value = this.value;
    var percent = (parseInt(value) + 1) * 10 + 20; 
    boldPercent.textContent = percent + '%';

    clearTimeout(timeout);
    timeout = setTimeout(function() {
        if (document.getElementById('toggleBold').checked) {
            var boldPercent = (parseInt(value) + 1) / 10 + 0.2;
            var wordsToSkip = parseInt(skipRange.value);
            var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
            chrome.tabs.executeScript({
                code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
            });
        }
    }, 500);
    updateStorageSettings();
});


var skipRange = document.getElementById('skipRange');
var skipWords = document.getElementById('skipWords');
skipRange.addEventListener('input', function() {
    var value = this.value; // Capture the value here
    var wordsToSkip = parseInt(value);
    skipWords.textContent = 'Skip ' + wordsToSkip + ' words';

    clearTimeout(timeout);
    timeout = setTimeout(function() { // Apply the delay
        if (document.getElementById('toggleBold').checked) {
            var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
            var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
            chrome.tabs.executeScript({
                code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
            });
        }
    }, 500);
    updateStorageSettings();
});


var opacityRange = document.getElementById('opacityRange');
var opacityLevel = document.getElementById('opacityLevel');
opacityRange.addEventListener('input', function() {
    var value = this.value; // Capture the value here
    var opacity = parseInt(value) * 0.225 + 0.1;
    opacityLevel.textContent = 'Opacity ' + (opacity * 100).toFixed(0) + '%';

    clearTimeout(timeout);
    timeout = setTimeout(function() { // Apply the delay
        if (document.getElementById('toggleBold').checked) {
            var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
            var wordsToSkip = parseInt(skipRange.value);
            chrome.tabs.executeScript({
                code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
            });
        }
    }, 500);
    updateStorageSettings();
});


document.getElementById('toggleBold').addEventListener('change', function() {
    if (this.checked) {
        var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
        var wordsToSkip = parseInt(skipRange.value);
        var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
        });
    } else {
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("untoggleBold", 0, 0, 1, "' + colorSelect.value + '");'
        });
    }
    updateStorageSettings();  // Call this outside of the if-else to ensure settings are always updated.
});

