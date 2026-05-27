export const fetchVoices = async (apiKey: string) => {
  if (!apiKey) return [];
  try {
    const response = await fetch('https://api.mistral.ai/v1/audio/voices', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map((v: any) => ({ id: v.id, name: v.name || v.id }));
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
  console.log('Synthesizing with fetch. Text:', text, 'Voice:', voiceId);
  if (!apiKey) throw new Error('Mistral API Key is missing');

  try {
    const response = await fetch('https://api.mistral.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voxtral-mini-tts-2603',
        input: text,
        voice: voiceId || 'azure',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'TTS Request failed');
    }

    return await response.blob();
  } catch (e: any) {
    console.error('Mistral TTS Error:', e);
    throw e;
  }
};
