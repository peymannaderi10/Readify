// Readify Extension - UI Components
// Handles all popup UI components (Notes, TTS, Summary, Highlighter)

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
// featureName: "summarizer" | "tts" (or any string for custom features)
function showComingSoonPopup(featureName = "summarizer") {
    // Remove any existing coming soon popup
    const existingPopup = containerRoot.querySelector('#coming-soon-popup');
    if (existingPopup) existingPopup.remove();

    // Feature-specific content
    const featureContent = {
        summarizer: {
            icon: "✨",
            description: "AI Summarization will be available for Premium users. Stay tuned!"
        },
        tts: {
            icon: "🔊",
            description: "Text to Speech will be available for Premium users. Stay tuned!"
        }
    };

    const content = featureContent[featureName] || featureContent.summarizer;

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
        popup.remove();
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
            setTimeout(() => popup.remove(), 300);
        }
    }, 5000);

    makeDraggable(popup);
}

// Summary popup functionality
function showSummary(summary, text) {
    if (summaryBox) summaryBox.remove();

    summaryBox = document.createElement("div");
    summaryBox.style.position = "fixed";
    summaryBox.style.left = selectionBox.style.left;

    summaryBox.style.width = "min(500px, 90vw)";
    summaryBox.style.height = "auto";
    summaryBox.style.maxHeight = "70vh";
    summaryBox.style.backgroundColor = "#ffffff";
    summaryBox.style.borderRadius = "16px";
    summaryBox.style.boxShadow = "0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)";
    summaryBox.style.padding = "24px";
    summaryBox.style.border = "1px solid rgba(0, 151, 255, 0.1)";
    summaryBox.style.backdropFilter = "blur(10px)";
    summaryBox.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    summaryBox.style.display = "flex";
    summaryBox.style.flexDirection = "column";
    summaryBox.style.gap = "20px";
    summaryBox.style.overflow = "visible";
    summaryBox.style.zIndex = "10000";

    containerRoot.appendChild(summaryBox);

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
    iconElement.innerHTML = "🤖";
    iconElement.style.cssText = `
        font-size: 20px;
        opacity: 0.7;
        margin-right: 8px;
        line-height: 1;
    `;
    
    let titleElement = document.createElement("h3");
    titleElement.innerText = "AI Summary";
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
    headerContainer.appendChild(titleContainer);

    const dropdownContainer = document.createElement("div");
    dropdownContainer.className = "dropdown-container";

    const dropdownButton = document.createElement("button");
    dropdownButton.className = "dropdown-toggle";
    dropdownButton.innerText = "✨ Quick Actions";
    
    // Modern dropdown button styling
    dropdownButton.style.cssText = `
        padding: 12px 16px;
        border-radius: 10px;
        border: 2px solid rgba(0, 151, 255, 0.2);
        background: transparent;
        color: #0097ff;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        width: 100%;
        text-align: left;
        position: relative;
    `;
    
    dropdownButton.addEventListener("mouseenter", function() {
        this.style.backgroundColor = "rgba(0, 151, 255, 0.05)";
        this.style.borderColor = "#0097ff";
    });
    
    dropdownButton.addEventListener("mouseleave", function() {
        this.style.backgroundColor = "transparent";
        this.style.borderColor = "rgba(0, 151, 255, 0.2)";
    });
    
    dropdownContainer.appendChild(dropdownButton);

    const dropdownMenu = document.createElement("ul");
    dropdownMenu.className = "dropdown-menu";
    dropdownContainer.appendChild(dropdownMenu);

    const optionsList = [
        { value: "summary", label: "Summarize" },
        { value: "longSummary", label: "Long Summary" },
        { value: "shortSummary", label: "Shorter Summary" },
        {
            label: "Tone",
            options: [
                { value: "formalTone", label: "Formal Tone" },
                { value: "casualTone", label: "Casual Tone" },
                { value: "neutralTone", label: "Neutral Tone" },
            ],
        },
        {
            label: "Translate",
            options: [
                { value: "spanish", label: "Spanish" },
                { value: "french", label: "French" },
                { value: "mandarin", label: "Chinese (Simplified)" },
                { value: "cantonese", label: "Chinese (Traditional)" },
                { value: "korean", label: "Korean" },
                { value: "japanese", label: "Japanese" },
                { value: "vietnamese", label: "Vietnamese" },
                { value: "punjabi", label: "Punjabi" },
                { value: "arabic", label: "Arabic" },
                { value: "indonesian", label: "Indonesian" },
                { value: "turkish", label: "Turkish" },
                { value: "russian", label: "Russian" },
                { value: "german", label: "German" },
                { value: "tagalog", label: "Tagalog" },
                { value: "italian", label: "Italian" },
            ],
        },
    ];

    optionsList.forEach((opt) => {
        const li = document.createElement("li");
        if (opt.options) {
            li.innerText = opt.label;
            li.className = "has-submenu";

            const submenu = document.createElement("ul");
            submenu.className = "submenu";
            opt.options.forEach((subOpt) => {
                const subLi = document.createElement("li");
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

    const textArea = document.createElement("textarea");
    textArea.style.width = "100%";
    textArea.style.minHeight = "120px";
    textArea.style.maxHeight = "400px";
    textArea.style.resize = "none";
    textArea.style.boxSizing = "border-box";
    textArea.style.padding = "16px";
    textArea.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    textArea.style.fontSize = "15px";
    textArea.style.lineHeight = "1.5";
    textArea.style.border = "2px solid rgba(182, 240, 233, 0.3)";
    textArea.style.backgroundColor = "rgba(182, 240, 233, 0.05)";
    textArea.style.borderRadius = "12px";
    textArea.style.outline = "none";
    textArea.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    textArea.style.color = "#2d3748";
    textArea.style.overflow = "auto";
    textArea.value = summary;
    
    // Function to auto-resize textarea based on content
    function autoResizeTextarea() {
        textArea.style.height = "auto";
        const scrollHeight = textArea.scrollHeight;
        const minHeight = 120;
        const maxHeight = 400;
        
        if (scrollHeight <= maxHeight) {
            textArea.style.height = Math.max(scrollHeight, minHeight) + "px";
            textArea.style.overflow = "hidden";
        } else {
            textArea.style.height = maxHeight + "px";
            textArea.style.overflow = "auto";
        }
    }
    
    // Auto-resize on input and initial load
    textArea.addEventListener("input", autoResizeTextarea);
    
    // Initial resize after content is set
    setTimeout(autoResizeTextarea, 100);
    
    // Focus and hover effects for textarea
    textArea.addEventListener("focus", function() {
        this.style.borderColor = "#0097ff";
        this.style.backgroundColor = "rgba(182, 240, 233, 0.1)";
        this.style.boxShadow = "0 0 0 3px rgba(0, 151, 255, 0.1)";
    });
    
    textArea.addEventListener("blur", function() {
        this.style.borderColor = "rgba(182, 240, 233, 0.3)";
        this.style.backgroundColor = "rgba(182, 240, 233, 0.05)";
        this.style.boxShadow = "none";
    });

    dropdownButton.addEventListener("click", () => {
        const isShown = dropdownMenu.style.display === "block";
        dropdownMenu.style.display = isShown ? "none" : "block";
    });

    dropdownMenu.addEventListener("click", async (e) => {
        if (e.target.tagName === "LI" && e.target.dataset.value) {
            const value = e.target.dataset.value;
            dropdownMenu.style.display = "none";

            const overlay = showLoadingOverlay(textArea);
            textArea.disabled = true;

            const newSummary = await summarizeText(text, value);

            textArea.value = newSummary;
            
            // Auto-resize after new content is loaded
            setTimeout(autoResizeTextarea, 100);

            overlay.remove();
            textArea.disabled = false;
        }
    });

    // Create action buttons container
    const actionButtonsContainer = document.createElement("div");
    actionButtonsContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
    `;

    const copyButton = document.createElement("button");
    copyButton.innerText = "📋 Copy";
    copyButton.title = "Copy to Clipboard";
    
    // Modern copy button styling
    copyButton.style.cssText = `
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
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    copyButton.addEventListener("mouseenter", function() {
        this.style.backgroundColor = "rgba(0, 151, 255, 0.05)";
        this.style.borderColor = "#0097ff";
        this.style.transform = "translateY(-1px)";
    });
    
    copyButton.addEventListener("mouseleave", function() {
        this.style.backgroundColor = "transparent";
        this.style.borderColor = "rgba(0, 151, 255, 0.2)";
        this.style.transform = "translateY(0)";
    });

    copyButton.onclick = () => {
        copyToClipboard(textArea.value);
        // Modern feedback instead of alert
        copyButton.innerText = "✅ Copied!";
        setTimeout(() => {
            copyButton.innerText = "📋 Copy";
        }, 2000);
    };

    actionButtonsContainer.appendChild(copyButton);
    
    // Create modern close button
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
    
    closeButton.addEventListener('click', function() {
        summaryBox.remove();
    });
    
    closeButton.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        this.style.color = '#374151';
    });
    
    closeButton.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.color = '#6b7280';
    });
    
    // Add close button to header
    headerContainer.appendChild(closeButton);

    // Assemble the popup
    summaryBox.appendChild(headerContainer);
    summaryBox.appendChild(dropdownContainer);
    summaryBox.appendChild(textArea);
    summaryBox.appendChild(actionButtonsContainer);

    // Calculate positioning similar to note popup logic
    let boxHeight = summaryBox.getBoundingClientRect().height;
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

    summaryBox.style.top = positionTop + "px";
    summaryBox.style.left = positionLeft + "px";

    makeDraggable(summaryBox);
}

// Note popup functionality
function showNoteInput(initialText, anchorElement) {
    saveSelection();

    if (summaryBox) summaryBox.remove();

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
    titleElement.innerText = initialText ? "Edit Note" : "Add Note";
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
        summaryBox.remove();
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
    doneButton.onclick = function () {
        restoreSelection();
        let noteText = noteTextArea.value.trim();
        if (noteText) {
            if (!anchorElement) {
                saveChangeToDisk("note", noteText).then(() => {
                    createNoteAnchor(noteText);
                });
            } else {
                localStorage.setItem(anchorElement.textContent, noteText);
            }
        }
        summaryBox.remove();
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
            summaryBox.remove();
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

// Color picker functionality
function removeColorPicker() {
    if (colorPickerDialog) {
        containerRoot.removeChild(colorPickerDialog);
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
        
        btn.addEventListener("click", function () {
            // Double-check selection safety before applying highlight
            if (!isSelectionSafe() && colorOption.name !== "none") {
                showSelectionWarning();
                removeColorPicker();
                removeSelectionBox();
                return;
            }
            const highlightColor = colorOption.name === "none" ? "none" : colorOption.name;
            saveChangeToDisk("highlight", highlightColor).then(() => {
                highlightSelectedText(highlightColor);
                removeColorPicker();
                removeSelectionBox();
            });
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
    }
} 