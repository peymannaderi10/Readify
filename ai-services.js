// Readify Extension - AI Services
// Handles AI-powered chat, summarization, and text-to-speech using OpenAI APIs

// ============================================
// OpenAI API Helper
// ============================================

/**
 * Makes a request to OpenAI API with retry logic and error handling
 * @param {string} endpoint - API endpoint (e.g., 'chat/completions', 'audio/speech')
 * @param {Object} body - Request body
 * @param {Object} options - Additional options (responseType, retries, etc.)
 * @returns {Promise<any>} - API response
 */
async function openaiRequest(endpoint, body, options = {}) {
    const { responseType = 'json', retries = 3, retryDelay = 1000 } = options;
    
    const config = window.READIFY_CONFIG || READIFY_CONFIG;
    const apiKey = config.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY') {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in config.js');
    }
    
    const url = `https://api.openai.com/v1/${endpoint}`;
    
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                
                // Don't retry on auth errors or invalid requests
                if (response.status === 401 || response.status === 400) {
                    throw new Error(`OpenAI API Error: ${errorMessage}`);
                }
                
                // Retry on rate limits or server errors
                if (response.status === 429 || response.status >= 500) {
                    if (attempt < retries - 1) {
                        const delay = retryDelay * Math.pow(2, attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                
                throw new Error(`OpenAI API Error: ${errorMessage}`);
            }
            
            if (responseType === 'blob') {
                return await response.blob();
            } else if (responseType === 'arraybuffer') {
                return await response.arrayBuffer();
            }
            return await response.json();
            
        } catch (error) {
            if (attempt === retries - 1) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
    }
}

// ============================================
// Chat Completions (Summarization + Chat)
// ============================================

/**
 * Sends a chat message to OpenAI and returns the response
 * @param {string} userMessage - The user's message
 * @param {string} systemPrompt - Optional system prompt for context
 * @param {Array} conversationHistory - Optional previous messages for context
 * @returns {Promise<string>} - The AI response text
 */
async function chatWithAI(userMessage, systemPrompt = null, conversationHistory = []) {
    const config = window.READIFY_CONFIG || READIFY_CONFIG;
    const model = config.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
    const maxTokens = config.AI_CHAT?.MAX_TOKENS || 1024;
    const temperature = config.AI_CHAT?.TEMPERATURE || 0.7;
    
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    } else {
        messages.push({
            role: 'system',
            content: 'You are a helpful AI assistant integrated into a browser extension called Readify. You help users understand and work with text they select on web pages. Be concise, clear, and helpful.'
        });
    }
    
    // Add conversation history
    messages.push(...conversationHistory);
    
    // Add the current user message
    messages.push({ role: 'user', content: userMessage });
    
    try {
        const response = await openaiRequest('chat/completions', {
            model,
            messages,
            max_tokens: maxTokens,
            temperature
        });
        
        return response.choices[0]?.message?.content || 'No response received.';
    } catch (error) {
        console.error('Chat API Error:', error);
        throw error;
    }
}

/**
 * Summarizes text with various options (backward compatible with old summarizeText function)
 * @param {string} text - The text to summarize (can be URL encoded)
 * @param {string} option - Summarization option (summary, shortSummary, longSummary, tone, language)
 * @returns {Promise<string>} - The summarized text
 */
async function summarizeText(text, option) {
    // Decode URL-encoded text if necessary
    let decodedText = text;
    try {
        decodedText = decodeURIComponent(text);
    } catch (e) {
        // Text wasn't URL encoded, use as-is
    }
    
    // Build the appropriate prompt based on option
    const prompts = {
        summary: `Please summarize the following text concisely while preserving all key meaning and context. Include key takeaways as bullet points:\n\n${decodedText}`,
        
        shortSummary: `Please provide a very brief summary (1-3 sentences) of the following text, followed by key takeaways as bullet points:\n\n${decodedText}`,
        
        longSummary: `Please provide a detailed summary (3-5 sentences) of the following text, preserving important details and context. Include comprehensive key takeaways as bullet points:\n\n${decodedText}`,
        
        formalTone: `Please summarize the following text in a formal, professional tone. Include key takeaways as bullet points:\n\n${decodedText}`,
        
        casualTone: `Please summarize the following text in a casual, friendly tone. Include key takeaways as bullet points:\n\n${decodedText}`,
        
        neutralTone: `Please summarize the following text in a neutral, objective tone. Include key takeaways as bullet points:\n\n${decodedText}`,
        
        // Language translations with summaries
        spanish: `Please summarize the following text in Spanish. Include key takeaways as bullet points in Spanish:\n\n${decodedText}`,
        
        french: `Please summarize the following text in French. Include key takeaways as bullet points in French:\n\n${decodedText}`,
        
        mandarin: `Please summarize the following text in Simplified Chinese (Mandarin). Include key takeaways as bullet points in Chinese:\n\n${decodedText}`,
        
        cantonese: `Please summarize the following text in Traditional Chinese. Include key takeaways as bullet points in Traditional Chinese:\n\n${decodedText}`,
        
        korean: `Please summarize the following text in Korean. Include key takeaways as bullet points in Korean:\n\n${decodedText}`,
        
        japanese: `Please summarize the following text in Japanese. Include key takeaways as bullet points in Japanese:\n\n${decodedText}`,
        
        vietnamese: `Please summarize the following text in Vietnamese. Include key takeaways as bullet points in Vietnamese:\n\n${decodedText}`,
        
        punjabi: `Please summarize the following text in Punjabi. Include key takeaways as bullet points in Punjabi:\n\n${decodedText}`,
        
        arabic: `Please summarize the following text in Arabic. Include key takeaways as bullet points in Arabic:\n\n${decodedText}`,
        
        indonesian: `Please summarize the following text in Indonesian. Include key takeaways as bullet points in Indonesian:\n\n${decodedText}`,
        
        turkish: `Please summarize the following text in Turkish. Include key takeaways as bullet points in Turkish:\n\n${decodedText}`,
        
        russian: `Please summarize the following text in Russian. Include key takeaways as bullet points in Russian:\n\n${decodedText}`,
        
        german: `Please summarize the following text in German. Include key takeaways as bullet points in German:\n\n${decodedText}`,
        
        tagalog: `Please summarize the following text in Tagalog. Include key takeaways as bullet points in Tagalog:\n\n${decodedText}`,
        
        italian: `Please summarize the following text in Italian. Include key takeaways as bullet points in Italian:\n\n${decodedText}`
    };
    
    const prompt = prompts[option] || prompts.summary;
    
    const systemPrompt = 'You are a text summarization assistant. Provide clear, concise summaries that preserve the original meaning. Format key takeaways as bullet points using • or - characters.';
    
    try {
        return await chatWithAI(prompt, systemPrompt);
    } catch (error) {
        console.error('Summarization error:', error);
        return "Sorry, we couldn't process your request. Please try again later.";
    }
}

// ============================================
// Text-to-Speech using OpenAI TTS
// ============================================

/**
 * Converts text to speech using OpenAI TTS API
 * @param {string} text - The text to convert to speech
 * @param {Object} options - Optional TTS options (voice, speed)
 * @returns {Promise<Blob>} - Audio blob (MP3 format)
 */
async function textToSpeechOpenAI(text, options = {}) {
    const config = window.READIFY_CONFIG || READIFY_CONFIG;
    const model = config.OPENAI_TTS_MODEL || 'tts-1';
    const voice = options.voice || config.OPENAI_TTS_VOICE || 'nova';
    const speed = options.speed || config.AI_TTS?.SPEED || 1.0;
    
    // OpenAI TTS has a 4096 character limit per request
    const maxChars = 4096;
    if (text.length > maxChars) {
        console.warn(`Text truncated from ${text.length} to ${maxChars} characters for TTS`);
        text = text.substring(0, maxChars);
    }
    
    try {
        const audioBlob = await openaiRequest('audio/speech', {
            model,
            input: text,
            voice,
            speed,
            response_format: 'mp3'
        }, { responseType: 'blob' });
        
        return audioBlob;
            } catch (error) {
        console.error('TTS API Error:', error);
        throw error;
    }
}

/**
 * Creates an audio player element for the generated speech
 * @param {Blob} audioBlob - The audio blob from TTS
 * @returns {HTMLAudioElement} - Audio element ready to play
 */
function createAudioPlayer(audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Clean up object URL when audio is done
    audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
    });
    
    return audio;
}

// ============================================
// Audio playback state management
// ============================================
let currentAudioPlayer = null;
let currentAudioBlob = null;

/**
 * Plays text using OpenAI TTS
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 * @returns {Promise<HTMLAudioElement>} - The audio player
 */
async function speakText(text, options = {}) {
    // Stop any currently playing audio
    if (currentAudioPlayer) {
        currentAudioPlayer.pause();
        currentAudioPlayer = null;
    }
    
    const audioBlob = await textToSpeechOpenAI(text, options);
    currentAudioBlob = audioBlob;
    currentAudioPlayer = createAudioPlayer(audioBlob);
    
    return currentAudioPlayer;
}

/**
 * Stops current audio playback
 */
function stopSpeaking() {
    if (currentAudioPlayer) {
        currentAudioPlayer.pause();
        currentAudioPlayer.currentTime = 0;
    }
}

/**
 * Pauses current audio playback
 */
function pauseSpeaking() {
    if (currentAudioPlayer) {
        currentAudioPlayer.pause();
    }
}

/**
 * Resumes paused audio playback
 */
function resumeSpeaking() {
    if (currentAudioPlayer) {
        currentAudioPlayer.play();
    }
}

/**
 * Gets the current audio player (for external control)
 * @returns {HTMLAudioElement|null}
 */
function getCurrentAudioPlayer() {
    return currentAudioPlayer;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openaiRequest,
        chatWithAI,
        summarizeText,
        textToSpeechOpenAI,
        createAudioPlayer,
        speakText,
        stopSpeaking,
        pauseSpeaking,
        resumeSpeaking,
        getCurrentAudioPlayer
    };
}
