function modifyDOM(action, boldPercent, skipWords) {
    var elements = document.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li');
    elements.forEach(function(elem) {
        if (action === 'increase') {
            elem.style.lineHeight = (parseFloat(getComputedStyle(elem).lineHeight) + 0.2) + 'px';
        } else if (action === 'decrease') {
            elem.style.lineHeight = (parseFloat(getComputedStyle(elem).lineHeight) - 0.2) + 'px';
        } else if (action === 'toggleBold') {
            var words = elem.innerText.split(' ');
            var newContent = '';
            var skipCounter = 0;
            words.forEach(function(word, index) {
                var boldCharCount = Math.floor(word.length * boldPercent);
                if (skipCounter === 0) {
                    newContent += '<b>' + word.substr(0, boldCharCount) + '</b>' + word.substr(boldCharCount) + ' ';
                    skipCounter = skipWords;
                } else {
                    newContent += word + ' ';
                    skipCounter--;
                }
            });
            elem.innerHTML = newContent;
        } else if (action === 'untoggleBold') {
            elem.innerHTML = elem.innerText;
        }
    });
}

document.getElementById('increase').addEventListener('click', function() {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("increase", 0, 0);'
    });
});

document.getElementById('decrease').addEventListener('click', function() {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("decrease", 0, 0);'
    });
});

var boldRange = document.getElementById('boldRange');
var boldPercent = document.getElementById('boldPercent');
boldRange.addEventListener('input', function() {
    var percent = (parseInt(this.value) + 1) * 10 + 20;
    boldPercent.textContent = percent + '%';

    if (document.getElementById('toggleBold').checked) {
        var percent = (parseInt(this.value) + 1) / 10 + 0.2;
        var wordsToSkip = parseInt(skipRange.value);
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + percent + ', ' + wordsToSkip + ');'
        });
    }
});

var skipRange = document.getElementById('skipRange');
var skipWords = document.getElementById('skipWords');
skipRange.addEventListener('input', function() {
    var wordsToSkip = parseInt(this.value);
    skipWords.textContent = 'Skip ' + wordsToSkip + ' words';

    if (document.getElementById('toggleBold').checked) {
        var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ');'
        });
    }
});

document.getElementById('toggleBold').addEventListener('change', function() {
    if (this.checked) {
        var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
        var wordsToSkip = parseInt(skipRange.value);
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ');'
        });
    } else {
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("untoggleBold", 0, 0);'
        });
    }
});
