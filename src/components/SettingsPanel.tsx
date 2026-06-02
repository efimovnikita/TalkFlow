import React, { useEffect, useState } from 'react';
import type { Settings } from '../services/settingsService';
import { fetchVoices } from '../services/mistralService';

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = React.useState<Settings>(settings);
  const [availableVoices, setAvailableVoices] = useState<{id: string, name: string}[]>([]);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  useEffect(() => {
    // Request permission once to ensure labels are populated
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const mics = devices.filter(d => d.kind === 'audioinput');
        setAvailableMics(mics);
      });
      // Stop the temporary stream immediately
      stream.getTracks().forEach(t => t.stop());
    }).catch(err => console.error("Mic enumeration error", err));
  }, []);

  useEffect(() => {
    const loadVoices = async () => {
      if (localSettings.mistralApiKey) {
        setIsLoadingVoices(true);
        try {
          const voices = await fetchVoices(localSettings.mistralApiKey);
          setAvailableVoices(voices);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingVoices(false);
        }
      }
    };
    loadVoices();
  }, [localSettings.mistralApiKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mistral API Key</label>
            <input
              type="password"
              name="mistralApiKey"
              value={localSettings.mistralApiKey}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter Mistral API Key"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mistral WebSocket Proxy URL</label>
            <input
              type="text"
              name="mistralProxyUrl"
              value={localSettings.mistralProxyUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
              placeholder="wss://<your-gcf-url>.a.run.app"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Translation API Key</label>
            <input
              type="password"
              name="googleApiKey"
              value={localSettings.googleApiKey}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter Google API Key"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mistral Voice</label>
            <select
              name="mistralVoice"
              value={localSettings.mistralVoice}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={isLoadingVoices}
            >
              <option value="azure">Azure (Default)</option>
              {availableVoices.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {isLoadingVoices && <p className="text-xs text-blue-500 mt-1">Loading voices...</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
            <select
              name="targetLanguage"
              value={localSettings.targetLanguage}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="en">English</option>
              <option value="it">Italian</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Microphone</label>
            <select
              name="microphoneDeviceId"
              value={localSettings.microphoneDeviceId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Default Microphone</option>
              {availableMics.map(m => (
                <option key={m.deviceId} value={m.deviceId}>{m.label || `Microphone ${m.deviceId.slice(0,5)}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
              <span>Speech Sensitivity</span>
              <span className="text-gray-400 font-normal">{(100 - localSettings.vadThreshold * 1000).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              name="vadThreshold"
              min="0.001"
              max="0.05"
              step="0.001"
              value={localSettings.vadThreshold}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, vadThreshold: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>MORE SENSITIVE</span>
              <span>LESS SENSITIVE</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
              <span>Pause Duration</span>
              <span className="text-gray-400 font-normal">{localSettings.vadSilenceDuration.toFixed(1)}s</span>
            </label>
            <input
              type="range"
              name="vadSilenceDuration"
              min="0.5"
              max="5.0"
              step="0.1"
              value={localSettings.vadSilenceDuration}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, vadSilenceDuration: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>FAST</span>
              <span>SLOW</span>
            </div>
          </div>
          
          <div className="pt-4 border-t flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPanel;
