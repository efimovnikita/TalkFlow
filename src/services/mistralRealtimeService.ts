export class MistralRealtimeService {
  private socket: WebSocket | null = null;
  private apiKey: string;
  private onResult: (text: string, isFinal: boolean) => void;
  private onError: (error: string) => void;
  private model: string;
  private proxyUrl?: string;
  private audioQueue: Float32Array[] = [];

  constructor(
    apiKey: string,
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    model: string = 'voxtral-mini-transcribe-realtime-2602',
    proxyUrl?: string
  ) {
    this.apiKey = apiKey;
    this.onResult = onResult;
    this.onError = onError;
    this.model = model;
    this.proxyUrl = proxyUrl;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        reject(new Error('Mistral API Key is missing'));
        return;
      }

      let url = '';
      
      if (this.proxyUrl) {
        // If a custom proxy URL (like a Google Cloud Function) is specified, we connect to it.
        // We make sure it uses the WebSocket protocol (wss:// or ws://).
        let baseProxyUrl = this.proxyUrl.trim();
        if (baseProxyUrl.startsWith('https://')) {
          baseProxyUrl = baseProxyUrl.replace('https://', 'wss://');
        } else if (baseProxyUrl.startsWith('http://')) {
          baseProxyUrl = baseProxyUrl.replace('http://', 'ws://');
        }
        
        if (baseProxyUrl.endsWith('/')) {
          baseProxyUrl = baseProxyUrl.slice(0, -1);
        }
        
        url = `${baseProxyUrl}/?model=${encodeURIComponent(this.model)}&api_key=${encodeURIComponent(this.apiKey)}`;
      } else {
        // Determine WebSocket URL automatically. For local development, we route through the local Vite dev server proxy 
        // to bypass CORS and inject the Authorization header.
        const isLocalDev = import.meta.env.DEV ||
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.hostname.startsWith('192.168.') || 
                           window.location.hostname.startsWith('10.') || 
                           window.location.hostname.startsWith('172.');

        if (isLocalDev) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          url = `${protocol}//${window.location.host}/mistral-realtime/v1/audio/transcriptions/realtime?model=${encodeURIComponent(
            this.model
          )}&api_key=${encodeURIComponent(this.apiKey)}`;
        } else {
          url = `wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=${encodeURIComponent(
            this.model
          )}&api_key=${encodeURIComponent(this.apiKey)}`;
        }
      }

      console.log('Connecting to Mistral Realtime WebSocket via:', url.split('&api_key=')[0] + '&api_key=REDACTED');
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('Mistral Realtime WebSocket connection opened');
        
        // Send initial session configuration
        this.socket?.send(JSON.stringify({
          type: 'session.update',
          session: {
            audio_format: {
              encoding: 'pcm_s16le',
              sample_rate: 16000
            }
          }
        }));

        // Send all queued audio chunks combined into a single message after a small delay (100ms)
        // to let Mistral server initialize the session.
        if (this.audioQueue.length > 0) {
          setTimeout(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN && this.audioQueue.length > 0) {
              console.log(`Sending combined ${this.audioQueue.length} queued audio chunks...`);
              
              let totalLength = 0;
              this.audioQueue.forEach(chunk => totalLength += chunk.length);
              
              const combined = new Float32Array(totalLength);
              let offset = 0;
              this.audioQueue.forEach(chunk => {
                combined.set(chunk, offset);
                offset += chunk.length;
              });
              
              this.sendAudioChunkDirectly(combined);
              this.audioQueue = []; // Clear queue to enable direct streaming in sendAudioChunk()
            }
          }, 100);
        }
        
        resolve(true);
      };

      this.socket.onmessage = async (event) => {
        try {
          let textData = '';
          if (event.data instanceof Blob) {
            textData = await event.data.text();
          } else {
            textData = event.data;
          }

          const data = JSON.parse(textData);
          console.log('Realtime message from server:', data);
          
          if (data.type === 'transcription.text.delta') {
            this.onResult(data.text, false);
          } else if (data.type === 'transcription.done') {
            this.onResult('', true);
          } else if (data.type === 'error') {
            const errorMsg = data.error?.message || data.message || 'Unknown error';
            this.onError(errorMsg);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Realtime WebSocket error:', error);
        this.onError('Connection error');
        reject(error);
      };

      this.socket.onclose = (event) => {
        console.log('Mistral Realtime WebSocket closed:', event.code, event.reason);
      };
    });
  }

  sendAudioChunk(samples: Float32Array) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.audioQueue.length === 0) {
      this.sendAudioChunkDirectly(samples);
    } else {
      // Buffer frames if socket isn't open OR if there's still a queue waiting to be flushed
      this.audioQueue.push(samples);
    }
  }

  private sendAudioChunkDirectly(samples: Float32Array) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    // 1. Convert Float32 samples to Int16 PCM samples
    const pcm16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // 2. Convert Int16 buffer to base64
    const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // 3. Send base64-encoded audio chunk via WebSocket
    this.socket.send(JSON.stringify({
      type: 'input_audio.append',
      audio: base64
    }));
  }

  disconnect() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({
            type: 'input_audio.end'
          }));
        } catch (e) {
          console.error('Error sending input_audio.end:', e);
        }
      }
      this.socket.close();
      this.socket = null;
    }
  }
}
