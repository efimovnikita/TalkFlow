export const translateText = async (text: string, targetLang: string, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error('Google API Key is missing');
  if (!text) return '';

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        source: 'ru', // Source is always Russian for now
        format: 'text'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Translation request failed');
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (e: any) {
    console.error('Google Translation Error:', e);
    throw e;
  }
};
