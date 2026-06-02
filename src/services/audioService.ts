export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private vadNode: AudioWorkletNode | null = null;
  private isVADActive: boolean = false;
  private isVADPaused: boolean = false;

  async requestPermission(deviceId?: string): Promise<boolean> {
    try {
      if (this.stream && this.stream.active) {
        const currentDeviceId = this.stream.getAudioTracks()[0].getSettings().deviceId;
        if (!deviceId || currentDeviceId === deviceId) {
          return true;
        }
        this.cleanup();
      }

      const constraints: MediaStreamConstraints = { 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {})
        } 
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      return true;
    } catch (e) {
      console.error('Microphone permission denied', e);
      return false;
    }
  }

  async startRecording() {
    if (!this.stream) {
      console.error("No stream available for recording");
      return;
    }
    
    this.audioChunks = [];
    
    let options = {};
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      options = { mimeType: 'audio/webm' };
    }

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.start();
    console.log('MediaRecorder started');
  }

  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const type = this.audioChunks.length > 0 ? this.audioChunks[0].type : 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type });
        console.log('MediaRecorder stopped. Final blob size:', audioBlob.size, 'Type:', audioBlob.type);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  async initVAD(
    onSpeechStart: () => void,
    onSpeechEnd: (blob: Blob) => void,
    threshold: number = 0.02,
    silenceDuration: number = 2.0,
    onAudioChunk?: (samples: Float32Array) => void
  ) {
    if (!this.stream) {
      const permitted = await this.requestPermission();
      if (!permitted) return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Use a relative path to account for the project's base URL (/TalkFlow/)
    await this.audioContext.audioWorklet.addModule('volume-processor.js');

    this.isVADActive = true;
    const source = this.audioContext.createMediaStreamSource(this.stream!);
    this.vadNode = new AudioWorkletNode(this.audioContext, 'volume-processor');
    this.vadNode.port.postMessage({ type: 'update_threshold', threshold });
    this.vadNode.port.postMessage({ type: 'update_silence_duration', silenceDuration });

    this.vadNode.port.onmessage = (event) => {
      if (!this.isVADActive || this.isVADPaused) return;

      if (event.data.type === 'speech_start') {
        onSpeechStart();
        this.startRecording();
      } else if (event.data.type === 'speech_end') {
        this.stopRecording().then(blob => {
          if (!this.isVADActive) return;
          if (blob && blob.size > 0) {
            onSpeechEnd(blob);
          }
        });
      } else if (event.data.type === 'audio_chunk') {
        if (onAudioChunk) {
          onAudioChunk(event.data.samples);
        }
      }
    };

    source.connect(this.vadNode);
    console.log('VAD initialized with threshold:', threshold);
  }

  updateVADThreshold(threshold: number) {
    if (this.vadNode) {
      this.vadNode.port.postMessage({ type: 'update_threshold', threshold });
    }
  }

  updateVADSilenceDuration(silenceDuration: number) {
    if (this.vadNode) {
      this.vadNode.port.postMessage({ type: 'update_silence_duration', silenceDuration });
    }
  }

  setVADPaused(paused: boolean) {
    this.isVADPaused = paused;
    console.log(`VAD ${paused ? 'paused' : 'resumed'}`);
  }

  async playChime(type: 'start' | 'stop') {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(type === 'start' ? 880 : 440, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  stopVAD() {
    this.isVADActive = false;
    if (this.vadNode) {
      this.vadNode.disconnect();
      this.vadNode = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  cleanup() {
    this.stopVAD();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioService = new AudioService();
