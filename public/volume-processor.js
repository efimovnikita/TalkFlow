class VolumeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isSpeaking = false;
    this.threshold = 0.02; // Threshold for speech detection
    this.silenceDuration = 1.0; // Seconds of silence before speech_end
    this.lastSpeechFrame = 0;
    
    // Rolling buffer of the last ~200ms of audio (25 chunks of 128 samples at 16kHz)
    // to prevent clipping the very first word in a phrase.
    this.historyBuffer = [];
    this.historyLimit = 25; 

    this.port.onmessage = (event) => {
      if (event.data.type === 'update_threshold') {
        this.threshold = event.data.threshold;
      } else if (event.data.type === 'update_silence_duration') {
        this.silenceDuration = event.data.silenceDuration;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
      }
      const rms = Math.sqrt(sum / samples.length);

      const currentFrameCount = currentFrame;
      const sampleRateValue = sampleRate;

      // When not speaking, keep collecting pre-speech audio history
      if (!this.isSpeaking) {
        this.historyBuffer.push(new Float32Array(samples));
        if (this.historyBuffer.length > this.historyLimit) {
          this.historyBuffer.shift();
        }
      }

      if (rms > this.threshold) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.port.postMessage({ type: 'speech_start' });
          
          // Send all accumulated history frames immediately to preserve the onset of the first word
          if (this.historyBuffer.length > 0) {
            const totalSamples = this.historyBuffer.length * 128;
            const combinedSamples = new Float32Array(totalSamples);
            let offset = 0;
            for (let i = 0; i < this.historyBuffer.length; i++) {
              combinedSamples.set(this.historyBuffer[i], offset);
              offset += 128;
            }
            this.port.postMessage({ type: 'audio_chunk', samples: combinedSamples });
            this.historyBuffer = []; // Clear history
          }
        }
        this.lastSpeechFrame = currentFrameCount;
      } else {
        if (this.isSpeaking) {
          const silenceSecs = (currentFrameCount - this.lastSpeechFrame) / sampleRateValue;
          if (silenceSecs > this.silenceDuration) {
            this.isSpeaking = false;
            this.port.postMessage({ type: 'speech_end' });
            this.historyBuffer = []; // Reset history for the next cycle
          }
        }
      }

      if (this.isSpeaking) {
        this.port.postMessage({ type: 'audio_chunk', samples: new Float32Array(samples) });
      }
    }
    return true;
  }
}

registerProcessor('volume-processor', VolumeProcessor);
