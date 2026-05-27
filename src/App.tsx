import { useState, useEffect } from 'react'
import SettingsPanel from './components/SettingsPanel'
import { loadSettings, saveSettings } from './services/settingsService'
import type { Settings } from './services/settingsService'
import { audioService } from './services/audioService'
import { useMicVAD, utils } from "@ricky0123/vad-react"
import './App.css'

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAutoMode, setIsAutoMode] = useState(false)
  const [russianText, setRussianText] = useState('')
  const [translatedText, setTranslatedText] = useState('')

  const vad = useMicVAD({
    startOnRealTime: false,
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio)
      const blob = new Blob([wavBuffer], { type: "audio/wav" })
      console.log("VAD detected speech end, blob created", blob)
      // TODO: Send to STT in Phase 4
    },
  })

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const toggleAutoMode = () => {
    if (isAutoMode) {
      vad.pause()
      setIsAutoMode(false)
    } else {
      vad.start()
      setIsAutoMode(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">TalkFlow</h1>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      {/* Main Content (Split Screen) */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top: Russian Source */}
        <div className="flex-1 bg-white p-6 flex flex-col border-b overflow-y-auto">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Russian</span>
          <div className="flex-1 flex items-center justify-center">
            {russianText ? (
              <p className="text-2xl text-gray-800">{russianText}</p>
            ) : (
              <div className="text-center">
                <p className="text-2xl text-gray-300 italic mb-2">
                  {isAutoMode ? (vad.userSpeaking ? 'Listening...' : 'Waiting for speech...') : 'Tap microphone to start...'}
                </p>
                {vad.loading && <p className="text-sm text-blue-500">Loading VAD model...</p>}
                {vad.errored && <p className="text-sm text-red-500">VAD Error: {vad.errored.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Target Translation */}
        <div className="flex-1 bg-gray-50 p-6 flex flex-col overflow-y-auto">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {settings.targetLanguage === 'en' ? 'English' : 'Italian'}
          </span>
          <div className="flex-1 flex items-center justify-center">
            {translatedText ? (
              <p className="text-2xl text-blue-600 font-medium">{translatedText}</p>
            ) : (
              <p className="text-2xl text-gray-300 italic">Translation will appear here</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Microphone Button */}
      <footer className="p-8 bg-white border-t flex justify-center">
        <button 
          onClick={toggleAutoMode}
          disabled={vad.loading}
          className={`${
            isAutoMode ? (vad.userSpeaking ? 'bg-red-500 animate-pulse' : 'bg-green-500') : 'bg-blue-600'
          } ${vad.loading ? 'opacity-50 cursor-not-allowed' : ''} text-white p-6 rounded-full shadow-lg hover:opacity-90 transition-all transform active:scale-95`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isAutoMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            )}
          </svg>
        </button>
      </footer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsPanel 
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
