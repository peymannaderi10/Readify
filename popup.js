function modifyDOM(action, boldPercent, skipWords, opacityLevel, color) {
    var elements = document.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li');
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
});


var boldRange = document.getElementById('boldRange');
var boldPercent = document.getElementById('boldPercent');
boldRange.addEventListener('input', function() {
    var percent = (parseInt(this.value) + 1) * 10 + 20;
    boldPercent.textContent = percent + '%';

    if (document.getElementById('toggleBold').checked) {
        var percent = (parseInt(this.value) + 1) / 10 + 0.2;
        var wordsToSkip = parseInt(skipRange.value);
        var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + percent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
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
        var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
        });
    }
});

var opacityRange = document.getElementById('opacityRange');
var opacityLevel = document.getElementById('opacityLevel');
opacityRange.addEventListener('input', function() {
    var opacity = parseInt(this.value) * 0.225 + 0.1;
    opacityLevel.textContent = 'Opacity ' + (opacity * 100).toFixed(0) + '%';

    if (document.getElementById('toggleBold').checked) {
        var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
        var wordsToSkip = parseInt(skipRange.value);
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
        });
    }
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
});

document.getElementById('readPage').addEventListener('click', function() {
    chrome.tabs.executeScript({
        code: `
        var utterance = new SpeechSynthesisUtterance();
        utterance.text = document.body.innerText;
        window.speechSynthesis.speak(utterance);
        `
    });
});
