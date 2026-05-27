import { useState, useRef } from 'react'
import SettingsPanel from './components/SettingsPanel'
import { loadSettings, saveSettings } from './services/settingsService'
import type { Settings } from './services/settingsService'
import { audioService } from './services/audioService'
import { transcribeSpeech, synthesizeSpeech } from './services/mistralService'
import { translateText } from './services/translationService'
import './App.css'

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [russianText, setRussianText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const toggleRecording = async () => {
    if (isRecording) {
      setIsProcessing(true)
      const audioBlob = await audioService.stopRecording()
      setIsRecording(false)
      
      if (audioBlob) {
        try {
          setRussianText('Transcribing...')
          const text = await transcribeSpeech(audioBlob, settings.mistralApiKey)
          setRussianText(text)
          
          if (text) {
            setTranslatedText('Translating...')
            const translation = await translateText(text, settings.targetLanguage, settings.googleApiKey)
            setTranslatedText(translation)
            
            if (translation) {
              setTranslatedText(translation + ' 🔊')
              const audioBlob = await synthesizeSpeech(translation, settings.mistralVoice, settings.mistralApiKey)
              const audioUrl = URL.createObjectURL(audioBlob)
              const audio = new Audio(audioUrl)
              await audio.play()
            }
          }
        } catch (e: any) {
          alert('Error: ' + e.message)
          setRussianText('Process failed.')
        } finally {
          setIsProcessing(false)
        }
      } else {
        setIsProcessing(false)
      }
    } else {
      const hasPermission = await audioService.requestPermission()
      if (hasPermission) {
        audioService.startRecording()
        setIsRecording(true)
        setRussianText('')
        setTranslatedText('')
      } else {
        alert('Microphone permission is required.')
      }
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
              <p className="text-2xl text-gray-800 text-center">{russianText}</p>
            ) : (
              <p className="text-2xl text-gray-300 italic text-center">
                {isRecording ? 'Listening...' : 'Tap microphone to start speaking...'}
              </p>
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
              <p className="text-2xl text-blue-600 font-medium text-center">{translatedText}</p>
            ) : (
              <p className="text-2xl text-gray-300 italic text-center">
                {isProcessing ? 'Translating...' : 'Translation will appear here'}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Microphone Button */}
      <footer className="p-8 bg-white border-t flex justify-center">
        <button 
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} text-white p-8 rounded-full shadow-lg hover:opacity-90 transition-all transform active:scale-95`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isRecording ? (
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
