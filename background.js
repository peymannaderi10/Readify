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
