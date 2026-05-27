import { Mistral } from "@mistralai/mistralai";

const getClient = (apiKey: string) => new Mistral({ apiKey });

export const fetchVoices = async (apiKey: string) => {
  if (!apiKey) return [];
  const client = getClient(apiKey);
  try {
    const result = await client.audio.voices.list({ limit: 50, offset: 0 });
    const allVoices = result.items ?? [];
    // Only return voices with a userId (custom or public voices)
    return allVoices.map(v => ({ id: v.id, name: v.name || v.id }));
  } catch (e) {
    console.error('Failed to fetch Mistral voices', e);
    return [];
  }
};

export const transcribeSpeech = async (audioBlob: Blob, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error('Mistral API Key is missing');

  const client = getClient(apiKey);
  try {
    const response = await client.audio.transcriptions.create({
      model: 'mistral-stt-latest',
      file: {
        fileName: 'recording.webm',
        content: audioBlob,
      },
    });

    return response.text;
  } catch (e: any) {
    console.error('Mistral STT Error:', e);
    throw e;
  }
};

export const synthesizeSpeech = async (text: string, voiceId: string, apiKey: string): Promise<Blob> => {
  if (!apiKey) throw new Error('Mistral API Key is missing');
  if (!text) throw new Error('Text is empty');

  const client = getClient(apiKey);
  try {
    const response = await client.audio.speech.create({
      model: 'mistral-tts-latest',
      input: text,
      voiceId: voiceId || 'azure', // Fallback
      responseFormat: 'mp3',
    });

    // The SDK might return a stream or a blob depending on options
    // If it's a Response object or has a .blob() method
    if (response instanceof Response) {
      return await response.blob();
    }
    
    // If it's already a blob or similar
    return response as unknown as Blob;
  } catch (e: any) {
    console.error('Mistral TTS Error:', e);
    throw e;
  }
};
