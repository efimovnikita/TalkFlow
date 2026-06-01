class VolumeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isSpeaking = false;
    this.threshold = 0.02; // Reverted to 0.02
    this.silenceDuration = 1.0; // Seconds of silence before speech_end
    this.lastSpeechFrame = 0;

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

      if (rms > this.threshold) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.port.postMessage({ type: 'speech_start' });
        }
        this.lastSpeechFrame = currentFrameCount;
      } else {
        if (this.isSpeaking) {
          const silenceSecs = (currentFrameCount - this.lastSpeechFrame) / sampleRateValue;
          if (silenceSecs > this.silenceDuration) {
            this.isSpeaking = false;
            this.port.postMessage({ type: 'speech_end' });
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('volume-processor', VolumeProcessor);
