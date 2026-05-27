export const transcribeSpeech = async (audioBlob: Blob, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error('Mistral API Key is missing');

  const formData = new FormData();
  // Mistral expects a file named 'file' and a 'model'
  // Note: audio/webm needs to be converted if Mistral doesn't support it directly, 
  // but usually modern APIs handle standard web formats.
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'mistral-stt-latest');

  try {
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
    return data.text;
  } catch (e: any) {
    console.error('Mistral STT Error:', e);
    throw e;
  }
};
