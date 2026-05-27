export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async requestPermission(deviceId?: string): Promise<boolean> {
    try {
      if (this.stream && this.stream.active) {
        // If device changed, we need to stop current stream and get a new one
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
    
    // Try to explicitly set webm, fallback to default if not supported (e.g., Safari might prefer mp4/aac)
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
        // Use the type from the first chunk or fallback to webm
        const type = this.audioChunks.length > 0 ? this.audioChunks[0].type : 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type });
        console.log('MediaRecorder stopped. Final blob size:', audioBlob.size, 'Type:', audioBlob.type);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}

export const audioService = new AudioService();
