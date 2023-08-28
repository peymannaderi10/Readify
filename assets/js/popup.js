function modifyDOM(action, boldPercent, skipWords, opacityLevel, color) {
    var elements = document.querySelectorAll('p,h1,h2,h3,h4,h5,h6');
    elements.forEach(function (elem) {
        if (action === 'increase') {
            elem.style.lineHeight = (parseFloat(getComputedStyle(elem).lineHeight) + 3) + 'px';
        } else if (action === 'decrease') {
            elem.style.lineHeight = (parseFloat(getComputedStyle(elem).lineHeight) - 3) + 'px';
        } else if (action === 'toggleBold') {
            var words = elem.innerText.split(' ');
            var newContent = '';
            var skipCounter = 0;
            words.forEach(function (word, index) {
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


document.getElementById('increase').addEventListener('click', function () {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("increase", 0, 0, 1, "' + colorSelect.value + '");'
    });
});

document.getElementById('decrease').addEventListener('click', function () {
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("decrease", 0, 0, 1, "' + colorSelect.value + '");'
    });
});


colorSelect.addEventListener('change', function () {
    var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
    var wordsToSkip = parseInt(skipRange.value);
    var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
    chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
    });
});



var boldRange = document.getElementById('boldRange');
var boldPercent = document.getElementById('boldPercent');
boldRange.addEventListener('input', function () {
    var value = this.value;
    var percent = (parseInt(value) + 1) * 10 + 20;
    boldPercent.textContent = percent + '%';

    clearTimeout(timeout);
    timeout = setTimeout(function () {
        if (document.getElementById('toggleBold').checked) {
            var boldPercent = (parseInt(value) + 1) / 10 + 0.2;
            var wordsToSkip = parseInt(skipRange.value);
            var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
            chrome.tabs.executeScript({
                code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
            });
        }
    }, 500);
});


var skipRange = document.getElementById('skipRange');
var skipWords = document.getElementById('skipWords');
skipRange.addEventListener('input', function () {
    var value = this.value; // Capture the value here
    var wordsToSkip = parseInt(value);
    skipWords.textContent = 'Skip ' + wordsToSkip + ' words';

    clearTimeout(timeout);
    timeout = setTimeout(function () { // Apply the delay
        if (document.getElementById('toggleBold').checked) {
            var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
            var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
            chrome.tabs.executeScript({
                code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
            });
        }
    }, 500);
});


var opacityRange = document.getElementById('opacityRange');
var opacityLevel = document.getElementById('opacityLevel');
opacityRange.addEventListener('input', function () {
    var value = this.value; // Capture the value here
    var opacity = parseInt(value) * 0.225 + 0.1;
    opacityLevel.textContent = 'Opacity ' + (opacity * 100).toFixed(0) + '%';

    clearTimeout(timeout);
    timeout = setTimeout(function () { // Apply the delay
        if (document.getElementById('toggleBold').checked) {
            var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
            var wordsToSkip = parseInt(skipRange.value);
            chrome.tabs.executeScript({
                code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
            });
        }
    }, 500);
});


document.getElementById('toggleBold').addEventListener('change', function () {
    if (this.checked) {
        document.getElementById("toggleBoldLabel").innerHTML = "Disable Reading Mode"
        var boldPercent = (parseInt(boldRange.value) + 1) / 10 + 0.2;
        var wordsToSkip = parseInt(skipRange.value);
        var opacity = parseInt(opacityRange.value) * 0.225 + 0.1;
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("toggleBold", ' + boldPercent + ', ' + wordsToSkip + ', ' + opacity + ', "' + colorSelect.value + '");'
        });
    } else {
        document.getElementById("toggleBoldLabel").innerHTML = "Enable Reading Mode"
        chrome.tabs.executeScript({
            code: '(' + modifyDOM + ')("untoggleBold", 0, 0, 1, "' + colorSelect.value + '");'
        });
    }
});

document.getElementById('readPage').addEventListener('click', function () {
    chrome.tabs.executeScript({
        code: `
        var utterance = new SpeechSynthesisUtterance();
        var paragraphs = Array.from(document.getElementsByTagName('p'));
        utterance.text = paragraphs.map(p => p.innerText).join(' ');

        window.speechSynthesis.onvoiceschanged = function() {
            var voices = window.speechSynthesis.getVoices();
            var selectedVoice = voices.find(function(voice) {
                return voice.name === 'Google US English'; // This is an example, you can replace 'Google US English' with the name of any other voice you prefer
            });
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            window.speechSynthesis.speak(utterance);
        };
        `
    });
});


const aiSummarizerBtn = document.getElementById('aiSummarizerBtn');

aiSummarizerBtn.addEventListener('click', function () {

    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        const sum_url = tabs[0].url;
        const summary = await summarizeURL(sum_url);

        const summaryBox = document.getElementById('summaryBox');
        summaryBox.value = summary;
    });
});

async function summarizeURL(targetURL) {
    // const url = 'https://article-extractor-and-summarizer.p.rapidapi.com/summarize?url=' + targetURL + '&length=3';
    // const options = {
    //     method: 'GET',
    //     headers: {
    //         'X-RapidAPI-Key': '3cdc0f83bamsh352682d013fb8c3p17e2e4jsn2195a6a640eb',
    //         'X-RapidAPI-Host': 'article-extractor-and-summarizer.p.rapidapi.com'
    //     }
    // };

    // try {
    //     const response = await fetch(url, options);
    //     const result = await response.json();
    //     return result.summary;
    // } catch (error) {
    //     console.error(error);
    // }

    const url = 'https://tldrthis.p.rapidapi.com/v1/model/abstractive/summarize-url/';
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': '3cdc0f83bamsh352682d013fb8c3p17e2e4jsn2195a6a640eb',
            'X-RapidAPI-Host': 'tldrthis.p.rapidapi.com'
        },
        body: {
            url: targetURL,
            min_length: 100,
            max_length: 300,
            is_detailed: false
        }
    };

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result.summary;
    } catch (error) {
        console.error(error);
    }
}