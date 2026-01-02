// Readify Extension - UI Components
// Handles all popup UI components (Notes, TTS, Summary, Highlighter)

// Text-to-Speech functionality using OpenAI TTS
let textToSpeak = "";
let ttsAudioPlayer = null;
let ttsIsPlaying = false;
let ttsIsLoading = false;

/**
 * Generates and plays TTS audio using OpenAI
 */
async function generateAndPlayTTS() {
    if (ttsIsLoading || !textToSpeak) return;
    
    ttsIsLoading = true;
    updateTTSButtonStates();
    
    try {
        // Stop any existing playback
        if (ttsAudioPlayer) {
            ttsAudioPlayer.pause();
            ttsAudioPlayer = null;
        }
        
        // Generate audio using OpenAI TTS (at normal speed, we'll adjust playback rate)
        ttsAudioPlayer = await speakText(textToSpeak, { speed: 1.0 });
        
        // Apply current volume and speed settings from sliders
        applyAudioSettings();
        
        // Handle playback events
        ttsAudioPlayer.addEventListener('ended', () => {
            ttsIsPlaying = false;
            updateTTSButtonStates();
        });
        
        ttsAudioPlayer.addEventListener('pause', () => {
            ttsIsPlaying = false;
            updateTTSButtonStates();
        });
        
        ttsAudioPlayer.addEventListener('play', () => {
            ttsIsPlaying = true;
            updateTTSButtonStates();
        });
        
        // Start playback
        await ttsAudioPlayer.play();
        ttsIsPlaying = true;
        
    } catch (error) {
        console.error('TTS Error:', error);
        showTTSError(error.message);
    } finally {
        ttsIsLoading = false;
        updateTTSButtonStates();
    }
}

/**
 * Applies current volume and speed settings to the audio player
 */
function applyAudioSettings() {
    if (!ttsAudioPlayer) return;
    
    const volumeControl = document.getElementById("volumeControl");
    const rateControl = document.getElementById("rateControl");
    
    if (volumeControl) {
        ttsAudioPlayer.volume = parseFloat(volumeControl.value);
    }
    
    if (rateControl) {
        ttsAudioPlayer.playbackRate = parseFloat(rateControl.value);
    }
}

/**
 * Plays or resumes TTS audio
 */
function playSpeech() {
    if (ttsAudioPlayer && !ttsIsPlaying) {
        // Audio is pre-generated, just play it
        ttsAudioPlayer.play().then(() => {
            ttsIsPlaying = true;
            updateTTSButtonStates();
        }).catch(err => {
            console.error('Play error:', err);
            showTTSError('Failed to play audio');
        });
    } else if (!ttsAudioPlayer && !ttsIsLoading) {
        // No audio yet and not loading, generate and play
        generateAndPlayTTS();
    }
    // If ttsIsLoading is true, audio is being generated - button should be disabled anyway
}

/**
 * Pauses TTS audio
 */
function pauseSpeech() {
    if (ttsAudioPlayer && ttsIsPlaying) {
        ttsAudioPlayer.pause();
        ttsIsPlaying = false;
        updateTTSButtonStates();
    }
}

/**
 * Updates the play/pause button states with animated loading spinner
 */
function updateTTSButtonStates() {
    const playButton = document.getElementById("ttsPlayButton");
    const pauseButton = document.getElementById("ttsPauseButton");
    const loadingIndicator = document.getElementById("ttsLoadingIndicator");
    
    if (playButton) {
        if (ttsIsLoading) {
            playButton.innerHTML = '<span class="tts-spinner"></span> Generating...';
            playButton.disabled = true;
            playButton.style.opacity = '0.7';
            playButton.style.cursor = 'wait';
        } else if (ttsIsPlaying) {
            playButton.innerHTML = '🔊 Playing';
            playButton.disabled = true;
            playButton.style.opacity = '0.7';
            playButton.style.cursor = 'default';
        } else if (ttsAudioPlayer) {
            // Audio is ready, show instant play option
            playButton.innerHTML = '▶ Play';
            playButton.disabled = false;
            playButton.style.opacity = '1';
            playButton.style.cursor = 'pointer';
        } else {
            playButton.innerHTML = '▶ Play';
            playButton.disabled = false;
            playButton.style.opacity = '1';
            playButton.style.cursor = 'pointer';
        }
    }
    
    if (pauseButton) {
        pauseButton.disabled = !ttsIsPlaying;
        pauseButton.style.opacity = ttsIsPlaying ? '1' : '0.5';
    }
    
    // Update loading indicator
    if (loadingIndicator) {
        if (ttsIsLoading) {
            const charCount = textToSpeak.length;
            const estSeconds = Math.max(2, Math.ceil(charCount / 500)); // ~500 chars per second generation
            loadingIndicator.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <div class="tts-pulse"></div>
                <span>Generating audio (~${estSeconds}s)...</span>
            </div>`;
            loadingIndicator.style.display = 'block';
        } else if (ttsAudioPlayer && !ttsIsPlaying) {
            // Show ready state
            loadingIndicator.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="color: #10b981;">✓</span>
                <span style="color: #10b981;">Audio ready!</span>
            </div>`;
            loadingIndicator.style.display = 'block';
            // Hide after 2 seconds
            setTimeout(() => {
                if (loadingIndicator && ttsAudioPlayer && !ttsIsPlaying && !ttsIsLoading) {
                    loadingIndicator.style.display = 'none';
                }
            }, 2000);
        } else {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Shows TTS error message in the TTS box
 */
function showTTSError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 12px;
        text-align: center;
        padding: 8px;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 8px;
        margin-top: 8px;
    `;
    errorDiv.textContent = message || 'Failed to generate speech. Please try again.';
    
    if (ttsBox) {
        ttsBox.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function removeTTS() {
    if (ttsBox) {
        // Stop any ongoing audio
        if (ttsAudioPlayer) {
            ttsAudioPlayer.pause();
            ttsAudioPlayer = null;
        }
        ttsIsPlaying = false;
        ttsIsLoading = false;
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
    ttsAudioPlayer = null; // Reset audio player for new text
    ttsIsPlaying = false;
    ttsIsLoading = false;
    
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
    
    // Add "Powered by OpenAI" badge
    let poweredByBadge = document.createElement("span");
    poweredByBadge.innerText = "OpenAI";
    poweredByBadge.style.cssText = `
        font-size: 10px;
        color: #6b7280;
        background: rgba(0, 151, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
        font-weight: 500;
    `;
    
    titleContainer.appendChild(iconElement);
    titleContainer.appendChild(titleElement);
    titleContainer.appendChild(poweredByBadge);

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
    playButton.id = 'ttsPlayButton';
    playButton.innerText = '▶ Play';
    playButton.classList.add('control-button');
    playButton.onclick = function () {
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
        min-width: 100px;
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    `;
    
    playButton.addEventListener("mouseenter", function() {
        if (!this.disabled) {
            this.style.background = "linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)";
            this.style.transform = "translateY(-2px)";
            this.style.boxShadow = "0 6px 20px rgba(0, 151, 255, 0.4)";
        }
    });
    
    playButton.addEventListener("mouseleave", function() {
        if (!this.disabled) {
            this.style.background = "linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)";
            this.style.transform = "translateY(0)";
            this.style.boxShadow = "0 4px 12px rgba(0, 151, 255, 0.3)";
        }
    });

    const pauseButton = document.createElement('button');
    pauseButton.id = 'ttsPauseButton';
    pauseButton.innerText = '⏸ Pause';
    pauseButton.classList.add('control-button');
    pauseButton.onclick = pauseSpeech;
    pauseButton.disabled = true; // Initially disabled until audio is playing
    
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
        opacity: 0.5;
    `;
    
    pauseButton.addEventListener("mouseenter", function() {
        if (!this.disabled) {
            this.style.backgroundColor = "rgba(0, 151, 255, 0.05)";
            this.style.borderColor = "#0097ff";
            this.style.transform = "translateY(-1px)";
        }
    });
    
    pauseButton.addEventListener("mouseleave", function() {
        if (!this.disabled) {
            this.style.backgroundColor = "transparent";
            this.style.borderColor = "rgba(0, 151, 255, 0.2)";
            this.style.transform = "translateY(0)";
        }
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
    
    const volumeLabelContainer = document.createElement('div');
    volumeLabelContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const volumeLabel = document.createElement('label');
    volumeLabel.innerText = 'Volume';
    volumeLabel.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    const volumeValue = document.createElement('span');
    volumeValue.id = 'volumeValueDisplay';
    volumeValue.innerText = '100%';
    volumeValue.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: #0097ff;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    volumeLabelContainer.appendChild(volumeLabel);
    volumeLabelContainer.appendChild(volumeValue);
    
    const volumeControl = document.createElement('input');
    volumeControl.type = 'range';
    volumeControl.min = '0';
    volumeControl.max = '1';
    volumeControl.step = '0.01';
    volumeControl.value = '1';
    volumeControl.id = 'volumeControl';
    volumeControl.oninput = function() {
        const volume = parseFloat(this.value);
        // Update volume on the audio player in real-time
        if (ttsAudioPlayer) {
            ttsAudioPlayer.volume = volume;
        }
        // Update the volume display
        const display = document.getElementById('volumeValueDisplay');
        if (display) {
            display.innerText = Math.round(volume * 100) + '%';
        }
    };
    
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
    
    volumeSection.appendChild(volumeLabelContainer);
    volumeSection.appendChild(volumeControl);

    // Modern speed control section
    const speedSection = document.createElement('div');
    speedSection.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    const speedLabelContainer = document.createElement('div');
    speedLabelContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const speedLabel = document.createElement('label');
    speedLabel.innerText = 'Speed';
    speedLabel.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    const speedValue = document.createElement('span');
    speedValue.id = 'speedValueDisplay';
    speedValue.innerText = '1.0x';
    speedValue.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: #0097ff;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    speedLabelContainer.appendChild(speedLabel);
    speedLabelContainer.appendChild(speedValue);
    
    // Helper function to update speed display
    function updateSpeedDisplay(speed) {
        const display = document.getElementById('speedValueDisplay');
        if (display) {
            display.innerText = speed.toFixed(1) + 'x';
        }
    }

    const rateControl = document.createElement('input');
    rateControl.type = 'range';
    rateControl.min = '0.5';
    rateControl.max = '2.0';
    rateControl.step = '0.1';
    rateControl.value = '1';
    rateControl.id = 'rateControl';
    // Real-time speed adjustment using HTML5 Audio playbackRate
    rateControl.oninput = function() {
        const speed = parseFloat(this.value);
        // Update playback speed in real-time
        if (ttsAudioPlayer) {
            ttsAudioPlayer.playbackRate = speed;
        }
        // Update the speed display
        updateSpeedDisplay(speed);
    };
    
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
    
    speedSection.appendChild(speedLabelContainer);
    speedSection.appendChild(rateControl);

    // Loading indicator with animation
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'ttsLoadingIndicator';
    loadingIndicator.style.cssText = `
        display: none;
        font-size: 12px;
        color: #6b7280;
        text-align: center;
        padding: 8px 12px;
        background: rgba(0, 151, 255, 0.05);
        border-radius: 8px;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    // Add CSS for spinner and pulse animations
    const ttsAnimationStyle = document.createElement('style');
    ttsAnimationStyle.textContent = `
        @keyframes tts-spin {
            to { transform: rotate(360deg); }
        }
        @keyframes tts-pulse-animation {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
        }
        .tts-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: tts-spin 0.8s linear infinite;
        }
        .tts-pulse {
            width: 10px;
            height: 10px;
            background: #0097ff;
            border-radius: 50%;
            animation: tts-pulse-animation 1.5s ease-in-out infinite;
        }
    `;
    document.head.appendChild(ttsAnimationStyle);

    ttsBox.appendChild(buttonContainer);
    ttsBox.appendChild(loadingIndicator);
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
    
    // Auto-generate audio in background so it's ready when user clicks Play
    // This reduces perceived latency significantly
    setTimeout(() => {
        if (textToSpeak && !ttsAudioPlayer && !ttsIsLoading) {
            preGenerateTTSAudio();
        }
    }, 100);
}

/**
 * Pre-generates TTS audio in background (doesn't auto-play)
 */
async function preGenerateTTSAudio() {
    if (ttsIsLoading || ttsAudioPlayer || !textToSpeak) return;
    
    ttsIsLoading = true;
    updateTTSButtonStates();
    
    try {
        // Generate audio at normal speed (we'll adjust playback rate in real-time)
        ttsAudioPlayer = await speakText(textToSpeak, { speed: 1.0 });
        
        // Apply current volume and speed settings
        applyAudioSettings();
        
        // Set up event handlers
        ttsAudioPlayer.addEventListener('ended', () => {
            ttsIsPlaying = false;
            updateTTSButtonStates();
        });
        
        ttsAudioPlayer.addEventListener('pause', () => {
            ttsIsPlaying = false;
            updateTTSButtonStates();
        });
        
        ttsAudioPlayer.addEventListener('play', () => {
            ttsIsPlaying = true;
            updateTTSButtonStates();
        });
        
        console.log('[TTS] Audio pre-generated and ready to play');
        
    } catch (error) {
        console.error('TTS Pre-generation Error:', error);
        // Don't show error - user hasn't clicked play yet
        ttsAudioPlayer = null;
    } finally {
        ttsIsLoading = false;
        updateTTSButtonStates();
    }
}

// OpenAI TTS doesn't require voice initialization like browser speechSynthesis

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

// Summary popup functionality
function showSummary(summary, text) {
    if (summaryBox) {
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
    }

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
    titleElement.innerText = "AI Chat";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1;
    `;
    
    // Add "Powered by OpenAI" badge
    let poweredByBadge = document.createElement("span");
    poweredByBadge.innerText = "GPT-4o";
    poweredByBadge.style.cssText = `
        font-size: 10px;
        color: #6b7280;
        background: rgba(0, 151, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
        font-weight: 500;
    `;
    
    titleContainer.appendChild(iconElement);
    titleContainer.appendChild(titleElement);
    titleContainer.appendChild(poweredByBadge);
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
        removeElementWithCleanup(summaryBox);
        summaryBox = null;
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

// ============================================
// AI CHAT PANEL - Slide-in from right
// ============================================

let chatPanel = null;
let chatButton = null;
let chatMessages = [];
let chatIsLoading = false;
let pageContentCache = null;

/**
 * Extracts the main text content from the current page
 */
function extractPageContent() {
    if (pageContentCache) return pageContentCache;
    
    // Get the page title
    const title = document.title || 'Untitled Page';
    
    // Get main content - prioritize article, main, or body
    const contentSelectors = ['article', 'main', '[role="main"]', '.content', '#content', '.post', '.article'];
    let mainContent = null;
    
    for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.length > 500) {
            mainContent = el;
            break;
        }
    }
    
    // Fallback to body if no main content found
    if (!mainContent) {
        mainContent = document.body;
    }
    
    // Extract text, removing scripts, styles, and navigation
    const clone = mainContent.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', '.sidebar', '.menu', '.navigation', '.ad', '.advertisement', 'iframe'];
    unwantedSelectors.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    let text = clone.innerText || clone.textContent || '';
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit to ~12000 characters (~3000 tokens) to stay within context limits
    if (text.length > 12000) {
        text = text.substring(0, 12000) + '... [content truncated]';
    }
    
    pageContentCache = {
        title,
        url: window.location.href,
        content: text
    };
    
    return pageContentCache;
}

/**
 * Creates the floating chat button
 */
function createChatButton() {
    if (chatButton) return;
    
    chatButton = document.createElement('div');
    chatButton.id = 'readify-chat-button';
    chatButton.innerHTML = '🤖';
    chatButton.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 151, 255, 0.4);
        z-index: 99999;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    chatButton.addEventListener('mouseenter', () => {
        chatButton.style.transform = 'scale(1.1)';
        chatButton.style.boxShadow = '0 6px 28px rgba(0, 151, 255, 0.5)';
    });
    
    chatButton.addEventListener('mouseleave', () => {
        chatButton.style.transform = 'scale(1)';
        chatButton.style.boxShadow = '0 4px 20px rgba(0, 151, 255, 0.4)';
    });
    
    chatButton.addEventListener('click', toggleChatPanel);
    
    document.body.appendChild(chatButton);
}

/**
 * Toggles the chat panel open/closed
 */
function toggleChatPanel() {
    if (chatPanel && chatPanel.classList.contains('open')) {
        closeChatPanel();
    } else {
        openChatPanel();
    }
}

/**
 * Opens the chat panel
 */
async function openChatPanel() {
    // Check premium access
    const config = window.READIFY_CONFIG || READIFY_CONFIG;
    if (config.TESTING_MODE !== true) {
        const canAccess = await checkPremiumFeature('summarize');
        if (!canAccess) {
            showUpgradePrompt('summarize');
            return;
        }
    }
    
    if (!chatPanel) {
        createChatPanel();
    }
    
    // Extract page content when opening
    extractPageContent();
    
    // Slide in
    setTimeout(() => {
        chatPanel.classList.add('open');
        chatButton.innerHTML = '✕';
        chatButton.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }, 10);
}

/**
 * Closes the chat panel
 */
function closeChatPanel() {
    if (chatPanel) {
        chatPanel.classList.remove('open');
        chatButton.innerHTML = '🤖';
        chatButton.style.background = 'linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)';
    }
}

/**
 * Creates the chat panel UI
 */
function createChatPanel() {
    // Add CSS animations
    const chatStyles = document.createElement('style');
    chatStyles.id = 'readify-chat-styles';
    chatStyles.textContent = `
        #readify-chat-panel {
            position: fixed;
            top: 0;
            right: -400px;
            width: 380px;
            max-width: 90vw;
            height: 100vh;
            background: #ffffff;
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
            z-index: 99998;
            display: flex;
            flex-direction: column;
            font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #readify-chat-panel.open {
            right: 0;
        }
        .chat-header {
            padding: 20px;
            background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
            color: white;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .chat-header-icon {
            font-size: 24px;
        }
        .chat-header-title {
            flex: 1;
            font-size: 18px;
            font-weight: 600;
        }
        .chat-header-badge {
            font-size: 10px;
            background: rgba(255,255,255,0.2);
            padding: 4px 8px;
            border-radius: 4px;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #f8feff;
        }
        .chat-message {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        .chat-message.user {
            align-self: flex-end;
            background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }
        .chat-message.assistant {
            align-self: flex-start;
            background: white;
            color: #2c3e50;
            border: 1px solid rgba(0, 151, 255, 0.1);
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .chat-message.assistant p:first-child {
            margin-top: 0;
        }
        .chat-message.assistant p:last-child {
            margin-bottom: 0;
        }
        .chat-message.assistant ul {
            margin: 8px 0;
        }
        .chat-message.assistant li {
            margin: 4px 0;
        }
        .chat-message.assistant strong {
            color: #1a202c;
        }
        .chat-message.system {
            align-self: center;
            background: rgba(0, 151, 255, 0.1);
            color: #0097ff;
            font-size: 12px;
            padding: 8px 16px;
            border-radius: 20px;
        }
        .chat-typing {
            display: flex;
            gap: 4px;
            padding: 12px 16px;
            align-self: flex-start;
        }
        .chat-typing-dot {
            width: 8px;
            height: 8px;
            background: #0097ff;
            border-radius: 50%;
            animation: typing-bounce 1.4s infinite ease-in-out;
        }
        .chat-typing-dot:nth-child(1) { animation-delay: 0s; }
        .chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-6px); opacity: 1; }
        }
        .chat-input-container {
            padding: 16px;
            background: white;
            border-top: 1px solid rgba(0, 151, 255, 0.1);
            display: flex;
            gap: 12px;
        }
        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid rgba(0, 151, 255, 0.2);
            border-radius: 24px;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s;
            resize: none;
            max-height: 120px;
        }
        .chat-input:focus {
            border-color: #0097ff;
        }
        .chat-send-btn {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .chat-send-btn:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 151, 255, 0.4);
        }
        .chat-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .chat-welcome {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        .chat-welcome-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .chat-welcome-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        .chat-welcome-text {
            font-size: 14px;
            line-height: 1.6;
        }
        .chat-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
            margin-top: 20px;
        }
        .chat-suggestion {
            padding: 8px 16px;
            background: white;
            border: 1px solid rgba(0, 151, 255, 0.2);
            border-radius: 20px;
            font-size: 13px;
            color: #0097ff;
            cursor: pointer;
            transition: all 0.2s;
        }
        .chat-suggestion:hover {
            background: rgba(0, 151, 255, 0.1);
            border-color: #0097ff;
        }
    `;
    document.head.appendChild(chatStyles);
    
    // Create panel
    chatPanel = document.createElement('div');
    chatPanel.id = 'readify-chat-panel';
    
    // Header
    const header = document.createElement('div');
    header.className = 'chat-header';
    header.innerHTML = `
        <span class="chat-header-icon">🤖</span>
        <span class="chat-header-title">AI Chat</span>
        <span class="chat-header-badge">GPT-4o</span>
    `;
    
    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chat-messages';
    messagesContainer.id = 'chat-messages';
    
    // Welcome message
    const pageInfo = extractPageContent();
    messagesContainer.innerHTML = `
        <div class="chat-welcome">
            <div class="chat-welcome-icon">💬</div>
            <div class="chat-welcome-title">Chat about this page</div>
            <div class="chat-welcome-text">
                I've read "${pageInfo.title.substring(0, 50)}${pageInfo.title.length > 50 ? '...' : ''}". Ask me anything about it!
            </div>
            <div class="chat-suggestions">
                <div class="chat-suggestion" data-prompt="Summarize this page">📝 Summarize</div>
                <div class="chat-suggestion" data-prompt="What are the key points?">🎯 Key points</div>
                <div class="chat-suggestion" data-prompt="Explain this in simple terms">💡 Simplify</div>
            </div>
        </div>
    `;
    
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chat-input-container';
    
    const input = document.createElement('textarea');
    input.className = 'chat-input';
    input.id = 'chat-input';
    input.placeholder = 'Ask about this page...';
    input.rows = 1;
    
    const sendBtn = document.createElement('button');
    sendBtn.className = 'chat-send-btn';
    sendBtn.id = 'chat-send-btn';
    sendBtn.innerHTML = '➤';
    
    inputContainer.appendChild(input);
    inputContainer.appendChild(sendBtn);
    
    chatPanel.appendChild(header);
    chatPanel.appendChild(messagesContainer);
    chatPanel.appendChild(inputContainer);
    
    document.body.appendChild(chatPanel);
    
    // Event listeners
    sendBtn.addEventListener('click', sendChatMessage);
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Auto-resize textarea
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    
    // Suggestion clicks
    messagesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-suggestion')) {
            const prompt = e.target.dataset.prompt;
            if (prompt) {
                input.value = prompt;
                sendChatMessage();
            }
        }
    });
}

/**
 * Converts basic markdown to HTML
 */
function parseMarkdown(text) {
    // Escape HTML first
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+?)_/g, '<em>$1</em>');
    
    // Inline code: `code`
    html = html.replace(/`([^`]+?)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>');
    
    // Convert bullet points (- or •) to styled list items
    const lines = html.split('\n');
    let inList = false;
    let result = [];
    
    for (let line of lines) {
        const bulletMatch = line.match(/^(\s*)[-•]\s+(.+)$/);
        if (bulletMatch) {
            if (!inList) {
                result.push('<ul style="margin: 8px 0; padding-left: 20px; list-style-type: disc;">');
                inList = true;
            }
            result.push(`<li style="margin: 4px 0;">${bulletMatch[2]}</li>`);
        } else {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            if (line.trim()) {
                result.push(`<p style="margin: 8px 0;">${line}</p>`);
            }
        }
    }
    
    if (inList) {
        result.push('</ul>');
    }
    
    return result.join('');
}

/**
 * Adds a message to the chat
 */
function addChatMessage(content, role) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.chat-welcome');
    if (welcome) welcome.remove();
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${role}`;
    
    // Parse markdown for assistant messages, plain text for user
    if (role === 'assistant') {
        messageEl.innerHTML = parseMarkdown(content);
    } else {
        messageEl.textContent = content;
    }
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Store in history
    chatMessages.push({ role, content });
}

/**
 * Shows typing indicator
 */
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-typing';
    typingEl.id = 'chat-typing';
    typingEl.innerHTML = `
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
    `;
    
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Hides typing indicator
 */
function hideTypingIndicator() {
    const typing = document.getElementById('chat-typing');
    if (typing) typing.remove();
}

/**
 * Sends a chat message
 */
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    const message = input.value.trim();
    if (!message || chatIsLoading) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    input.style.height = 'auto';
    
    // Disable input
    chatIsLoading = true;
    sendBtn.disabled = true;
    
    showTypingIndicator();
    
    try {
        // Build context with page content
        const pageInfo = extractPageContent();
        
        const systemPrompt = `You are an AI assistant helping users understand web content. You have access to the following webpage:

Title: ${pageInfo.title}
URL: ${pageInfo.url}

Content:
${pageInfo.content}

Answer questions about this content. Be concise, helpful, and accurate. If asked to summarize, provide clear summaries with bullet points for key takeaways. If the user asks about something not in the content, let them know.`;
        
        // Build conversation history (limit to last 10 messages)
        const conversationHistory = chatMessages.slice(-10).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
        
        // Remove the last user message since we'll add it fresh
        if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user') {
            conversationHistory.pop();
        }
        
        // Call OpenAI
        const response = await chatWithAI(message, systemPrompt, conversationHistory);
        
        hideTypingIndicator();
        addChatMessage(response, 'assistant');
        
    } catch (error) {
        console.error('Chat error:', error);
        hideTypingIndicator();
        addChatMessage('Sorry, I encountered an error. Please try again.', 'system');
    } finally {
        chatIsLoading = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

/**
 * Initializes the chat button when extension is enabled
 */
function initializeChatButton() {
    if (!chatButton) {
        createChatButton();
    }
}

/**
 * Removes the chat button and panel
 */
function removeChatButton() {
    if (chatButton) {
        chatButton.remove();
        chatButton = null;
    }
    if (chatPanel) {
        chatPanel.remove();
        chatPanel = null;
    }
    // Clear cache
    pageContentCache = null;
    chatMessages = [];
} 