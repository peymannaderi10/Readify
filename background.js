importScripts("./extpay.js");

var extpay = ExtPay("readify-dev");
extpay.startBackground();

// Handle extension icon click to open sidepanel
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Open the sidepanel
        await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
        console.error('Failed to open sidepanel:', error);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
        setTimeout(() => {
            if (changeInfo.status === "complete" && tab.active) {
                chrome.storage.sync.get("settings_" + tabId, function (data) {
                    const settings = data["settings_" + tabId];
                    if (settings && settings.toggleBoldState) {
                        const boldPercent = (parseInt(settings.boldRangeValue) + 1) / 10 + 0.2;
                        const wordsToSkip = parseInt(settings.skipRangeValue);
                        const opacity = parseInt(settings.opacityRangeValue) * 0.225 + 0.1;
                        const color = settings.boldedColor;

                        const code = `(${modifyDOM.toString()})("toggleBold", ${boldPercent}, ${wordsToSkip}, ${opacity}, "${color}");`;

                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            func: modifyDOM,
                            args: ["toggleBold", boldPercent, wordsToSkip, opacity, color],
                        });
                    }
                    // No need for an else block to handle the "untoggleBold" action as the default state of the page will not have the bold effects.
                });
            }
        }, 300); // delay of 300ms
    }
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
            }
        }
    });
}
