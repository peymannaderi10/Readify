// Readify Extension - Voice Service
// Handles OpenAI Realtime API voice chat with ephemeral tokens

// Voice service state
let realtimeWs = null;
let realtimeActive = false;
let realtimeAudioContext = null;
let realtimeMicStream = null;
let realtimeWorkletNode = null;
let realtimeAudioQueue = [];
let realtimeIsPlaying = false;
let realtimeNextPlayTime = 0;
let realtimeActiveSources = [];
let realtimeResponseActive = false;
let realtimeAssistantBuffer = '';
let currentResponseId = null; // Track current response for proper cancellation

// Callbacks
let onStatusChange = null;
let onTranscript = null;
let onAssistantText = null;
let onAssistantDone = null;
let onError = null;

// Initialize voice service with callbacks
function initVoiceService(callbacks = {}) {
    onStatusChange = callbacks.onStatusChange || null;
    onTranscript = callbacks.onTranscript || null;
    onAssistantText = callbacks.onAssistantText || null;
    onAssistantDone = callbacks.onAssistantDone || null;
    onError = callbacks.onError || null;
}

// Get ephemeral token from backend
async function getRealtimeToken(pageContext) {
    const client = window.ReadifySupabase?.getClient();
    
    if (!client) {
        throw new Error('Not connected to service');
    }
    
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Please sign in to use voice chat');
    }
    
    const apiUrl = window.READIFY_CONFIG.getApiUrl(window.READIFY_CONFIG.ENDPOINTS.AI_REALTIME_TOKEN);
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            pageContent: pageContext?.content,
            pageTitle: pageContext?.title,
            pageUrl: pageContext?.url,
            voice: 'verse', // Default voice
        }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get voice session token');
    }
    
    return await response.json();
}

// Start voice session
async function startVoiceSession(pageContext) {
    if (realtimeActive) {
        console.log('[Voice] Already active');
        return;
    }
    
    try {
        onStatusChange?.('connecting');
        
        // Get ephemeral token from backend
        const tokenData = await getRealtimeToken(pageContext);
        console.log('[Voice] Got ephemeral token, expires:', new Date(tokenData.expires_at * 1000));
        
        // Connect to OpenAI Realtime API with ephemeral token
        const wsUrl = `wss://api.openai.com/v1/realtime?model=${tokenData.model}`;
        
        realtimeWs = new WebSocket(wsUrl, [
            'realtime',
            `openai-insecure-api-key.${tokenData.client_secret.value}`,
            'openai-beta.realtime-v1'
        ]);
        
        realtimeWs.onopen = () => {
            console.log('[Voice] WebSocket connected');
            realtimeActive = true;
            startMicrophone();
        };
        
        realtimeWs.onmessage = handleRealtimeMessage;
        
        realtimeWs.onerror = (error) => {
            console.error('[Voice] WebSocket error:', error);
            onError?.({ message: 'Voice connection error' });
            stopVoiceSession();
        };
        
        realtimeWs.onclose = () => {
            console.log('[Voice] WebSocket closed');
            if (realtimeActive) {
                realtimeActive = false;
                onStatusChange?.('disconnected');
            }
        };
        
    } catch (e) {
        console.error('[Voice] Start error:', e);
        onError?.({ message: e.message || 'Failed to start voice session' });
        onStatusChange?.('error');
    }
}

// Stop voice session
function stopVoiceSession() {
    console.log('[Voice] Stopping session');
    
    realtimeActive = false;
    
    // Close WebSocket
    if (realtimeWs) {
        realtimeWs.close();
        realtimeWs = null;
    }
    
    // Stop microphone
    stopMicrophone();
    
    // Stop playback
    stopPlayback();
    
    // Close audio context
    if (realtimeAudioContext && realtimeAudioContext.state !== 'closed') {
        realtimeAudioContext.close();
        realtimeAudioContext = null;
    }
    
    // Reset state
    realtimeResponseActive = false;
    currentResponseId = null;
    realtimeAssistantBuffer = '';
    
    onStatusChange?.('idle');
}

// Start microphone capture
async function startMicrophone() {
    try {
        // Request microphone access
        realtimeMicStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 24000,
                echoCancellation: true,
                noiseSuppression: true,
            }
        });
        
        // Create audio context at 24kHz
        realtimeAudioContext = new AudioContext({ sampleRate: 24000 });
        
        // Load and register the AudioWorklet
        const workletUrl = chrome.runtime.getURL('realtime-worklet.js');
        await realtimeAudioContext.audioWorklet.addModule(workletUrl);
        
        // Create worklet node
        realtimeWorkletNode = new AudioWorkletNode(realtimeAudioContext, 'realtime-audio-processor');
        
        // Handle audio data from worklet
        realtimeWorkletNode.port.onmessage = (event) => {
            if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                // Convert ArrayBuffer to base64
                const base64 = arrayBufferToBase64(event.data);
                
                // Send to OpenAI
                realtimeWs.send(JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: base64
                }));
            }
        };
        
        // Connect microphone to worklet
        const source = realtimeAudioContext.createMediaStreamSource(realtimeMicStream);
        source.connect(realtimeWorkletNode);
        
        onStatusChange?.('listening');
        console.log('[Voice] Microphone started');
        
    } catch (e) {
        console.error('[Voice] Microphone error:', e);
        onError?.({ message: 'Could not access microphone' });
        stopVoiceSession();
    }
}

// Stop microphone
function stopMicrophone() {
    if (realtimeWorkletNode) {
        realtimeWorkletNode.disconnect();
        realtimeWorkletNode = null;
    }
    
    if (realtimeMicStream) {
        realtimeMicStream.getTracks().forEach(track => track.stop());
        realtimeMicStream = null;
    }
}

// Handle incoming WebSocket messages
function handleRealtimeMessage(event) {
    try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
            case 'session.created':
                console.log('[Voice] Session created');
                break;
                
            case 'input_audio_buffer.speech_started':
                console.log('[Voice] User started speaking');
                onStatusChange?.('listening');
                
                // Stop local audio playback immediately
                stopPlayback();
                
                // Only try to cancel if we have an active response
                if (realtimeResponseActive && currentResponseId && realtimeWs?.readyState === WebSocket.OPEN) {
                    console.log('[Voice] Sending response.cancel for:', currentResponseId);
                    realtimeWs.send(JSON.stringify({ type: 'response.cancel' }));
                }
                
                // Clear audio buffer to discard any pending audio from the cancelled response
                if (realtimeWs?.readyState === WebSocket.OPEN) {
                    realtimeWs.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
                }
                break;
                
            case 'input_audio_buffer.speech_stopped':
                console.log('[Voice] User stopped speaking');
                onStatusChange?.('processing');
                // Server VAD will automatically commit and trigger response
                break;
                
            case 'input_audio_buffer.committed':
                console.log('[Voice] Audio buffer committed');
                break;
                
            case 'conversation.item.input_audio_transcription.completed':
                // User's speech transcription
                if (message.transcript) {
                    console.log('[Voice] User transcript:', message.transcript);
                    onTranscript?.(message.transcript, 'user');
                }
                break;
                
            case 'response.created':
                currentResponseId = message.response?.id;
                realtimeResponseActive = true;
                realtimeAssistantBuffer = '';
                onStatusChange?.('speaking');
                console.log('[Voice] Response created:', currentResponseId);
                break;
                
            case 'response.audio.delta':
                // Stream audio chunk
                if (message.delta) {
                    playAudioChunk(message.delta);
                }
                break;
                
            case 'response.audio_transcript.delta':
                // Stream text
                if (message.delta) {
                    realtimeAssistantBuffer += message.delta;
                    onAssistantText?.(message.delta, realtimeAssistantBuffer);
                }
                break;
                
            case 'response.done':
                console.log('[Voice] Response done:', message.response?.id);
                realtimeResponseActive = false;
                currentResponseId = null;
                
                // Notify that assistant response is complete
                if (realtimeAssistantBuffer) {
                    onAssistantDone?.(realtimeAssistantBuffer);
                }
                
                onStatusChange?.('listening');
                break;
                
            case 'response.cancelled':
                console.log('[Voice] Response cancelled');
                realtimeResponseActive = false;
                currentResponseId = null;
                // Don't change status - we're likely listening to new user input
                break;
                
            case 'error':
                console.error('[Voice] API error:', message.error);
                // Only show error to user if it's not the "no active response" cancellation error
                if (message.error?.message !== 'Cancellation failed: no active response found') {
                    onError?.({ message: message.error?.message || 'Voice API error' });
                }
                break;
        }
    } catch (e) {
        console.error('[Voice] Message parse error:', e);
    }
}

// Play audio chunk (streaming)
async function playAudioChunk(base64Audio) {
    if (!realtimeAudioContext || realtimeAudioContext.state === 'closed') {
        return;
    }
    
    try {
        // Resume audio context if suspended
        if (realtimeAudioContext.state === 'suspended') {
            await realtimeAudioContext.resume();
        }
        
        // Decode base64 to Int16 PCM
        const arrayBuffer = base64ToArrayBuffer(base64Audio);
        const int16Array = new Int16Array(arrayBuffer);
        
        // Convert Int16 to Float32 for Web Audio
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }
        
        // Create audio buffer (24kHz, mono)
        const audioBuffer = realtimeAudioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);
        
        // Schedule for gapless playback
        const source = realtimeAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(realtimeAudioContext.destination);
        
        const currentTime = realtimeAudioContext.currentTime;
        const startTime = Math.max(currentTime, realtimeNextPlayTime);
        
        // Track source for interruption
        realtimeActiveSources.push(source);
        
        source.onended = () => {
            const index = realtimeActiveSources.indexOf(source);
            if (index > -1) {
                realtimeActiveSources.splice(index, 1);
            }
        };
        
        source.start(startTime);
        realtimeNextPlayTime = startTime + audioBuffer.duration;
        realtimeIsPlaying = true;
        
    } catch (e) {
        console.error('[Voice] Audio playback error:', e);
    }
}

// Stop all audio playback
function stopPlayback() {
    console.log('[Voice] Stopping playback, sources:', realtimeActiveSources.length);
    
    realtimeActiveSources.forEach(source => {
        try {
            source.stop();
            source.disconnect();
        } catch (e) {
            // Source may have already finished
        }
    });
    realtimeActiveSources = [];
    
    realtimeIsPlaying = false;
    realtimeAudioQueue = [];
    
    if (realtimeAudioContext && realtimeAudioContext.state !== 'closed') {
        realtimeNextPlayTime = realtimeAudioContext.currentTime;
    }
}

// Utility: ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Utility: base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Check if voice is active
function isVoiceActive() {
    return realtimeActive;
}

// Export voice functions
if (typeof window !== 'undefined') {
    window.ReadifyVoice = {
        init: initVoiceService,
        start: startVoiceSession,
        stop: stopVoiceSession,
        isActive: isVoiceActive,
    };
}
