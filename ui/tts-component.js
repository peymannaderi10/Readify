// Readify Extension - Text-to-Speech Component
// Handles TTS functionality using OpenAI TTS API

// TTS state
let textToSpeak = "";
let ttsAudio = null;
let ttsAudioUrl = null;
let isLoading = false;

// Get the selected TTS voice from storage
async function getSelectedVoice() {
    return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['ttsVoice'], (result) => {
                resolve(result.ttsVoice || 'nova');
            });
        } else {
            resolve('nova');
        }
    });
}

// Fetch TTS audio from OpenAI API (always at 1.0 speed, we control playback rate locally)
async function fetchTTSAudio(text) {
    const client = window.ReadifySupabase?.getClient();
    
    if (!client) {
        throw new Error('Not connected to service');
    }
    
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Please sign in to use text-to-speech');
    }
    
    // Get selected voice from storage
    const selectedVoice = await getSelectedVoice();
    
    const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.AI_TTS);
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            text: text,
            voice: selectedVoice,
            speed: 1.0  // Always generate at normal speed, we control playback rate locally
        }),
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate speech' }));
        
        // Handle token limit error specifically (TTS feature)
        if (error.code === 'TOKEN_LIMIT_REACHED') {
            const upgradeMsg = error.upgrade ? ' Upgrade to Premium for more!' : '';
            throw new Error(`Text-to-speech limit reached.${upgradeMsg}`);
        }
        
        throw new Error(error.error || 'Failed to generate speech');
    }
    
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
}

// Play the TTS audio
async function playTTS(playButton) {
    if (isLoading) return;
    
    // If already have audio and it's paused, just resume
    if (ttsAudio && ttsAudio.paused && ttsAudioUrl) {
        ttsAudio.play();
        updatePlayButtonState(playButton, 'playing');
        return;
    }
    
    // If no audio yet, fetch it
    if (!ttsAudioUrl) {
        isLoading = true;
        updatePlayButtonState(playButton, 'loading');
        
        try {
            ttsAudioUrl = await fetchTTSAudio(textToSpeak);
            
            ttsAudio = new Audio(ttsAudioUrl);
            
            // Apply volume
            const volumeControl = document.getElementById('volumeControl');
            if (volumeControl) {
                ttsAudio.volume = parseFloat(volumeControl.value);
            }
            
            // Apply playback rate (speed)
            const rateControl = document.getElementById('rateControl');
            if (rateControl) {
                ttsAudio.playbackRate = parseFloat(rateControl.value);
            }
            
            // Set up event handlers
            ttsAudio.onended = () => {
                updatePlayButtonState(playButton, 'stopped');
            };
            
            ttsAudio.onerror = () => {
                console.error('[TTS] Audio playback error');
                updatePlayButtonState(playButton, 'stopped');
            };
            
            await ttsAudio.play();
            updatePlayButtonState(playButton, 'playing');
            
        } catch (error) {
            console.error('[TTS] Error:', error);
            showTTSError(error.message);
            updatePlayButtonState(playButton, 'stopped');
        } finally {
            isLoading = false;
        }
    } else {
        // Have audio URL, create new audio element
        ttsAudio = new Audio(ttsAudioUrl);
        
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            ttsAudio.volume = parseFloat(volumeControl.value);
        }
        
        const rateControl = document.getElementById('rateControl');
        if (rateControl) {
            ttsAudio.playbackRate = parseFloat(rateControl.value);
        }
        
        ttsAudio.onended = () => {
            updatePlayButtonState(playButton, 'stopped');
        };
        
        await ttsAudio.play();
        updatePlayButtonState(playButton, 'playing');
    }
}

// Pause the TTS audio
function pauseTTS(playButton) {
    if (ttsAudio && !ttsAudio.paused) {
        ttsAudio.pause();
        updatePlayButtonState(playButton, 'paused');
    }
}

// Update play button visual state
function updatePlayButtonState(button, state) {
    if (!button) return;
    
    switch (state) {
        case 'loading':
            button.innerHTML = '<span class="tts-spinner"></span> Loading...';
            button.disabled = true;
            button.style.opacity = '0.7';
            break;
        case 'playing':
            button.innerHTML = '▶ Playing';
            button.disabled = false;
            button.style.opacity = '1';
            break;
        case 'paused':
            button.innerHTML = '▶ Resume';
            button.disabled = false;
            button.style.opacity = '1';
            break;
        case 'stopped':
        default:
            button.innerHTML = '▶ Play';
            button.disabled = false;
            button.style.opacity = '1';
            break;
    }
}

// Show error message
function showTTSError(message) {
    const errorDiv = document.getElementById('tts-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Update audio volume when slider changes
function updateTTSVolume() {
    const volumeControl = document.getElementById('volumeControl');
    if (ttsAudio && volumeControl) {
        ttsAudio.volume = parseFloat(volumeControl.value);
    }
}

// Update audio playback speed when slider changes
function updateTTSSpeed() {
    const rateControl = document.getElementById('rateControl');
    if (ttsAudio && rateControl) {
        ttsAudio.playbackRate = parseFloat(rateControl.value);
    }
}

// Clean up audio resources
function cleanupAudio() {
    if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio = null;
    }
    if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
        ttsAudioUrl = null;
    }
}

function removeTTS() {
    if (ttsBox) {
        cleanupAudio();
        removeElementWithCleanup(ttsBox);
        ttsBox = null;
    }
    isLoading = false;
    document.removeEventListener('mousedown', handleDocumentClick);
}

function showTextToSpeech(text) {
    if (ttsBox) {
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
    
    // Error message container (hidden by default)
    const errorDiv = document.createElement('div');
    errorDiv.id = 'tts-error';
    errorDiv.style.cssText = `
        display: none;
        padding: 10px 14px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        font-size: 13px;
        text-align: center;
    `;
    ttsBox.appendChild(errorDiv);

    // Container for Play and Pause buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
        width: 100%;
    `;

    const playButton = document.createElement('button');
    playButton.innerHTML = '▶ Play';
    playButton.classList.add('control-button');
    
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
        this.style.background = "linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)";
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "0 4px 12px rgba(0, 151, 255, 0.3)";
    });
    
    playButton.onclick = function() {
        playTTS(playButton);
    };

    const pauseButton = document.createElement('button');
    pauseButton.innerText = '⏸ Pause';
    pauseButton.classList.add('control-button');
    
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
    
    pauseButton.onclick = function() {
        pauseTTS(playButton);
    };

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
    volumeControl.oninput = function() {
        updateTTSVolume();
        updateVolumeSliderProgress();
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
        .tts-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: tts-spin 0.8s linear infinite;
        }
        @keyframes tts-spin {
            to { transform: rotate(360deg); }
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
    rateControl.max = '2.0';
    rateControl.step = '0.1';
    rateControl.value = '1';
    rateControl.id = 'rateControl';
    rateControl.oninput = function() {
        updateTTSSpeed();
        updateRateSliderProgress();
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
