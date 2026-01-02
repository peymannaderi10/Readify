// AudioWorklet processor for OpenAI Realtime API
// Captures PCM16 audio at 24kHz and sends to main thread

class RealtimeAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4800; // 200ms at 24kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const inputChannel = input[0];
        
        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];
            
            // When buffer is full, send to main thread
            if (this.bufferIndex >= this.bufferSize) {
                // Convert Float32 to Int16 PCM
                const pcm16 = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                    const s = Math.max(-1, Math.min(1, this.buffer[j]));
                    pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                
                // Send to main thread
                this.port.postMessage(pcm16.buffer);
                
                // Reset buffer
                this.bufferIndex = 0;
            }
        }
        
        return true;
    }
}

registerProcessor('realtime-audio-processor', RealtimeAudioProcessor);

