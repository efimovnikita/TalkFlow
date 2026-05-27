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
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

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
          
          <div className="pt-4 border-t flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Save Changes
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
