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
let currentResponseId = null;

// Callbacks
let onStatusChange = null;
let onTranscript = null;
let onAssistantText = null;
let onAssistantDone = null;
let onError = null;
let onUsageUpdate = null;

// Usage tracking for realtime session
let sessionTokensUsed = 0;
let sessionLimit = 3000; // Default, will be updated from API

// Initialize voice service with callbacks
function initVoiceService(callbacks = {}) {
    onStatusChange = callbacks.onStatusChange || null;
    onTranscript = callbacks.onTranscript || null;
    onAssistantText = callbacks.onAssistantText || null;
    onAssistantDone = callbacks.onAssistantDone || null;
    onError = callbacks.onError || null;
    onUsageUpdate = callbacks.onUsageUpdate || null;
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
            voice: 'verse',
        }),
    });

    if (!response.ok) {
        const error = await response.json();

        // Handle token limit error specifically (voice/realtime feature)
        if (error.code === 'TOKEN_LIMIT_REACHED') {
            const upgradeMsg = error.upgrade ? ' Upgrade to Premium for more!' : '';
            throw new Error(`Voice chat limit reached.${upgradeMsg}`);
        }

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

        // Reset session usage tracking
        sessionTokensUsed = 0;

        // Get ephemeral token from backend (includes session config with VAD)
        const tokenData = await getRealtimeToken(pageContext);
        console.log('[Voice] Got ephemeral token, expires:', new Date(tokenData.expires_at * 1000));

        // Capture limit from token response (usage.limit tells us remaining quota)
        if (tokenData.usage?.limit) {
            sessionLimit = tokenData.usage.limit;
            // Account for session creation cost already recorded
            const alreadyUsed = tokenData.usage.totalUsed || 0;
            console.log('[Voice] Session limit:', sessionLimit, 'Already used:', alreadyUsed);
        }

        // Get initial usage from cache to set proper baseline
        const cachedUsage = window.ReadifyUsage?.getCached();
        if (cachedUsage?.realtime) {
            sessionTokensUsed = cachedUsage.realtime.used || 0;
            sessionLimit = cachedUsage.realtime.limit || 3000;
            console.log('[Voice] Initial usage from cache:', sessionTokensUsed, '/', sessionLimit);
        }

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
                // Report final session usage to backend
                reportSessionUsage();
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

    // Report session usage to backend
    reportSessionUsage();

    onStatusChange?.('idle');
}

// Report session usage to backend for tracking
async function reportSessionUsage() {
    // Only report if there was actual usage during this session
    if (sessionTokensUsed <= 0) {
        console.log('[Voice] No usage to report');
        return;
    }

    try {
        const client = window.ReadifySupabase?.getClient();
        if (!client) return;

        const { data: { session } } = await client.auth.getSession();
        if (!session?.access_token) return;

        // Report to our backend's usage recording endpoint
        const apiUrl = window.READIFY_CONFIG.getApiUrl('/api/usage/record-realtime');

        await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tokensUsed: sessionTokensUsed,
                endpoint: 'realtime',
            }),
        });

        console.log('[Voice] Reported session usage:', sessionTokensUsed);
    } catch (e) {
        console.error('[Voice] Failed to report usage:', e);
    }
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

        // Initialize playback timing
        realtimeNextPlayTime = realtimeAudioContext.currentTime;

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
        // Connect worklet to destination to keep it alive
        realtimeWorkletNode.connect(realtimeAudioContext.destination);

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

            case 'session.updated':
                console.log('[Voice] Session configured');
                break;

            case 'input_audio_buffer.speech_started':
                console.log('[Voice] User started speaking');
                onStatusChange?.('listening');

                // Cancel any ongoing AI response when user interrupts
                if (realtimeResponseActive && currentResponseId && realtimeWs?.readyState === WebSocket.OPEN) {
                    console.log('[Voice] Interrupting AI response');
                    realtimeWs.send(JSON.stringify({ type: 'response.cancel' }));
                }

                // Stop local audio playback immediately
                stopPlayback();
                break;

            case 'input_audio_buffer.speech_stopped':
                console.log('[Voice] User stopped speaking');
                onStatusChange?.('processing');
                // Server VAD will automatically commit and trigger response after silence_duration_ms
                break;

            case 'input_audio_buffer.committed':
                console.log('[Voice] Audio buffer committed');
                break;

            case 'conversation.item.input_audio_transcription.completed':
                // User's speech transcription - this arrives AFTER speech stops
                if (message.transcript && message.transcript.trim()) {
                    console.log('[Voice] User transcript:', message.transcript);
                    onTranscript?.(message.transcript.trim(), 'user');
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
                // Accumulate text as AI speaks
                if (message.delta) {
                    realtimeAssistantBuffer += message.delta;
                    // Update UI with streaming text
                    onAssistantText?.(message.delta, realtimeAssistantBuffer);
                }
                break;

            case 'response.audio_transcript.done':
                // AI finished speaking - final transcript
                const finalTranscript = realtimeAssistantBuffer || message.transcript;
                if (finalTranscript && finalTranscript.trim()) {
                    console.log('[Voice] AI said:', finalTranscript.trim());
                    // Send the complete text
                    onAssistantDone?.(finalTranscript.trim());
                }
                realtimeAssistantBuffer = '';
                break;

            case 'response.audio.done':
                console.log('[Voice] AI audio complete');
                // Reset playback timing for next response
                if (realtimeAudioContext && realtimeAudioContext.state !== 'closed') {
                    realtimeNextPlayTime = realtimeAudioContext.currentTime;
                }
                break;

            case 'response.done':
                console.log('[Voice] Response complete', message);
                realtimeResponseActive = false;
                currentResponseId = null;

                // Extract usage from response.done event
                if (message.response?.usage) {
                    const usage = message.response.usage;
                    const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
                    sessionTokensUsed += totalTokens;

                    console.log('[Voice] Usage:', {
                        input: usage.input_tokens,
                        output: usage.output_tokens,
                        total: totalTokens,
                        sessionTotal: sessionTokensUsed,
                        limit: sessionLimit
                    });

                    // Notify UI of usage update
                    onUsageUpdate?.({
                        tokensUsed: totalTokens,
                        sessionTotal: sessionTokensUsed,
                        limit: sessionLimit,
                        percentUsed: Math.round((sessionTokensUsed / sessionLimit) * 100)
                    });

                    // Check if limit exceeded
                    if (sessionTokensUsed >= sessionLimit) {
                        console.log('[Voice] Token limit reached, stopping session');
                        onError?.({
                            message: 'Voice chat limit reached for this month.',
                            code: 'TOKEN_LIMIT_REACHED'
                        });
                        stopVoiceSession();
                        return;
                    }
                }

                onStatusChange?.('listening');
                break;

            case 'response.cancelled':
                console.log('[Voice] Response cancelled');
                realtimeResponseActive = false;
                currentResponseId = null;
                realtimeAssistantBuffer = '';
                // Status will be set to listening when user stops speaking
                break;

            case 'error':
                console.error('[Voice] API error:', message.error);
                // Ignore "no active response" error - it's harmless
                if (message.error?.code === 'response_cancel_not_active' ||
                    message.error?.message?.includes('no active response')) {
                    realtimeResponseActive = false;
                } else {
                    onError?.({ message: message.error?.message || 'Voice API error' });
                }
                break;

            default:
                // Log other non-delta message types for debugging
                if (message.type && !message.type.includes('delta')) {
                    console.log('[Voice] Message:', message.type);
                }
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
