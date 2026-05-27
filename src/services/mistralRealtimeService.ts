export class MistralRealtimeService {
  private socket: WebSocket | null = null;
  private apiKey: string;
  private onResult: (text: string, isFinal: boolean) => void;
  private onError: (error: string) => void;

  constructor(apiKey: string, onResult: (text: string, isFinal: boolean) => void, onError: (error: string) => void) {
    this.apiKey = apiKey;
    this.onResult = onResult;
    this.onError = onError;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket('wss://api.mistral.ai/v1/audio/transcriptions/realtime');

      this.socket.onopen = () => {
        console.log('Mistral Realtime connected');
        // Send initial config
        this.socket?.send(JSON.stringify({
          type: 'initial_request',
          model: 'voxtral-realtime',
          config: {
            language: 'ru',
            response_format: 'text'
          },
          api_key: this.apiKey // Note: Check if API key is sent here or in URL/Headers
        }));
        resolve(true);
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Realtime message:', data);
        if (data.type === 'transcription_partial' || data.type === 'transcription_final') {
          this.onResult(data.text, data.type === 'transcription_final');
        } else if (data.type === 'error') {
          this.onError(data.message);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Realtime socket error:', error);
        this.onError('Connection error');
        reject(error);
      };

      this.socket.onclose = () => {
        console.log('Mistral Realtime disconnected');
      };
    });
  }

  sendAudio(blob: Blob) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        this.socket?.send(JSON.stringify({
          type: 'audio_data',
          audio_data: base64
        }));
      };
      reader.readAsDataURL(blob);
    }
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }
}
