function modifyDOM(action, boldPercent) {
    var elements = document.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li');
    elements.forEach(function(elem) {
        if (action === 'increase' || action === 'decrease') {
            var style = window.getComputedStyle(elem, null).getPropertyValue('line-height');
            var lineHeight = parseFloat(style);
    
            if (action === 'increase') {
                lineHeight *= 1.2;
            } else if (action === 'decrease') {
                lineHeight /= 1.2;
            }
            elem.style.lineHeight = lineHeight + 'px';
        } else if (action === 'toggleBold') {
            var words = elem.innerText.split(' ');
            var newContent = '';
            words.forEach(function(word) {
                var boldCharCount = Math.floor(word.length * boldPercent);
                newContent += '<b>' + word.substr(0, boldCharCount) + '</b>' + word.substr(boldCharCount) + ' ';
            });
            elem.innerHTML = newContent;
        } else if (action === 'untoggleBold') {
            elem.innerHTML = elem.innerText;
        }
    });
}

document.getElementById('increase').addEventListener('click', function() {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("increase", 0);'
    });
});

document.getElementById('decrease').addEventListener('click', function() {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("decrease", 0);'
    });
});

var boldRange = document.getElementById('boldRange');
var boldPercent = document.getElementById('boldPercent');
boldRange.addEventListener('input', function() {
    var percent = (parseInt(this.value) + 1) * 10 + 20;
    boldPercent.textContent = percent + '%';

    // Check if toggleBold checkbox is checked, and if so, apply changes immediately
    if (document.getElementById('toggleBold').checked) {
        var percent = (parseInt(this.value) + 1) / 10 + 0.2;
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + percent + ');'
        });
    }
});

document.getElementById('toggleBold').addEventListener('change', function() {
    if (this.checked) {
        var percent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + percent + ');'
        });
    } else {
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("untoggleBold", 0);'
        });
    }
});