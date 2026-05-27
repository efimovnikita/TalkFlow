export interface Settings {
  mistralApiKey: string;
  googleApiKey: string;
  mistralVoice: string;
  targetLanguage: string;
  microphoneDeviceId: string;
}

const STORAGE_KEY = 'talkflow_settings';

const DEFAULT_SETTINGS: Settings = {
  mistralApiKey: '',
  googleApiKey: '',
  mistralVoice: 'voice1',
  targetLanguage: 'en',
  microphoneDeviceId: '',
};

export const loadSettings = (): Settings => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    console.error('Failed to parse settings', e);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Settings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
