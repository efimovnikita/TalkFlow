import { Mistral } from "@mistralai/mistralai";

const getClient = (apiKey: string) => new Mistral({ apiKey });

export const fetchVoices = async (apiKey: string) => {
  if (!apiKey) return [];
  try {
    const client = getClient(apiKey);
    const result = await client.audio.voices.list({ limit: 50, offset: 0 });
    const allVoices = result.items ?? [];
    return allVoices.map(v => ({ id: v.id, name: v.name || v.id }));
  } catch (e) {
    console.error('Failed to fetch Mistral voices', e);
    return [];
  }
};

export const transcribeSpeech = async (audioBlob: Blob, apiKey: string): Promise<string> => {
  console.log('Transcribing with fetch. Blob size:', audioBlob.size, 'type:', audioBlob.type);
  if (!apiKey) throw new Error('Mistral API Key is missing');

  // Determine extension from type, default to webm
  const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const file = new File([audioBlob], `recording.${extension}`, { type: audioBlob.type });
  
  const formData = new FormData();
  formData.append('model', 'voxtral-mini-latest');
  formData.append('language', 'ru');
  formData.append('response_format', 'json');
  formData.append('file', file);

  try {
    console.log('Sending offline STT request to Mistral...');
    const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'STT Request failed');
    }

    const data = await response.json();
    console.log('Transcription response:', data);
    return data.text;
  } catch (e: any) {
    console.error('Mistral STT Error:', e);
    throw e;
  }
};

export const synthesizeSpeech = async (text: string, voiceId: string, apiKey: string): Promise<Blob> => {
  console.log('Synthesizing with SDK streaming. Text:', text, 'Voice:', voiceId);
  if (!apiKey) throw new Error('Mistral API Key is missing');
  if (!text) throw new Error('Text is empty');

  const client = getClient(apiKey);
  
  try {
    const stream = await client.audio.speech.complete({
      model: "voxtral-mini-tts-2603",
      input: text,
      voiceId: voiceId || 'azure',
      responseFormat: "mp3", 
      stream: true,
    });

    const audioChunks: Uint8Array[] = [];

    // @ts-ignore - The SDK types might be incomplete for the async iterator
    for await (const event of stream) {
      if (event.event === "speech.audio.delta") {
        const base64Data = (event.data as any).audioData;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioChunks.push(bytes);
      } else if (event.event === "speech.audio.done") {
        console.log("Stream done. Usage:", (event.data as any).usage);
      }
    }

    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return new Blob([result], { type: 'audio/mpeg' });
  } catch (error: any) {
    console.error('Mistral TTS Streaming Error:', error);
    throw error;
  }
};
