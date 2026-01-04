// Readify Extension - UI Components
// Handles all popup UI components (Notes, TTS, Highlighter)

// Text-to-Speech functionality
let currentUtterance = null;
let textToSpeak = "";
let pausedPosition = 0;
let isPaused = false;
let currentSentenceIndex = 0;

function createUtterance() {
    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.onboundary = function (event) {
        if (event.name == "word") {
            pausedPosition = event.charIndex;
        }
    };
    updateUtteranceSettings();
}

function updateUtteranceSettings() {
    if (currentUtterance) {
        const volumeControl = document.getElementById("volumeControl");
        const rateControl = document.getElementById("rateControl");
        if (volumeControl && rateControl) {
            currentUtterance.volume = parseFloat(volumeControl.value);
            currentUtterance.rate = parseFloat(rateControl.value);
            currentUtterance.voice = speechSynthesis.getVoices().find((voice) => voice.name === "Google UK English Male");
        }
    }
}

function playSpeech() {
    if (currentUtterance) {
        if (!isPaused) {
            speechSynthesis.cancel();
            createUtterance();
            currentSentenceIndex = 0;
        } else {
            isPaused = false;
            speechSynthesis.cancel();
            createUtterance();
        }

        const sentences = textToSpeak.match(/[^.!,?;]+[.!?,;]+/g);

        function playSentence(index) {
            if (index < sentences.length) {
                currentUtterance.text = sentences[index];
                currentUtterance.onend = function () {
                    playSentence(index + 1);
                };
                speechSynthesis.speak(currentUtterance);
                currentSentenceIndex = index;
            }
        }

        playSentence(currentSentenceIndex);
    }
}

function pauseSpeech() {
    if (speechSynthesis.speaking && !isPaused) {
        speechSynthesis.pause();
        isPaused = true;
    }
}

function removeTTS() {
    if (ttsBox) {
        speechSynthesis.cancel(); // Stop any ongoing speech completely
        pauseSpeech();
        removeElementWithCleanup(ttsBox);
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
    textToSpeak = text;
    ttsBox.style.width = 'min(320px, 90vw)';
    ttsBox.style.backgroundColor = '#ffffff';
    ttsBox.style.borderRadius = '16px';
    ttsBox.style.boxShadow = '0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)';
    ttsBox.style.padding = '24px';
    ttsBox.style.border = '1px solid rgba(0, 151, 255, 0.1)';
    ttsBox.style.backdropFilter = 'blur(10px)';
    ttsBox.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ttsBox.style.zIndex = '10000';
    ttsBox.style.display = 'flex';
    ttsBox.style.flexDirection = 'column';
    ttsBox.style.gap = '20px';
    
    // Add a modern header
    let headerContainer = document.createElement("div");
    headerContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        height: 32px;
    `;
    
    let titleContainer = document.createElement("div");
    titleContainer.style.cssText = `
        display: flex;
        align-items: center;
    `;
    
    let iconElement = document.createElement("div");
    iconElement.innerHTML = "🔊";
    iconElement.style.cssText = `
        font-size: 20px;
        opacity: 0.7;
        margin-right: 8px;
        line-height: 1;
    `;
    
    let titleElement = document.createElement("h3");
    titleElement.innerText = "Text to Speech";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1;
    `;
    
    titleContainer.appendChild(iconElement);
    titleContainer.appendChild(titleElement);

    const closeButton = document.createElement('button');
    closeButton.innerText = '×';
    closeButton.style.cssText = `
        background: transparent;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s ease;
        font-family: system-ui;
        line-height: 1;
        padding: 0;
        margin: 0;
    `;
    
    // Add close button to header container instead of absolute positioning
    headerContainer.appendChild(titleContainer);
    headerContainer.appendChild(closeButton);
    closeButton.addEventListener('click', removeTTS);
    closeButton.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        this.style.color = '#374151';
    });
    closeButton.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.color = '#6b7280';
    });
    ttsBox.appendChild(headerContainer);
    

    // Container for Play and Pause buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
        width: 100%;
    `;

    const playButton = document.createElement('button');
    playButton.innerText = '▶ Play';
    playButton.classList.add('control-button');
    playButton.onclick = function () {
        createUtterance();
        playSpeech();
    };
    
    // Modern primary button styling for play
    playButton.style.cssText = `
        padding: 12px 24px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        color: white;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: 80px;
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    playButton.addEventListener("mouseenter", function() {
        this.style.background = "linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)";
        this.style.transform = "translateY(-2px)";
        this.style.boxShadow = "0 6px 20px rgba(0, 151, 255, 0.4)";
    });
    
    playButton.addEventListener("mouseleave", function() {
        this.style.background = "linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)";
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "0 4px 12px rgba(0, 151, 255, 0.3)";
    });

    const pauseButton = document.createElement('button');
    pauseButton.innerText = '⏸ Pause';
    pauseButton.classList.add('control-button');
    pauseButton.onclick = pauseSpeech;
    
    // Modern secondary button styling for pause
    pauseButton.style.cssText = `
        padding: 12px 24px;
        border-radius: 10px;
        border: 2px solid rgba(0, 151, 255, 0.2);
        background: transparent;
        color: #0097ff;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: 80px;
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    pauseButton.addEventListener("mouseenter", function() {
        this.style.backgroundColor = "rgba(0, 151, 255, 0.05)";
        this.style.borderColor = "#0097ff";
        this.style.transform = "translateY(-1px)";
    });
    
    pauseButton.addEventListener("mouseleave", function() {
        this.style.backgroundColor = "transparent";
        this.style.borderColor = "rgba(0, 151, 255, 0.2)";
        this.style.transform = "translateY(0)";
    });

    buttonContainer.appendChild(playButton);
    buttonContainer.appendChild(pauseButton);

    // Modern volume control section
    const volumeSection = document.createElement('div');
    volumeSection.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    const volumeLabel = document.createElement('label');
    volumeLabel.innerText = 'Volume';
    volumeLabel.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    const volumeControl = document.createElement('input');
    volumeControl.type = 'range';
    volumeControl.min = '0';
    volumeControl.max = '1';
    volumeControl.step = '0.01';
    volumeControl.value = '1';
    volumeControl.id = 'volumeControl';
    volumeControl.oninput = updateUtteranceSettings;
    
    // Modern slider styling
    volumeControl.style.cssText = `
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: rgba(182, 240, 233, 0.3);
        outline: none;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
    `;
    
    // Function to update volume slider progress
    function updateVolumeSliderProgress() {
        const value = (volumeControl.value - volumeControl.min) / (volumeControl.max - volumeControl.min) * 100;
        volumeControl.style.background = `linear-gradient(to right, #0097ff 0%, #0097ff ${value}%, rgba(182, 240, 233, 0.3) ${value}%, rgba(182, 240, 233, 0.3) 100%)`;
    }
    
    // Initial progress update
    updateVolumeSliderProgress();
    
    // Update progress on input
    volumeControl.addEventListener('input', updateVolumeSliderProgress);
    
    // Add custom slider thumb styling
    const volumeThumbStyle = document.createElement('style');
    volumeThumbStyle.textContent = `
        #volumeControl::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0, 151, 255, 0.3);
            transition: all 0.2s ease;
        }
        #volumeControl::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 151, 255, 0.4);
        }
        #volumeControl::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0, 151, 255, 0.3);
            border: none;
        }
        #volumeControl::-moz-range-track {
            height: 8px;
            border-radius: 4px;
            background: rgba(182, 240, 233, 0.3);
            border: none;
        }
        #volumeControl::-moz-range-progress {
            height: 8px;
            border-radius: 4px;
            background: #0097ff;
            border: none;
        }
    `;
    document.head.appendChild(volumeThumbStyle);
    
    volumeSection.appendChild(volumeLabel);
    volumeSection.appendChild(volumeControl);

    // Modern speed control section
    const speedSection = document.createElement('div');
    speedSection.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    const speedLabel = document.createElement('label');
    speedLabel.innerText = 'Speed';
    speedLabel.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const rateControl = document.createElement('input');
    rateControl.type = 'range';
    rateControl.min = '0.5';
    rateControl.max = '1.5';
    rateControl.step = '0.25';
    rateControl.value = '1';
    rateControl.id = 'rateControl';
    rateControl.oninput = updateUtteranceSettings;
    
    // Modern slider styling
    rateControl.style.cssText = `
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: rgba(182, 240, 233, 0.3);
        outline: none;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
    `;
    
    // Function to update rate slider progress
    function updateRateSliderProgress() {
        const value = (rateControl.value - rateControl.min) / (rateControl.max - rateControl.min) * 100;
        rateControl.style.background = `linear-gradient(to right, #0097ff 0%, #0097ff ${value}%, rgba(182, 240, 233, 0.3) ${value}%, rgba(182, 240, 233, 0.3) 100%)`;
    }
    
    // Initial progress update
    updateRateSliderProgress();
    
    // Update progress on input
    rateControl.addEventListener('input', updateRateSliderProgress);
    
    // Add custom slider thumb styling for rate control
    const rateThumbStyle = document.createElement('style');
    rateThumbStyle.textContent = `
        #rateControl::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0, 151, 255, 0.3);
            transition: all 0.2s ease;
        }
        #rateControl::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 151, 255, 0.4);
        }
        #rateControl::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0, 151, 255, 0.3);
            border: none;
        }
        #rateControl::-moz-range-track {
            height: 8px;
            border-radius: 4px;
            background: rgba(182, 240, 233, 0.3);
            border: none;
        }
        #rateControl::-moz-range-progress {
            height: 8px;
            border-radius: 4px;
            background: #0097ff;
            border: none;
        }
    `;
    document.head.appendChild(rateThumbStyle);
    
    speedSection.appendChild(speedLabel);
    speedSection.appendChild(rateControl);

    ttsBox.appendChild(buttonContainer);
    ttsBox.appendChild(volumeSection);
    ttsBox.appendChild(speedSection);
    
    // Temporarily append to body to get accurate height for positioning
    document.body.appendChild(ttsBox);

    // Calculate positioning similar to note popup logic
    let boxHeight = ttsBox.getBoundingClientRect().height;
    let positionLeft = parseFloat(selectionBox.style.left);
    let spaceAbove = parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height);

    let positionTop;
    if (spaceBelow > boxHeight + 20) { // 20px buffer
        // Position below the selection box
        positionTop = parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10;
    } else if (spaceAbove > boxHeight + 20) { // 20px buffer
        // Position above the selection box
        positionTop = spaceAbove - boxHeight - 10;
    } else {
        // Default to above if neither space is sufficient, but adjust to fit
        positionTop = Math.max(10, spaceAbove - boxHeight - 10);
    }

    ttsBox.style.top = positionTop + 'px';
    ttsBox.style.left = positionLeft + 'px';

    makeDraggable(ttsBox);
}

// Ensure voices are loaded before setting the voice
speechSynthesis.onvoiceschanged = () => {
    updateUtteranceSettings();
};

// ========== COMING SOON POPUP (for temporarily disabled features) ==========
// featureName: "tts" (or any string for custom features)
function showComingSoonPopup(featureName = "tts") {
    // Remove any existing coming soon popup
    const existingPopup = containerRoot.querySelector('#coming-soon-popup');
    if (existingPopup) existingPopup.remove();

    // Feature-specific content
    const featureContent = {
        tts: {
            icon: "🔊",
            description: "Text to Speech will be available for Premium users. Stay tuned!"
        }
    };

    const content = featureContent[featureName] || featureContent.tts;

    const popup = document.createElement("div");
    popup.id = "coming-soon-popup";
    popup.style.position = "fixed";
    popup.style.left = selectionBox ? selectionBox.style.left : "50%";
    popup.style.width = "min(340px, 90vw)";
    popup.style.backgroundColor = "#ffffff";
    popup.style.borderRadius = "16px";
    popup.style.boxShadow = "0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)";
    popup.style.padding = "28px";
    popup.style.border = "1px solid rgba(0, 151, 255, 0.1)";
    popup.style.backdropFilter = "blur(10px)";
    popup.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    popup.style.zIndex = "10000";
    popup.style.display = "flex";
    popup.style.flexDirection = "column";
    popup.style.alignItems = "center";
    popup.style.gap = "16px";
    popup.style.textAlign = "center";

    // Icon
    const iconElement = document.createElement("div");
    iconElement.innerHTML = content.icon;
    iconElement.style.cssText = `
        font-size: 48px;
        line-height: 1;
        margin-bottom: 4px;
    `;

    // Title
    const titleElement = document.createElement("h3");
    titleElement.innerText = "Coming Soon";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.2;
    `;

    // Subtitle / Description
    const descElement = document.createElement("p");
    descElement.innerText = content.description;
    descElement.style.cssText = `
        margin: 0;
        font-size: 14px;
        color: #6b7280;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.5;
        max-width: 280px;
    `;

    // Premium badge
    const premiumBadge = document.createElement("div");
    premiumBadge.innerText = "🔒 Premium Feature";
    premiumBadge.style.cssText = `
        padding: 8px 16px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(0, 151, 255, 0.1) 0%, rgba(0, 180, 255, 0.1) 100%);
        color: #0097ff;
        font-size: 12px;
        font-weight: 600;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border: 1px solid rgba(0, 151, 255, 0.2);
    `;

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Got it";
    closeButton.style.cssText = `
        padding: 12px 32px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        color: white;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
        margin-top: 8px;
    `;

    closeButton.addEventListener("mouseenter", function() {
        this.style.background = "linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)";
        this.style.transform = "translateY(-2px)";
        this.style.boxShadow = "0 6px 20px rgba(0, 151, 255, 0.4)";
    });

    closeButton.addEventListener("mouseleave", function() {
        this.style.background = "linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)";
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "0 4px 12px rgba(0, 151, 255, 0.3)";
    });

    closeButton.addEventListener("click", function() {
        removeElementWithCleanup(popup);
    });

    // Assemble popup
    popup.appendChild(iconElement);
    popup.appendChild(titleElement);
    popup.appendChild(descElement);
    popup.appendChild(premiumBadge);
    popup.appendChild(closeButton);

    containerRoot.appendChild(popup);

    // Calculate positioning similar to other popups
    let boxHeight = popup.getBoundingClientRect().height;
    let positionLeft = selectionBox ? parseFloat(selectionBox.style.left) : (window.innerWidth / 2 - 170);
    let spaceAbove = selectionBox ? parseFloat(selectionBox.style.top) : window.innerHeight / 2;
    let spaceBelow = selectionBox 
        ? window.innerHeight - (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height)
        : window.innerHeight / 2;

    let positionTop;
    if (spaceBelow > boxHeight + 20) {
        positionTop = selectionBox 
            ? parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10
            : (window.innerHeight / 2 - boxHeight / 2);
    } else if (spaceAbove > boxHeight + 20) {
        positionTop = spaceAbove - boxHeight - 10;
    } else {
        positionTop = Math.max(10, spaceAbove - boxHeight - 10);
    }

    popup.style.top = positionTop + "px";
    popup.style.left = positionLeft + "px";

    // Auto-close after 5 seconds
    setTimeout(() => {
        if (popup.parentNode) {
            popup.style.opacity = "0";
            popup.style.transform = "translateY(-10px)";
            popup.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            setTimeout(() => removeElementWithCleanup(popup), 300);
        }
    }, 5000);

    makeDraggable(popup);
}


// Note popup functionality
function showNoteInput(initialText, anchorElement) {
    saveSelection();

    if (summaryBox) {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    }

    summaryBox = document.createElement("div");
    summaryBox.style.position = "fixed";
    summaryBox.style.width = "min(400px, 90vw)";
    summaryBox.style.backgroundColor = "#ffffff";
    summaryBox.style.borderRadius = "16px";
    summaryBox.style.boxShadow = "0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)";
    summaryBox.style.padding = "24px";
    summaryBox.style.display = "flex";
    summaryBox.style.flexDirection = "column";
    summaryBox.style.alignItems = "stretch";
    summaryBox.style.gap = "20px";
    summaryBox.style.border = "1px solid rgba(0, 151, 255, 0.1)";
    summaryBox.style.backdropFilter = "blur(10px)";
    summaryBox.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    summaryBox.style.zIndex = "10000";

    // Add a modern header
    let headerContainer = document.createElement("div");
    headerContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    `;
    
    let titleElement = document.createElement("h3");
    titleElement.innerText = initialText ? "Note" : "Add Note";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    let iconElement = document.createElement("div");
    iconElement.innerHTML = "📝";
    iconElement.style.cssText = `
        font-size: 20px;
        opacity: 0.7;
    `;
    
    headerContainer.appendChild(titleElement);
    headerContainer.appendChild(iconElement);
    summaryBox.appendChild(headerContainer);

    let noteTextArea = document.createElement("textarea");
    noteTextArea.style.width = "100%";
    noteTextArea.style.minHeight = "140px";
    noteTextArea.style.resize = "vertical";
    noteTextArea.value = initialText || "";
    noteTextArea.style.borderRadius = "12px";
    noteTextArea.style.fontSize = "15px";
    noteTextArea.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    noteTextArea.style.padding = "16px";
    noteTextArea.style.border = "2px solid rgba(182, 240, 233, 0.3)";
    noteTextArea.style.backgroundColor = "rgba(182, 240, 233, 0.05)";
    noteTextArea.style.outline = "none";
    noteTextArea.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    noteTextArea.style.lineHeight = "1.5";
    noteTextArea.style.color = "#2d3748";
    noteTextArea.style.boxSizing = "border-box";
    noteTextArea.placeholder = "Add your note here...";
    
    // Focus and hover effects for textarea
    noteTextArea.addEventListener("focus", function() {
        this.style.borderColor = "#0097ff";
        this.style.backgroundColor = "rgba(182, 240, 233, 0.1)";
        this.style.boxShadow = "0 0 0 3px rgba(0, 151, 255, 0.1)";
    });
    
    noteTextArea.addEventListener("blur", function() {
        this.style.borderColor = "rgba(182, 240, 233, 0.3)";
        this.style.backgroundColor = "rgba(182, 240, 233, 0.05)";
        this.style.boxShadow = "none";
    });

    let cancelButton = document.createElement("button");
    cancelButton.innerText = "Cancel";
    cancelButton.onclick = function () {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    // Modern button styling for cancel
    cancelButton.style.cssText = `
        padding: 12px 24px;
        border-radius: 10px;
        border: 2px solid rgba(0, 151, 255, 0.2);
        background: transparent;
        color: #0097ff;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: 80px;
    `;
    
    cancelButton.addEventListener("mouseenter", function() {
        this.style.backgroundColor = "rgba(0, 151, 255, 0.05)";
        this.style.borderColor = "#0097ff";
        this.style.transform = "translateY(-1px)";
    });
    
    cancelButton.addEventListener("mouseleave", function() {
        this.style.backgroundColor = "transparent";
        this.style.borderColor = "rgba(0, 151, 255, 0.2)";
        this.style.transform = "translateY(0)";
    });

    let doneButton = document.createElement("button");
    doneButton.innerText = "Save Note";
    doneButton.onclick = async function () {
        restoreSelection();
        let noteText = noteTextArea.value.trim();
        if (noteText) {
            if (!anchorElement) {
                // Create new highlight with note
                const markData = highlightSelectedText('#fdffb4', noteText); // Yellow highlight with note
                if (markData) {
                    // Save the highlight and note
                    await saveChangeToDisk("highlight", '#fdffb4', false, markData);
                    await saveChangeToDisk("note", noteText, false, { markId: markData.markId });
                    // Update visual indicator for notes
                    addNoteToHighlight(markData.markId, noteText);
                }
            } else {
                // Update existing note - anchorElement is now a readify-mark
                const markId = anchorElement.getAttribute('data-mark-id');
                if (markId) {
                    await saveChangeToDisk("note", noteText, false, { markId });
                    addNoteToHighlight(markId, noteText);
                }
            }
        }
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    // Modern primary button styling for done
    doneButton.style.cssText = `
        padding: 12px 24px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        color: white;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: 100px;
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
    `;
    
    doneButton.addEventListener("mouseenter", function() {
        this.style.background = "linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)";
        this.style.transform = "translateY(-2px)";
        this.style.boxShadow = "0 6px 20px rgba(0, 151, 255, 0.4)";
    });
    
    doneButton.addEventListener("mouseleave", function() {
        this.style.background = "linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)";
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "0 4px 12px rgba(0, 151, 255, 0.3)";
    });

    summaryBox.appendChild(noteTextArea);
    // Create a button container to keep them side by side
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.gap = "12px";
    buttonContainer.style.width = "100%";
    buttonContainer.style.marginTop = "8px";
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(doneButton);

    if (initialText) {
        let deleteButton = document.createElement("button");
        deleteButton.innerText = "Delete Note";
        deleteButton.onclick = function () {
            // Check if the anchor element exists and has a first child that is an element node
            if (anchorElement && anchorElement.firstChild && anchorElement.firstChild.nodeType === Node.ELEMENT_NODE) {
                // Change the background color of the text inside the anchor to transparent
                anchorElement.firstChild.style.backgroundColor = "transparent";
        
                // Unwrap the text from the anchor tag
                while (anchorElement.firstChild) {
                    anchorElement.parentNode.insertBefore(anchorElement.firstChild, anchorElement);
                }
                anchorElement.remove();
            }
        
            // Save the deletion to disk
            saveChangeToDisk("note", initialText, true);
            removeElementWithCleanup(summaryBox);
            summaryBox = null;
        };
        
        // Modern danger button styling for delete
        deleteButton.style.cssText = `
            padding: 12px 24px;
            border-radius: 10px;
            border: 2px solid rgba(239, 68, 68, 0.2);
            background: transparent;
            color: #ef4444;
            font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: 100px;
        `;
        
        deleteButton.addEventListener("mouseenter", function() {
            this.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
            this.style.borderColor = "#ef4444";
            this.style.transform = "translateY(-1px)";
        });
        
        deleteButton.addEventListener("mouseleave", function() {
            this.style.backgroundColor = "transparent";
            this.style.borderColor = "rgba(239, 68, 68, 0.2)";
            this.style.transform = "translateY(0)";
        });

        // Add the delete button to the button container at the beginning
        buttonContainer.style.justifyContent = "space-between";
        buttonContainer.insertBefore(deleteButton, buttonContainer.firstChild);
    }
    
    summaryBox.appendChild(buttonContainer);

    // Temporarily append to body to get accurate height
    containerRoot.appendChild(summaryBox);

    let boxHeight = summaryBox.getBoundingClientRect().height;

    let positionLeft = anchorElement ? anchorElement.getBoundingClientRect().left : parseFloat(selectionBox.style.left);
    let spaceAbove = anchorElement ? anchorElement.getBoundingClientRect().top : parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (anchorElement ? anchorElement.getBoundingClientRect().bottom : parseFloat(selectionBox.style.top) + 60);

    let positionTop;
    if (spaceBelow > boxHeight) {
        positionTop = anchorElement
            ? anchorElement.getBoundingClientRect().bottom + 5
            : parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height;
    } else if (spaceAbove > boxHeight) {
        positionTop = spaceAbove - boxHeight;
    } else {
        // Default to above if neither space is sufficient
        positionTop = spaceAbove - boxHeight;
    }

    summaryBox.style.top = positionTop + "px";
    summaryBox.style.left = positionLeft + "px";
    makeDraggable(summaryBox);
}

// Note Edit Modal - shows note text + color options for highlights with notes
async function showNoteEditModal(mark) {
    const markId = mark.getAttribute('data-mark-id');
    const highlightId = mark.getAttribute('data-highlight-id');
    const currentColor = mark.style.backgroundColor;
    const isUnderline = mark.classList.contains('readify-underline');
    
    // Get the note text from storage or data attribute
    const urlDigest = await getURLDigest();
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    let noteText = '';
    
    // First try to get from data attribute (works for session-only mode)
    noteText = mark.getAttribute('data-note-text') || '';
    
    // If not found, try storage
    if (!noteText) {
        try {
            if (isAuthenticated) {
                const siteData = await loadFromSupabase(urlDigest);
                noteText = siteData?.notes?.[markId] || '';
            } else {
                // For non-authenticated users, check local storage (session data)
                const siteData = await loadSiteFromLocal(urlDigest);
                noteText = siteData?.notes?.[markId] || '';
            }
        } catch (e) {
            console.log('Could not load note:', e.message);
        }
    }
    
    // Remove any existing popup
    if (summaryBox) {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    }
    
    // Create the modal
    summaryBox = document.createElement("div");
    summaryBox.style.cssText = `
        position: fixed;
        width: min(420px, 90vw);
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1);
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
        border: 1px solid rgba(0, 151, 255, 0.1);
        backdrop-filter: blur(10px);
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 10000;
    `;
    
    // Header
    const header = document.createElement("div");
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
    `;
    
    const title = document.createElement("h3");
    title.textContent = "Edit Note";
    title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
    `;
    
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
    `;
    closeBtn.onclick = () => {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    summaryBox.appendChild(header);
    
    // Color picker section
    if (!isUnderline) {
        const colorSection = document.createElement("div");
        colorSection.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        const colorLabel = document.createElement("div");
        colorLabel.textContent = "Highlight Color";
        colorLabel.style.cssText = `
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        
        const colorRow = document.createElement("div");
        colorRow.style.cssText = `
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        `;
        
        const colors = [
            { color: "#fdffb4", label: "Yellow" },
            { color: "#fbbf24", label: "Orange" },
            { color: "#f472b6", label: "Pink" },
            { color: "#4ade80", label: "Green" },
            { color: "#60a5fa", label: "Blue" },
            { color: "#c084fc", label: "Purple" }
        ];
        
        let selectedColor = currentColor;
        
        colors.forEach(colorOpt => {
            const btn = document.createElement("button");
            btn.title = colorOpt.label;
            btn.setAttribute('data-color', colorOpt.color);
            btn.style.cssText = `
                width: 32px;
                height: 32px;
                border: 3px solid ${isCurrentColor(currentColor, colorOpt.color) ? '#0097ff' : 'transparent'};
                border-radius: 8px;
                background: ${colorOpt.color};
                cursor: pointer;
                transition: all 0.15s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            `;
            
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.1)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });
            
            btn.addEventListener('click', () => {
                // Update selection visual
                colorRow.querySelectorAll('button').forEach(b => {
                    b.style.borderColor = 'transparent';
                });
                btn.style.borderColor = '#0097ff';
                selectedColor = colorOpt.color;
            });
            
            colorRow.appendChild(btn);
        });
        
        colorSection.appendChild(colorLabel);
        colorSection.appendChild(colorRow);
        summaryBox.appendChild(colorSection);
        
        // Store selectedColor accessor for save button
        summaryBox.getSelectedColor = () => selectedColor;
    }
    
    // Note textarea
    const noteSection = document.createElement("div");
    noteSection.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    const noteLabel = document.createElement("div");
    noteLabel.textContent = "Note";
    noteLabel.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;
    
    const noteTextArea = document.createElement("textarea");
    noteTextArea.value = noteText;
    noteTextArea.placeholder = "Add your note here...";
    noteTextArea.style.cssText = `
        width: 100%;
        min-height: 120px;
        resize: vertical;
        border-radius: 10px;
        font-size: 14px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 14px;
        border: 2px solid #e5e7eb;
        background: #fafafa;
        outline: none;
        transition: all 0.2s ease;
        line-height: 1.5;
        color: #2d3748;
        box-sizing: border-box;
    `;
    
    noteTextArea.addEventListener("focus", function() {
        this.style.borderColor = "#0097ff";
        this.style.backgroundColor = "#fff";
    });
    noteTextArea.addEventListener("blur", function() {
        this.style.borderColor = "#e5e7eb";
        this.style.backgroundColor = "#fafafa";
    });
    
    noteSection.appendChild(noteLabel);
    noteSection.appendChild(noteTextArea);
    summaryBox.appendChild(noteSection);
    
    // Button row
    const buttonRow = document.createElement("div");
    buttonRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 8px;
    `;
    
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.style.cssText = `
        padding: 10px 20px;
        border-radius: 8px;
        border: 2px solid rgba(239, 68, 68, 0.2);
        background: transparent;
        color: #ef4444;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
        deleteBtn.style.borderColor = '#ef4444';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.backgroundColor = 'transparent';
        deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    });
    deleteBtn.addEventListener('click', async () => {
        // Remove the highlight entirely
        await removeMark(highlightId, isUnderline);
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    });
    
    // Right side buttons container
    const rightButtons = document.createElement("div");
    rightButtons.style.cssText = `display: flex; gap: 10px;`;
    
    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
        padding: 10px 20px;
        border-radius: 8px;
        border: 2px solid rgba(0, 151, 255, 0.2);
        background: transparent;
        color: #0097ff;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = 'rgba(0, 151, 255, 0.05)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = 'transparent';
    });
    cancelBtn.onclick = () => {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    };
    
    // Save button
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.style.cssText = `
        padding: 10px 24px;
        border-radius: 8px;
        border: none;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        color: white;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
    `;
    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.transform = 'translateY(-1px)';
        saveBtn.style.boxShadow = '0 6px 16px rgba(0, 151, 255, 0.4)';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.transform = 'translateY(0)';
        saveBtn.style.boxShadow = '0 4px 12px rgba(0, 151, 255, 0.3)';
    });
    saveBtn.addEventListener('click', async () => {
        const newNoteText = noteTextArea.value.trim();
        const newColor = summaryBox.getSelectedColor ? summaryBox.getSelectedColor() : currentColor;
        
        // Update note if changed
        if (newNoteText !== noteText) {
            if (newNoteText) {
                await saveChangeToDisk("note", newNoteText, false, { markId });
                addNoteToHighlight(markId, newNoteText);
            } else {
                // Note was cleared - remove note but keep highlight
                await saveChangeToDisk("note", markId, true);
                // Remove note styling and data attribute
                const marks = document.querySelectorAll(`readify-mark[data-mark-id="${markId}"]`);
                marks.forEach(m => {
                    m.classList.remove('readify-with-notes');
                    m.removeAttribute('data-note-text');
                    m.style.borderBottomColor = '';
                });
            }
        }
        
        // Update color if changed
        if (!isUnderline && newColor !== currentColor) {
            await changeMarkColor(highlightId, newColor, false);
        }
        
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    });
    
    rightButtons.appendChild(cancelBtn);
    rightButtons.appendChild(saveBtn);
    buttonRow.appendChild(deleteBtn);
    buttonRow.appendChild(rightButtons);
    summaryBox.appendChild(buttonRow);
    
    // Position the modal
    containerRoot.appendChild(summaryBox);
    
    const rect = mark.getBoundingClientRect();
    const boxHeight = summaryBox.getBoundingClientRect().height;
    const boxWidth = summaryBox.getBoundingClientRect().width;
    
    let top = rect.bottom + 10;
    let left = rect.left;
    
    // Ensure it stays in viewport
    if (top + boxHeight > window.innerHeight - 20) {
        top = rect.top - boxHeight - 10;
    }
    if (left + boxWidth > window.innerWidth - 20) {
        left = window.innerWidth - boxWidth - 20;
    }
    if (left < 20) left = 20;
    if (top < 20) top = 20;
    
    summaryBox.style.top = top + 'px';
    summaryBox.style.left = left + 'px';
    
    makeDraggable(summaryBox);
    noteTextArea.focus();
}

// Color picker functionality
function removeColorPicker() {
    if (colorPickerDialog) {
        removeElementWithCleanup(colorPickerDialog);
        colorPickerDialog = null;
    }
    document.removeEventListener("mousedown", handleDocumentClick);
}

function showColorPicker(selection) {
    removeColorPicker(); // remove existing color picker if there's any

    // Create the color picker
    const colorPicker = document.createElement("div");
    colorPicker.setAttribute("id", "colorPickerDialog");
    colorPicker.style.backgroundColor = "#ffffff";
    colorPicker.style.position = "fixed";
    colorPicker.style.zIndex = "10000";
    colorPicker.style.borderRadius = "16px";
    colorPicker.style.boxShadow = "0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)";
    colorPicker.style.padding = "20px";
    colorPicker.style.border = "1px solid rgba(0, 151, 255, 0.1)";
    colorPicker.style.backdropFilter = "blur(10px)";
    colorPicker.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    colorPicker.style.display = "flex";
    colorPicker.style.flexDirection = "column";
    colorPicker.style.gap = "16px";
    colorPicker.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    
    // Add a modern header
    let headerContainer = document.createElement("div");
    headerContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
        height: 28px;
    `;
    
    let titleContainer = document.createElement("div");
    titleContainer.style.cssText = `
        display: flex;
        align-items: center;
    `;
    
    let iconElement = document.createElement("div");
    iconElement.innerHTML = "🎨";
    iconElement.style.cssText = `
        font-size: 16px;
        opacity: 0.7;
        margin-right: 6px;
        line-height: 1;
    `;
    
    let titleElement = document.createElement("h4");
    titleElement.innerText = "Highlight";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1;
    `;
    
    titleContainer.appendChild(iconElement);
    titleContainer.appendChild(titleElement);
    
    // Modern close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "×";
    closeButton.style.cssText = `
        background: transparent;
        border: none;
        font-size: 20px;
        color: #6b7280;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s ease;
        font-family: system-ui;
        line-height: 1;
        padding: 0;
        margin: 0;
    `;
    
    closeButton.addEventListener("click", removeColorPicker);
    closeButton.addEventListener("mouseenter", function() {
        this.style.backgroundColor = "rgba(107, 114, 128, 0.1)";
        this.style.color = "#374151";
    });
    closeButton.addEventListener("mouseleave", function() {
        this.style.backgroundColor = "transparent";
        this.style.color = "#6b7280";
    });
    
    headerContainer.appendChild(titleContainer);
    headerContainer.appendChild(closeButton);
    colorPicker.appendChild(headerContainer);

    // Create highlight buttons
    const colors = [
        { name: "yellow", color: "#fbbf24", label: "Yellow" },
        { name: "pink", color: "#f472b6", label: "Pink" },
        { name: "lightgreen", color: "#4ade80", label: "Green" },
        { name: "lightblue", color: "#60a5fa", label: "Blue" },
        { name: "none", color: "transparent", label: "Remove" }
    ];
    
    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.cssText = `
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
    `;
    
    for (const colorOption of colors) {
        let btn = document.createElement("button");
        btn.title = colorOption.label;
        
        if (colorOption.name === "none") {
            btn.innerHTML = "Clear";
            btn.style.cssText = `
                width: 60px;
                height: 36px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                background: transparent;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            btn.addEventListener("mouseenter", function() {
                this.style.borderColor = "#ef4444";
                this.style.color = "#ef4444";
                this.style.transform = "scale(1.05)";
            });
            btn.addEventListener("mouseleave", function() {
                this.style.borderColor = "#e5e7eb";
                this.style.color = "#6b7280";
                this.style.transform = "scale(1)";
            });
        } else {
            btn.style.cssText = `
                width: 36px;
                height: 36px;
                border: 2px solid rgba(255, 255, 255, 0.8);
                border-radius: 8px;
                background: ${colorOption.color};
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            `;
            
            btn.addEventListener("mouseenter", function() {
                this.style.transform = "scale(1.1)";
                this.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
                this.style.borderColor = "#0097ff";
            });
            btn.addEventListener("mouseleave", function() {
                this.style.transform = "scale(1)";
                this.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                this.style.borderColor = "rgba(255, 255, 255, 0.8)";
            });
        }
        
        btn.addEventListener("click", async function () {
            const highlightColor = colorOption.name === "none" ? "none" : colorOption.name;
            
            if (highlightColor === "none") {
                // Clear highlights - returns array of cleared IDs
                const clearedIds = highlightSelectedText("none");
                if (clearedIds && clearedIds.length > 0) {
                    await saveChangeToDisk("clearHighlight", clearedIds, true);
                }
            } else {
                // Apply highlight - returns markData
                const markData = highlightSelectedText(highlightColor);
                if (markData) {
                    await saveChangeToDisk("highlight", highlightColor, false, markData);
                }
            }
            
            removeColorPicker();
            removeSelectionBox();
        });
        buttonWrapper.appendChild(btn);
    }
    colorPicker.appendChild(buttonWrapper);

    // Add intelligent positioning like other popups
    containerRoot.appendChild(colorPicker);
    colorPickerDialog = colorPicker;

    // Calculate positioning
    let boxHeight = colorPicker.getBoundingClientRect().height;
    let positionLeft = parseFloat(selectionBox.style.left);
    let spaceAbove = parseFloat(selectionBox.style.top);
    let spaceBelow = window.innerHeight - (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height);

    let positionTop;
    if (spaceAbove > boxHeight + 20) { // 20px buffer, prefer above for color picker
        // Position above the selection box
        positionTop = spaceAbove - boxHeight - 10;
    } else if (spaceBelow > boxHeight + 20) { // 20px buffer
        // Position below the selection box
        positionTop = parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10;
    } else {
        // Default to above if neither space is sufficient, but adjust to fit
        positionTop = Math.max(10, spaceAbove - boxHeight - 10);
    }

    colorPicker.style.top = positionTop + "px";
    colorPicker.style.left = positionLeft + "px";

    document.addEventListener("mousedown", handleDocumentClick);
}

function handleDocumentClick(event) {
    let colorPicker = containerRoot.getElementById("colorPickerDialog");
    // Ensuring the selectionBox is accessible in this scope
    if (!container.contains(event.target)) {
        if (colorPicker) {
            colorPicker.style.display = "none";
        }
        if (selectionBox) {
            selectionBox.style.display = "none";
        }
        // Also close edit toolbar if clicking outside
        const editToolbar = containerRoot.getElementById("readify-edit-toolbar");
        if (editToolbar && !editToolbar.contains(event.target)) {
            removeEditToolbar();
        }
    }
}

// ============================================
// EDIT TOOLBAR FOR EXISTING MARKS
// ============================================

let editToolbar = null;
let currentEditMark = null;

function initEditToolbarListeners() {
    // Add click listener for marks - use capture to intercept before other handlers
    document.addEventListener('click', handleMarkClick, true);
}

function handleMarkClick(event) {
    const mark = event.target.closest('readify-mark');
    
    // If clicking on a mark, show the appropriate UI
    if (mark) {
        // Don't show if there's an active text selection being made
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return; // Let the selection happen
        }
        
        // Prevent the click from bubbling (don't follow links inside marks, etc.)
        event.preventDefault();
        event.stopPropagation();
        
        const hasNote = mark.classList.contains('readify-with-notes');
        
        // If mark has a note, show the note edit modal instead of the color toolbar
        if (hasNote) {
            removeEditToolbar(); // Close any existing toolbar
            const markId = mark.getAttribute('data-mark-id');
            if (markId) {
                showNoteEditModal(mark);
            }
            return;
        }
        
        // Toggle toolbar - if clicking same mark, close it; if different mark, show new toolbar
        if (currentEditMark === mark && editToolbar) {
            removeEditToolbar();
        } else {
            showEditToolbar(mark);
        }
        return;
    }
    
    // If clicking outside of marks and toolbar, close the toolbar
    if (editToolbar && !editToolbar.contains(event.target)) {
        removeEditToolbar();
    }
}

function showEditToolbar(mark) {
    // Don't show if there's an active text selection
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    
    // Remove existing toolbar
    removeEditToolbar();
    
    currentEditMark = mark;
    const markId = mark.getAttribute('data-mark-id');
    const highlightId = mark.getAttribute('data-highlight-id');
    const isUnderline = mark.classList.contains('readify-underline');
    const hasNote = mark.classList.contains('readify-with-notes');
    const currentColor = mark.style.backgroundColor;
    
    // Create the toolbar
    editToolbar = document.createElement('div');
    editToolbar.id = 'readify-edit-toolbar';
    editToolbar.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 12px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-width: 180px;
        border: 1px solid rgba(0, 151, 255, 0.1);
    `;
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 6px;
        border-bottom: 1px solid #e5e7eb;
    `;
    title.textContent = isUnderline ? 'Edit Underline' : 'Edit Highlight';
    editToolbar.appendChild(title);
    
    // Color options row
    const colorRow = document.createElement('div');
    colorRow.style.cssText = `
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: center;
    `;
    
    const colors = isUnderline ? [
        { name: "black", color: "#000000", label: "Black" },
        { name: "blue", color: "#3b82f6", label: "Blue" },
        { name: "red", color: "#ef4444", label: "Red" },
        { name: "green", color: "#22c55e", label: "Green" },
        { name: "purple", color: "#8b5cf6", label: "Purple" }
    ] : [
        { name: "#fdffb4", color: "#fdffb4", label: "Yellow" },
        { name: "#fbbf24", color: "#fbbf24", label: "Orange" },
        { name: "#f472b6", color: "#f472b6", label: "Pink" },
        { name: "#4ade80", color: "#4ade80", label: "Green" },
        { name: "#60a5fa", color: "#60a5fa", label: "Blue" },
        { name: "#c084fc", color: "#c084fc", label: "Purple" }
    ];
    
    // Add color buttons
    for (const colorOption of colors) {
        const btn = document.createElement('button');
        btn.title = colorOption.label;
        btn.style.cssText = `
            width: 28px;
            height: 28px;
            border: 2px solid ${isCurrentColor(currentColor, colorOption.color) ? '#0097ff' : 'rgba(255, 255, 255, 0.8)'};
            border-radius: 6px;
            background: ${colorOption.color};
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.borderColor = '#0097ff';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.borderColor = isCurrentColor(currentColor, colorOption.color) ? '#0097ff' : 'rgba(255, 255, 255, 0.8)';
        });
        
        btn.addEventListener('click', async () => {
            await changeMarkColor(highlightId, colorOption.color, isUnderline);
            removeEditToolbar();
        });
        
        colorRow.appendChild(btn);
    }
    
    // Add remove button as a color-box style button with X
    const removeBtn = document.createElement('button');
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '✕';
    removeBtn.style.cssText = `
        width: 28px;
        height: 28px;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        background: #fff;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    `;
    
    removeBtn.addEventListener('mouseenter', () => {
        removeBtn.style.transform = 'scale(1.1)';
        removeBtn.style.borderColor = '#ef4444';
        removeBtn.style.color = '#ef4444';
        removeBtn.style.background = '#fef2f2';
    });
    removeBtn.addEventListener('mouseleave', () => {
        removeBtn.style.transform = 'scale(1)';
        removeBtn.style.borderColor = '#e5e7eb';
        removeBtn.style.color = '#9ca3af';
        removeBtn.style.background = '#fff';
    });
    
    removeBtn.addEventListener('click', async () => {
        await removeMark(highlightId, isUnderline);
        removeEditToolbar();
    });
    
    colorRow.appendChild(removeBtn);
    editToolbar.appendChild(colorRow);
    
    // Position the toolbar
    const rect = mark.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - 90;
    
    // Ensure it stays in viewport
    if (top + 150 > window.innerHeight) {
        top = rect.top - 150;
    }
    if (left < 10) left = 10;
    if (left + 180 > window.innerWidth) {
        left = window.innerWidth - 190;
    }
    
    editToolbar.style.top = top + 'px';
    editToolbar.style.left = left + 'px';
    
    // Prevent clicks inside toolbar from closing it
    editToolbar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    containerRoot.appendChild(editToolbar);
}

function removeEditToolbar() {
    if (editToolbar) {
        editToolbar.remove();
        editToolbar = null;
    }
    currentEditMark = null;
}

function isCurrentColor(current, option) {
    if (!current) return false;
    // Normalize color comparison
    const tempDiv = document.createElement('div');
    tempDiv.style.color = current;
    const currentNorm = tempDiv.style.color;
    tempDiv.style.color = option;
    const optionNorm = tempDiv.style.color;
    return currentNorm === optionNorm;
}

async function changeMarkColor(highlightId, newColor, isUnderline) {
    // Find all mark segments with this highlightId
    const marks = document.querySelectorAll(`readify-mark[data-highlight-id="${highlightId}"]`);
    
    marks.forEach(mark => {
        if (isUnderline) {
            mark.style.borderBottomColor = newColor;
        } else {
            mark.style.backgroundColor = newColor;
            // Update note indicator border if has notes
            if (mark.classList.contains('readify-with-notes')) {
                const rgb = hexToRgb(newColor) || parseRgb(newColor);
                if (rgb) {
                    mark.style.borderBottomColor = `rgb(${Math.max(0, rgb.r - 51)}, ${Math.max(0, rgb.g - 51)}, ${Math.max(0, rgb.b - 51)})`;
                }
            }
        }
    });
    
    // Update storage
    const urlDigest = await getURLDigest();
    const isPremium = window.ReadifySubscription ? await window.ReadifySubscription.isPremium() : false;
    const siteData = isPremium ? await loadFromSupabase(urlDigest) : await loadSiteFromLocal(urlDigest);
    
    if (siteData && siteData.changes) {
        const change = siteData.changes.find(c => c.highlightId === highlightId);
        if (change) {
            change.data = newColor;
            // Save updated data
            if (isPremium) {
                await saveToSupabase(urlDigest, siteData.changes, siteData.info, siteData.notes);
            } else {
                await saveSiteToLocal(urlDigest, siteData);
            }
        }
    }
}

async function removeMark(highlightId, isUnderline) {
    // Remove from DOM
    removeHighlightById(highlightId);
    
    // Remove from storage
    const type = isUnderline ? 'clearUnderline' : 'clearHighlight';
    await saveChangeToDisk(type, [highlightId], true);
    
    // Notify update
    notifyMySitesUpdate('updated');
}

// Initialize edit toolbar when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEditToolbarListeners);
    } else {
        initEditToolbarListeners();
    }
}