// Readify Extension - Text-to-Speech Component
// Handles TTS functionality and controls

// Text-to-Speech state
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

