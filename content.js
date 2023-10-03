let selectionBox = null;
let summaryBox = null;
let ttsBox = null;
let isDragging = false;
let offsetX, offsetY;
let savedRange = null;
let extensionEnabled = false;  // Set to false as a default state

const styles = `
.dropdown-container {
    position: relative;
    font-family: 'Arial', sans-serif;
}
.dropdown-menu, .submenu {
    display: none;
    position: absolute;
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid #ddd;
    background-color: #ffffff;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
    border-radius: 4px;
}
.dropdown-menu li, .submenu li {
    padding: 10px 20px;
    cursor: pointer;
    transition: background-color 0.3s;
}
.dropdown-menu li:hover, .submenu li:hover {
    background-color: #f7f7f7;
}
.has-submenu {
    position: relative;
}
.has-submenu:hover .submenu {
    display: block;
    left: 100%;
    top: 0;
    border-left: none;
}
.dropdown-toggle {
    padding: 10px 20px;
    font-size: 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
    outline: none;
    border: 2px solid #000;
    background-color: #B0DCFF;

}
.dropdown-toggle:hover {
    background-color: #0097FF;
}

.submenu {
    max-height: 200px; /* Adjust this value if necessary */
    overflow-y: auto; /* This will show a scrollbar if content exceeds max-height */
    width: 200px; /* This gives a fixed width to the submenu */
}
`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);


let commonButtonStyle = `
padding: 5px 15px;
border-radius: 5px;
border: 1px solid #ccc;
background: transparent;
cursor: pointer;
transition: background-color 0.2s ease;
`;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', afterDOMLoaded);
} else {
    afterDOMLoaded();
}

function afterDOMLoaded() {
    console.log("DOM fully loaded and parsed");
    wrapDivTextNodesInP();
}

function wrapDivTextNodesInP() {
    let divs = document.querySelectorAll('div:not(:empty):not(script):not(style):not(link):not(meta)');
    divs.forEach(div => {
        let children = Array.from(div.childNodes);
        children.forEach(child => {
            if (child.nodeType === 3 && child.nodeValue.trim() !== '') { // Text node
                let wrapper = document.createElement('span');
                wrapper.className = 'wrapped-text';  // Add this line
                div.insertBefore(wrapper, child);
                wrapper.appendChild(child);
                
            }
        });
    });
}


function saveSelection() {
    if (window.getSelection().rangeCount > 0) {
        savedRange = window.getSelection().getRangeAt(0);
    }
}
function restoreSelection() {
    if (savedRange) {
        let selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }
}


function makeDraggable(elem) {
    elem.onmousedown = function (event) {
        // If the mousedown event's target is the textarea, return and don't drag
        if (event.target.tagName.toLowerCase() === 'textarea') {
            return;
        }

        isDragging = true;

        // Calculating the offset position
        offsetX = event.clientX - elem.getBoundingClientRect().left;
        offsetY = event.clientY - elem.getBoundingClientRect().top;

        document.onmousemove = function (event) {
            if (isDragging) {
                elem.style.left = (event.clientX - offsetX) + 'px';
                elem.style.top = (event.clientY - offsetY) + 'px';
            }
        };

        document.onmouseup = function () {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}


function createCloseButton(parent) {
    const closeButton = document.createElement('button');
    closeButton.innerText = 'x';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '10px';
    closeButton.style.top = '10px';
    closeButton.style.background = '#0097FF'; // Set background to the desired color
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '20px';  // Bigger close button
    closeButton.style.cursor = 'pointer';  // Hand cursor for better UX
    closeButton.style.color = 'white';  // Set the "x" color to white
    closeButton.style.width = '30px';  // Set a fixed width for the square
    closeButton.style.height = '27px';  // Set a fixed height for the square
    closeButton.style.display = 'flex';
    closeButton.style.justifyContent = 'center';  // Horizontally center the "x"
    closeButton.style.borderRadius = '3px';  // Slightly rounded corners

    closeButton.onmouseover = function() { this.style.opacity = '0.7'; };  // Reduce opacity on hover for interaction feedback
    closeButton.onmouseout = function() { this.style.opacity = '1'; };

    closeButton.addEventListener('click', function () {
        parent.remove();
    });
    parent.appendChild(closeButton);
}


async function summarizeText(text,option) {

    var requestText = '';

    switch(option){
        case 'summary':
            requestText = "Please summarize the following text and sum up the paragraph without losing any of its meaning. The result should be a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key take aways in clear and concise bullet points.: " + text;
            break;
        case 'shortSummary':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be a short summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly the initial summary should be written in 1-3 sentences.: " + text;
            break;
        case 'longSummary':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be a long summary of the paragraph that is very detailed while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly the initial summary should be written in 3-5 sentences.: " + text;
            break;
        case 'formalTone':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in a formal tone: " + text;
            break;
        case 'casualTone':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in a casual tone :" + text;
            break;
        case 'neutralTone':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in a neutral tone: " + text;
            break;
        case 'spanish':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Spanish Language: " + text;
            break;
         case 'french':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the French Language: " + text;
            break;
         case 'mandarin':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Mandarin Language: " + text;
            break;
         case 'cantonese':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Cantonese Language: " + text;
            break;
         case 'korean':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Korean Language: " + text;
            break;
         case 'japanese':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Japanese Language: " + text;
            break;
         case 'vietnamese':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Vietnamese Language: " + text;
            break;
         case 'punjabi':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Punjabi Language: " + text;
            break;
         case 'arabic':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Arabic Language: " + text;
            break;
        case 'indonesian':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Indonesian Language: " + text;
            break;
        case 'turkish':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Turkish Language: " + text;
            break;
         case 'russian':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Russian Language: " + text;
            break;
        case 'german':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the German Language:: " + text;
            break;
         case 'tagalog':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Tagalog Language: " + text;
            break;
         case 'italian':
            requestText = "Please Summarize the following text and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Italian Language: " + text;
            break;
    }
    const url = 'https://chatgpt-api8.p.rapidapi.com/';
    const encodedApiKey = 'OGNjZDNmYWU3ZW1zaGM0M2M2YmE3NWRkNWZkMnAxNzY0YWFqc24zZDYwNzIyY2Y0YzE='; // Base64 encoded API key
    const decodedApiKey = atob(encodedApiKey); // Decoding the API key
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': decodedApiKey,
            'X-RapidAPI-Host': 'chatgpt-api8.p.rapidapi.com'
        },
        body: JSON.stringify({  

            content: requestText,
            role: 'user'

        })
    };
    
    

    try {
        const response = await fetch(url, options);
        const resultJson = await response.json(); // Parse the response to a JSON object
        return resultJson.message;
    } catch (error) {
        console.error(error);
    }
}


let currentUtterance = null;
let textToSpeak = "";
let pausedPosition = 0;

function createUtterance() {
    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.onboundary = function(event) {
        if (event.name == 'word') {
            pausedPosition = event.charIndex;
        }
    };
    updateUtteranceSettings();
}


function updateUtteranceSettings() {
    if (currentUtterance) {
        const volumeControl = document.getElementById('volumeControl');
        const rateControl = document.getElementById('rateControl');

        currentUtterance.volume = parseFloat(volumeControl.value);
        currentUtterance.rate = parseFloat(rateControl.value);

        // Set the voice to Google UK English male
        currentUtterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google UK English Male');
    }
}

function playSpeech() {
    if (currentUtterance) {
        if (pausedPosition > 0) {
            // If pausedPosition is set, resume from that position
            currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
            updateUtteranceSettings();
            currentUtterance.text = currentUtterance.text.substring(pausedPosition);
            pausedPosition = 0;
        } else {
            speechSynthesis.cancel(); // Cancel any ongoing speech
            createUtterance();
        }

        // Split the text into sentences using ".", "!", "?", ",", and ";"
        const sentences = textToSpeak.match(/[^.!,?;]+[.!?,;]+/g);

        // Play each sentence sequentially
        function playSentence(index) {
            if (index < sentences.length) {
                currentUtterance.text = sentences[index];
                currentUtterance.onend = function () {
                    playSentence(index + 1);
                };
                speechSynthesis.speak(currentUtterance);
            }
        }

        playSentence(0);
    }
}




function pauseSpeech() {
    if (speechSynthesis.speaking) {
        // Pause and record the current position
        speechSynthesis.pause();
    }
}
function removeTTS() {
    if (ttsBox) {
        pauseSpeech();
        document.body.removeChild(ttsBox);
        ttsBox = null;
    }
    document.removeEventListener('mousedown', handleDocumentClick);
}

function showTextToSpeech(text) {
    if(ttsBox){
        removeTTS();
    }
    
    ttsBox = document.createElement('div');
    ttsBox.style.position = 'fixed';
    ttsBox.style.left = selectionBox.style.left;

    let potentialBottomPosition = parseFloat(selectionBox.style.top) + 60 + 25 * window.innerHeight / 100;
    if (potentialBottomPosition > window.innerHeight) {
        ttsBox.style.top = (parseFloat(selectionBox.style.top) - 25 * window.innerHeight / 100) + 'px';
    } else {
        ttsBox.style.top = (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height) + 'px';
    }
    textToSpeak = text;

    ttsBox.style.position = 'fixed';
    ttsBox.style.top = (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10) + 'px';

    ttsBox.style.border = '1px';
    ttsBox.style.background = 'white';
    ttsBox.style.padding = '16px';
    ttsBox.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    ttsBox.style.zIndex = '1000';
    ttsBox.style.display = 'flex';
    ttsBox.style.flexDirection = 'column';
    ttsBox.style.alignItems = 'center';
    const closeButton = document.createElement('button');
    closeButton.innerText = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '0.755em';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', removeTTS);
    ttsBox.appendChild(closeButton);
    

    // Container for Play and Pause buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.width = '100%';

    const playButton = document.createElement('button');
    playButton.style = commonButtonStyle;
    playButton.innerText = 'Play';
    playButton.classList.add('control-button');
    playButton.onclick = function () {
        createUtterance();
        playSpeech();
    };

    const pauseButton = document.createElement('button');
    pauseButton.style = commonButtonStyle;
    pauseButton.style.marginRight = '20px';
    pauseButton.style.marginLeft = '10px';
    pauseButton.innerText = 'Pause';
    pauseButton.classList.add('control-button');
    pauseButton.onclick = pauseSpeech;

    buttonContainer.appendChild(playButton);
    buttonContainer.appendChild(pauseButton);

    const volumeControl = document.createElement('input');
    volumeControl.type = 'range';
    volumeControl.min = '0';
    volumeControl.max = '1';
    volumeControl.step = '0.01';
    volumeControl.value = '1';
    volumeControl.id = 'volumeControl';
    volumeControl.classList.add('slider');
    volumeControl.oninput = updateUtteranceSettings;

    const rateControl = document.createElement('input');
    rateControl.type = 'range';
    rateControl.min = '0.5';
    rateControl.max = '1.5';
    rateControl.step = '0.25';
    rateControl.value = '1';
    rateControl.id = 'rateControl';
    rateControl.classList.add('slider');
    rateControl.oninput = updateUtteranceSettings;

    ttsBox.appendChild(buttonContainer); // Add the button container
    ttsBox.appendChild(document.createElement('br'));
    ttsBox.appendChild(document.createTextNode('Volume: '));
    ttsBox.appendChild(volumeControl);
    ttsBox.appendChild(document.createElement('br'));
    ttsBox.appendChild(document.createTextNode('Speed: '));
    ttsBox.appendChild(rateControl);
    document.body.appendChild(ttsBox);

}



// Ensure voices are loaded before setting the voice
speechSynthesis.onvoiceschanged = () => {
    updateUtteranceSettings();
};


function showLoadingOverlay(textArea) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(200, 200, 200, 0.5)';  // semi-transparent gray
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10';  // make sure the overlay is on top

    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    overlay.appendChild(spinner);

    textArea.parentNode.appendChild(overlay); // Attach the overlay to the parent of the textArea

    return overlay; // return the overlay for removal later
}

function copyToClipboard(text) {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = text;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
}


function showSummary(summary, text) {
    if (summaryBox) summaryBox.remove();

    summaryBox = document.createElement('div');
    summaryBox.style.position = 'fixed';
    summaryBox.style.left = selectionBox.style.left;

    let potentialBottomPosition = parseFloat(selectionBox.style.top) + 60 + 25 * window.innerHeight / 100;
    if (potentialBottomPosition > window.innerHeight) {
        summaryBox.style.top = (parseFloat(selectionBox.style.top) - 25 * window.innerHeight / 100) + 'px';
    } else {
        summaryBox.style.top = (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height) + 'px';
    }

    summaryBox.style.width = '500px';
    summaryBox.style.height = '35vh';
    summaryBox.style.backgroundColor = 'white';
    summaryBox.style.border = '1px solid #ddd';  // Lighter border color
    summaryBox.style.borderRadius = '8px';  // Rounded corners
    summaryBox.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';  // Add a subtle shadow
    summaryBox.style.overflow = 'auto';
    summaryBox.style.padding = '20px';  // Increase padding
    summaryBox.style.display = 'flex';
    summaryBox.style.flexDirection = 'column';
    summaryBox.style.justifyContent = 'center';
    summaryBox.style.alignItems = 'center';
    summaryBox.style.overflow = 'visible'; // This allows the dropdown to be seen outside of the box
    // Previous summaryBox styles...
    summaryBox.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1), 5px 0px 0px #0097FF, 0px 5px 0px #0097FF';

    document.body.appendChild(summaryBox);

    const textArea = document.createElement('textarea');
    textArea.style.width = 'calc(100% - 16px)';
    textArea.style.height = '100%';  // Deduct 20px for the close button space
    textArea.style.resize = 'none';
    textArea.style.boxSizing = 'border-box';
    textArea.style.padding = '10px';
    textArea.style.fontFamily = 'Arial, sans-serif';  // More modern sans-serif font
    textArea.style.fontSize = '16px';  // Larger font size
    textArea.style.border = 'none';  // Remove border
    textArea.style.borderRadius = '6px';  // Add rounded corners
    textArea.style.outline = 'none';  // Remove the focus outline
    textArea.value = summary.trim().replace(/\\n/g, '\n\n');;


    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'dropdown-container';

    const dropdownButton = document.createElement('button');
    dropdownButton.className = 'dropdown-toggle'; // This is the unique class name for our dropdown button
    dropdownButton.innerText = 'Select A Quick Prompt...';
    dropdownContainer.appendChild(dropdownButton);

    const dropdownMenu = document.createElement('ul');
    dropdownMenu.className = 'dropdown-menu';
    dropdownContainer.appendChild(dropdownMenu);

    const optionsList = [
        {value: 'summary', label: 'Summarize'},
        {value: 'longSummary', label: 'Long Summary'},
        {value: 'shortSummary', label: 'Shorter Summary'},
        {
            label: 'Tone',
            options: [
                {value: 'formalTone', label: 'Formal Tone'},
                {value: 'casualTone', label: 'Casual Tone'},
                {value: 'neutralTone', label: 'Neutral Tone'},
            ]
        },
        {
            label: 'Translate',
            options: [
                {value: 'spanish', label: 'Spanish'},
                {value: 'french', label: 'French'},
                {value: 'mandarin', label: 'Chinese (Simplified)'},
                {value: 'cantonese', label: 'Chinese (Traditional)'},
                {value: 'korean', label: 'Korean'},
                {value: 'japenese', label: 'Japenese'},
                {value: 'vietnamese', label: 'Vietnamese'},
                {value: 'punjabi', label: 'Punjabi'},
                {value: 'arabic', label: 'Arabic'},
                {value: 'indonesian', label: 'Indonesian'},
                {value: 'turkish', label: 'Turkish'},
                {value: 'russian', label: 'Russian'},
                {value: 'german', label: 'German'},
                {value: 'tagalog', label: 'Tagalog'},
                {value: 'italian', label: 'Italian'},
            ]
        }
    ];

    optionsList.forEach(opt => {
        const li = document.createElement('li');
        if (opt.options) {
            li.innerText = opt.label;
            li.className = 'has-submenu';
        
            const submenu = document.createElement('ul');
            submenu.className = 'submenu';
            opt.options.forEach(subOpt => {
                const subLi = document.createElement('li');
                subLi.innerText = subOpt.label;
                subLi.dataset.value = subOpt.value;
                submenu.appendChild(subLi);
            });
        
            li.appendChild(submenu);
        } else {
            li.innerText = opt.label;
            li.dataset.value = opt.value;
        }
        dropdownMenu.appendChild(li);
    });

    dropdownButton.addEventListener('click', () => {
        const isShown = dropdownMenu.style.display === 'block';
        dropdownMenu.style.display = isShown ? 'none' : 'block';
    });

    dropdownMenu.addEventListener('click', async e => {
        if (e.target.tagName === 'LI' && e.target.dataset.value) {
            const value = e.target.dataset.value;
            dropdownMenu.style.display = 'none';

            const overlay = showLoadingOverlay(textArea);  // Add the overlay to the text area
            textArea.disabled = true;  // Disable the textarea during loading

            const newSummary = await summarizeText(text, value);

            textArea.value = newSummary.trim().replace(/\\n/g, '\n\n');;

            overlay.remove();  // Remove the overlay after getting the new summary
            textArea.disabled = false;  // Enable the textarea after loading
        }
    });

    const copyButton = document.createElement('button');
    copyButton.innerText = '✍';
    copyButton.style.position = 'absolute';
    copyButton.style.right = '10px';
    copyButton.style.marginRight = '35px';
    copyButton.style.top = '10px';
    copyButton.style.background = 'transparent';
    copyButton.style.border = 'none';
    copyButton.style.fontSize = '20px';  // Bigger close button
    copyButton.style.cursor = 'pointer';  // Hand cursor for better UX  
    copyButton.title = 'Copy to Clipboard'; // This line adds the tooltip

    copyButton.onclick = () => {
        copyToClipboard(textArea.value);
        alert('Copied to clipboard!');
    };
    
    // Append the copy button and close button to the summary box
    summaryBox.appendChild(copyButton);
    // Appending the custom dropdown to the summary box
    summaryBox.appendChild(dropdownContainer);
    summaryBox.appendChild(textArea);

    createCloseButton(summaryBox);
    makeDraggable(summaryBox);
}



function underlineSelectedText() {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            let contents = range.extractContents();
            let underlineElem = document.createElement('span');  // Use a span element now
            underlineElem.className = 'thicker-underline';       // Apply the custom class
            underlineElem.appendChild(contents);
            range.insertNode(underlineElem);
            window.getSelection().removeAllRanges();
        }
    }
    removeColorPicker();
    removeSelectionBox();
}


function showNoteInput(initialText, anchorElement) {
    saveSelection();

    if (summaryBox) summaryBox.remove();

    summaryBox = document.createElement('div');
    summaryBox.style.position = 'fixed';
    summaryBox.style.width = '30vw';
    summaryBox.style.maxWidth = '500px';
    summaryBox.style.backgroundColor = '#fff';
    summaryBox.style.borderRadius = '10px'; // Rounded edges
    summaryBox.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'; // Strong shadow
    summaryBox.style.padding = '10px'; // Increased padding for spacious feel
    summaryBox.style.display = 'flex';
    summaryBox.style.flexDirection = 'column'; // Vertical layout
    summaryBox.style.alignItems = 'center'; // Center elements horizontally
    summaryBox.style.gap = '10px'; // Space between elements

    let noteTextArea = document.createElement('textarea');
    noteTextArea.style.width = '100%';
    noteTextArea.style.maxWidth = '500px';
    noteTextArea.style.minHeight = '20vh';
    noteTextArea.style.resize = 'none';
    noteTextArea.value = initialText || '';
    noteTextArea.style.borderRadius = '5px'; // Rounded edges
    noteTextArea.style.fontSize = '16px';
    noteTextArea.style.fontFamily = 'Baskerville, serif'; // Modern font
    noteTextArea.style.padding = '10px'; // Padding for inside the textarea

    let cancelButton = document.createElement('button');
    cancelButton.innerText = 'Cancel';
    cancelButton.onclick = function () {
        summaryBox.remove();
    };
    cancelButton.style = commonButtonStyle;

    let doneButton = document.createElement('button');
    doneButton.innerText = 'Done';
    doneButton.onclick = function () {
        restoreSelection();
        let noteText = noteTextArea.value.trim();
        if (noteText) {
            if (!anchorElement) {
                createNoteAnchor(noteText);
            } else {
                localStorage.setItem(anchorElement.textContent, noteText);
            }
        }
        summaryBox.remove();
    };
    doneButton.style = commonButtonStyle;

    summaryBox.appendChild(noteTextArea);

    // Create a button container to keep them side by side
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.width = '100%'; // Take full width of parent
    buttonContainer.appendChild(doneButton);
    buttonContainer.appendChild(cancelButton);
    summaryBox.appendChild(buttonContainer);

    // Temporarily append to body to get accurate height
    document.body.appendChild(summaryBox);

    let boxHeight = summaryBox.getBoundingClientRect().height;

    let positionLeft = anchorElement ? anchorElement.getBoundingClientRect().left : parseFloat(selectionBox.style.left);
    let spaceAbove = anchorElement ? anchorElement.getBoundingClientRect().top : parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (anchorElement ? anchorElement.getBoundingClientRect().bottom : parseFloat(selectionBox.style.top) + 60);

    let positionTop;
    if (spaceBelow > boxHeight) {
        positionTop = anchorElement ? anchorElement.getBoundingClientRect().bottom + 5 : parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height;
    } else if (spaceAbove > boxHeight) {
        positionTop = spaceAbove - boxHeight;
    } else {
        // Default to above if neither space is sufficient
        positionTop = spaceAbove - boxHeight;
    }

    summaryBox.style.top = positionTop + 'px';
    summaryBox.style.left = positionLeft + 'px';
}



function createNoteAnchor(noteText) {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            let contents = range.extractContents();
            let anchor = document.createElement('a');
            anchor.className = 'note-anchor'; // Add this line
            anchor.href = '#';
            anchor.onclick = function (e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };

            // Highlight the anchor text if there's content in the textarea
            let span = document.createElement('span');
            span.style.backgroundColor = "yellow"; // Choose the desired highlight color here
            span.appendChild(contents);
            anchor.appendChild(span);

            range.insertNode(anchor);
            localStorage.setItem(anchor.textContent, noteText);
            window.getSelection().removeAllRanges();
        }
    }
}


function attachNoteEvents() {
    document.querySelectorAll('a').forEach(anchor => {
        if (localStorage.getItem(anchor.textContent)) {
            anchor.onclick = function (e) {
                e.preventDefault();
                let savedNote = localStorage.getItem(anchor.textContent);
                showNoteInput(savedNote, anchor);
            };
        }
    });
}
let colorPickerDialog = null; // Declare this at the top of your script to keep a reference to the color picker dialog



attachNoteEvents();


function showColorPicker(selection) {
    removeColorPicker();  // remove existing color picker if there's any

    // Create the color picker
    const colorPicker = document.createElement('div');
    colorPicker.setAttribute('id', 'colorPickerDialog');
    colorPicker.style.backgroundColor = '#fff';
    colorPicker.style.position = 'fixed';
    colorPicker.style.zIndex = 9999;
    colorPicker.style.borderRadius = '10px';
    colorPicker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    colorPicker.style.padding = '10px';
    colorPicker.style.display = 'flex';
    colorPicker.style.flexDirection = 'column';
    colorPicker.style.alignItems = 'center';
    colorPicker.style.justifyContent = 'center';
    colorPicker.style.transition = 'top 0.3s ease-out';
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerText = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '0.755em';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', removeColorPicker);
    colorPicker.appendChild(closeButton);

    const pickColorText = document.createElement('p');
    pickColorText.innerText = "PICK A COLOR";
    pickColorText.style.marginBottom = '10px';
    colorPicker.appendChild(pickColorText);

    // Create highlight buttons
    const colors = ["yellow", "pink", "lightgreen", "lightblue"];
    const buttonWrapper = document.createElement('div');
    buttonWrapper.style.display = 'flex';
    buttonWrapper.style.gap = '10px'; // Spacing between buttons
    for (const color of colors) {
        let btn = document.createElement('button');
        btn.classList.add('highlight-btn');
        btn.style.backgroundColor = color;
        btn.addEventListener('click', function() {
            highlightSelectedText(color);
            removeColorPicker();
            // Assuming you have a function to remove the selection box
            removeSelectionBox();
        });
        buttonWrapper.appendChild(btn);
    }
    colorPicker.appendChild(buttonWrapper);

    // Use the selectionBox to position the color picker
    const boxRect = selectionBox.getBoundingClientRect();

    // Position the color picker above the selection box
    colorPicker.style.left = boxRect.left + 'px';
    colorPicker.style.top = (boxRect.top - boxRect.height-38) + 'px';

    colorPickerDialog = colorPicker;
    document.body.appendChild(colorPicker);
    document.addEventListener('mousedown', handleDocumentClick);
}



function createTooltip(button, tooltipText) {
    const tooltip = document.createElement('span');
    tooltip.innerText = tooltipText;
    tooltip.style.visibility = "hidden";
    tooltip.style.width = "120px";
    tooltip.style.backgroundColor = "#555";
    tooltip.style.color = "#fff";
    tooltip.style.textAlign = "center";
    tooltip.style.borderRadius = "6px";
    tooltip.style.padding = "5px";
    tooltip.style.position = "absolute";
    tooltip.style.zIndex = "1";
    tooltip.style.bottom = "100%";
    tooltip.style.left = "50%";
    tooltip.style.marginLeft = "-60px";
    tooltip.style.opacity = "0";
    tooltip.style.transition = "opacity 0.3s";

    button.appendChild(tooltip);

    button.addEventListener('mouseover', function() {
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = "1";
    });

    button.addEventListener('mouseout', function() {
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = "0";
    });
}



function removeColorPicker() {
    if (colorPickerDialog) {
        document.body.removeChild(colorPickerDialog);
        colorPickerDialog = null;
    }
    document.removeEventListener('mousedown', handleDocumentClick);
}



// Function to show selection box
function showSelectionBox(evt) {
    if (selectionBox && selectionBox.contains(evt.target)) {
        console.log('Inside selection box');
        return;
    }

    removeSelectionBox();
    let selection = window.getSelection();
    if (selection.toString().length > 0) {
        let range = selection.getRangeAt(0);
        let rect = range.getBoundingClientRect();

        let boxTop;
        if (rect.bottom + 60 > window.innerHeight) {
            boxTop = rect.top - 60;
        } else {
            boxTop = rect.bottom + 5;
        }

        selectionBox = document.createElement('div');
        selectionBox.style.position = 'fixed';
        selectionBox.style.left = rect.left + 'px';
        selectionBox.style.top = boxTop + 'px';
        selectionBox.style.backgroundColor = 'white';
        selectionBox.style.zIndex = '9999999'; 

        // Increased the shadow intensity and spread
        selectionBox.style.boxShadow = '2px 2px 5px rgba(1, 1, 1, 1)';

        // Increased border radius for more rounded appearance
        selectionBox.style.borderRadius = '12px';

        // Increased padding for a thicker appearance
        selectionBox.style.padding = '10px';
        selectionBox.style.display = 'flex';
        selectionBox.style.gap = '5px';

        // Optional: Add a gentle transition for the appearance
        selectionBox.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        selectionBox.style.opacity = '0';
        selectionBox.style.transform = 'translateY(-5px)';  // Start a bit above the intended position
        setTimeout(() => {
            selectionBox.style.opacity = '1';
            selectionBox.style.transform = 'translateY(0)';
        }, 0);


        // Color picker button
        const colorPickerButton = document.createElement('button');
        colorPickerButton.style.backgroundColor = 'transparent';
        colorPickerButton.innerHTML = "<img src = 'https://cdn.discordapp.com/attachments/786832803282812958/1149874072822485134/image.png' alt='highlight' style= 'height: 24px; width: 24px' />";
        colorPickerButton.style.border = 'transparent';
        colorPickerButton.addEventListener('click', function () {
            const selection = window.getSelection();
            showColorPicker(selection);
        });
        selectionBox.appendChild(colorPickerButton);
        createTooltip(colorPickerButton, 'Highlighter');


        const underlineButton = document.createElement('button');
        underlineButton.style.backgroundColor = 'transparent';

        underlineButton.innerHTML = "<img src = 'https://cdn.discordapp.com/attachments/786832803282812958/1149878612674216007/image.png' alt='underline' style= 'height: 24px; width: 24px' />";
        underlineButton.style.border = 'transparent';

        underlineButton.addEventListener('click', function () {
            underlineSelectedText();
        });
        selectionBox.appendChild(underlineButton);
        createTooltip(underlineButton, 'Underline');



        const summaryBtn = document.createElement('button');
        summaryBtn.style.position = 'relative';
        summaryBtn.style.backgroundColor = 'transparent';
        summaryBtn.innerHTML = "<img src='https://cdn.discordapp.com/attachments/786832803282812958/1149879335898058762/image.png' alt='summarize' style='height: 24px; width: 24px' />";
        summaryBtn.style.border = 'transparent';

        summaryBtn.addEventListener('click', async function () {
            // Add loading class to button to reduce image opacity
            summaryBtn.classList.add('loading');

            // Create and append loader to the button
            const loader = document.createElement('div');
            loader.className = 'loader';
            
            // Explicitly set top and left properties for the spinner's position
            const btnWidth = summaryBtn.offsetWidth;
            const btnHeight = summaryBtn.offsetHeight;
            loader.style.left = (btnWidth / 2 - 8) + 'px';  // 8 is half the width of the spinner
            loader.style.top = (btnHeight / 2 - 8) + 'px';  // 8 is half the height of the spinner
            
            summaryBtn.appendChild(loader);

            const text = window.getSelection().toString();
            const summarizedText = await summarizeText(text,'summary');

            // Restore image opacity and remove loader
            summaryBtn.classList.remove('loading');
            loader.remove();

            showSummary(summarizedText, text);
        });

        selectionBox.appendChild(summaryBtn);
        createTooltip(summaryBtn, 'Summarize');


        const ttsButton = document.createElement('button');
        ttsButton.style.backgroundColor = 'transparent';

        ttsButton.innerHTML = "<img src = 'https://cdn.discordapp.com/attachments/786832803282812958/1150948713682964540/image.png' alt='summarize' style= 'height: 24px; width: 24px' />";
        ttsButton.style.border = 'transparent';

        ttsButton.addEventListener('click', async function () {
            const text = window.getSelection().toString();
            showTextToSpeech(text);
        });

        selectionBox.appendChild(ttsButton);
        createTooltip(ttsButton, 'Text to Speech');

    
        const noteButton = document.createElement('button');
        noteButton.style.backgroundColor = 'transparent';

        noteButton.innerHTML = "<img src = 'https://cdn.discordapp.com/attachments/786832803282812958/1149879518304145509/image.png' alt='summarize' style= 'height: 24px; width: 24px' />";
        noteButton.style.border = 'transparent';

        noteButton.addEventListener('click', function () {
            showNoteInput();
        });

        selectionBox.appendChild(noteButton);
        createTooltip(noteButton, 'Note');


        document.body.appendChild(selectionBox);
    }
}

function highlightSelectedText(color) {
    let selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        if (range && !range.collapsed) {
            let contents = range.extractContents();
            let span = document.createElement('span');
            span.style.backgroundColor = color;
            span.appendChild(contents);
            range.insertNode(span);
            window.getSelection().removeAllRanges();
        }
    }
    removeSelectionBox();
}


function removeSelectionBox() {
    if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }
}

function handleMouseUp(evt) {
    if (extensionEnabled) {  // Check the global variable
        showSelectionBox(evt);
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.enabled) {
        document.addEventListener('mouseup', handleMouseUp);
        extensionEnabled = true;  // Set the global variable
    } else {
        document.removeEventListener('mouseup', handleMouseUp);
        removeSelectionBox();
        extensionEnabled = false;  // Set the global variable
    }
});

chrome.storage.local.get('enabled', function (data) {
    if (data.enabled) {
        document.addEventListener('mouseup', handleMouseUp);
        extensionEnabled = true;  // Set the global variable
    } else {
        extensionEnabled = false;  // Set the global variable
    }
});


function handleDocumentClick(event) {
    let colorPicker = document.getElementById('colorPickerDialog');
    // Ensuring the selectionBox is accessible in this scope
    if (!colorPicker.contains(event.target) && !selectionBox.contains(event.target)) {
        colorPicker.style.display = 'none';
        selectionBox.style.display = 'none';
    }
}