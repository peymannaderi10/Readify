let selectionBox = null;
let summaryBox = null;
let ttsBox = null;
let isDragging = false;
let offsetX, offsetY;
let savedRange = null;
let extensionEnabled = false;  // Set to false as a default state

let commonButtonStyle = `
padding: 5px 15px;
border-radius: 5px;
border: 1px solid #ccc;
background: transparent;
cursor: pointer;
transition: background-color 0.2s ease;
`;


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
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '20px';  // Bigger close button
    closeButton.style.cursor = 'pointer';  // Hand cursor for better UX
    closeButton.style.color = '#888';  // Darker gray color
    closeButton.onmouseover = function() { this.style.color = '#333'; };  // Darken color on hover
    closeButton.onmouseout = function() { this.style.color = '#888'; };

    closeButton.addEventListener('click', function () {
        parent.remove();
    });
    parent.appendChild(closeButton);
}
async function summarizeText(text) {
    const url = 'https://open-ai21.p.rapidapi.com/summary';
    const encodedApiKey = 'OGNjZDNmYWU3ZW1zaGM0M2M2YmE3NWRkNWZkMnAxNzY0YWFqc24zZDYwNzIyY2Y0YzE='; // Base64 encoded API key
    const decodedApiKey = atob(encodedApiKey); // Decoding the API key

    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': decodedApiKey, // Using the decoded API key here
            'X-RapidAPI-Host': 'open-ai21.p.rapidapi.com'
        },
        body: JSON.stringify({  
            text: text
        })
    };

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result.result;
    } catch (error) {
        console.error(error);
    }
}


let currentUtterance = null;
let textToSpeak = "";
let pausedPosition = 0;

function createUtterance() {
    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
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
        pausedPosition = currentUtterance.text.length - currentUtterance.textUtterance.length;
    }
}

function showTextToSpeech(text) {

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
    createCloseButton(ttsBox);

    

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





function showSummary(summary) {
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
    summaryBox.style.height = '25vh';
    summaryBox.style.backgroundColor = 'white';
    summaryBox.style.border = '1px solid #ddd';  // Lighter border color
    summaryBox.style.borderRadius = '8px';  // Rounded corners
    summaryBox.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';  // Add a subtle shadow
    summaryBox.style.overflow = 'auto';
    summaryBox.style.padding = '20px';  // Increase padding
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
    textArea.value = summary.trim();

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
        createTooltip(colorPickerButton, 'Highliter');


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
            const summarizedText = await summarizeText(text);

            // Restore image opacity and remove loader
            summaryBtn.classList.remove('loading');
            loader.remove();

            showSummary(summarizedText);
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