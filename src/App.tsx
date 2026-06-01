import { useState, useCallback, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import SettingsPanel from './components/SettingsPanel'
import UpdateModal from './components/UpdateModal'
import { loadSettings, saveSettings } from './services/settingsService'
import type { Settings } from './services/settingsService'
import { audioService } from './services/audioService'
import { transcribeSpeech, synthesizeSpeech } from './services/mistralService'
import { translateText } from './services/translationService'
import './App.css'

type VADStatus = 'idle' | 'listening' | 'transcribing' | 'translating' | 'speaking';

function App() {
  const {
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const [settings, setSettings] = useState<Settings>(loadSettings())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [russianText, setRussianText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null)
  
  const [isVADMode, setIsVADMode] = useState(false)
  const [vadStatus, setVadStatus] = useState<VADStatus>('idle')
  
  // Use a ref to track the latest VAD mode state for callbacks
  const isVADModeRef = useRef(isVADMode)

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
    // Update threshold and silence duration if VAD is active
    audioService.updateVADThreshold(newSettings.vadThreshold)
    audioService.updateVADSilenceDuration(newSettings.vadSilenceDuration)
  }

  const handleReplayAudio = async () => {
    if (lastAudioUrl) {
      const audio = new Audio(lastAudioUrl)
      await audio.play()
    }
  }

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!isVADModeRef.current && !isRecording) return; // Check if we should still be processing

    try {
      audioService.setVADPaused(true)
      setIsProcessing(true)
      setRussianText('Transcribing...')
      const text = await transcribeSpeech(audioBlob, settings.mistralApiKey)
      console.log('Transcription result:', text);
      
      if (!text) {
         setRussianText('No speech detected.');
         audioService.setVADPaused(false)
         return; 
      }
      
      if (!isVADModeRef.current && !isRecording) return;

      setRussianText(text)
      setVadStatus('translating')
      setTranslatedText('Translating...')
      
      const translation = await translateText(text, settings.targetLanguage, settings.googleApiKey)
      console.log('Translation result:', translation);
      
      if (!isVADModeRef.current && !isRecording) return;
      setTranslatedText(translation)
      
      if (translation) {
        setVadStatus('speaking')
        setTranslatedText(translation + ' 🔊')
        console.log('Synthesizing speech...');
        const ttsBlob = await synthesizeSpeech(translation, settings.mistralVoice, settings.mistralApiKey)
        
        if (!isVADModeRef.current && !isRecording) return;

        if (lastAudioUrl) {
          URL.revokeObjectURL(lastAudioUrl)
        }
        
        const audioUrl = URL.createObjectURL(ttsBlob)
        setLastAudioUrl(audioUrl)
        
        const audio = new Audio(audioUrl)
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            resolve();
          }
          audio.play().catch(e => {
            console.error('Playback error:', e);
            resolve();
          });
        });
      }
    } catch (e: any) {
      console.error('Error in processing:', e);
      alert('Error: ' + e.message)
      setRussianText('Process failed.')
    } finally {
      setIsProcessing(false)
      audioService.setVADPaused(false)
    }
  }, [settings, isRecording, lastAudioUrl]);

  const toggleRecording = async () => {
    if (isRecording) {
      setIsProcessing(true)
      const audioBlob = await audioService.stopRecording()
      setIsRecording(false)
      if (audioBlob) {
        await processAudio(audioBlob)
      } else {
        setIsProcessing(false)
      }
    } else {
      const hasPermission = await audioService.requestPermission(settings.microphoneDeviceId)
      if (hasPermission) {
        audioService.startRecording()
        setIsRecording(true)
        setRussianText('')
        setTranslatedText('')
        setLastAudioUrl(null)
      } else {
        alert('Microphone permission is required.')
      }
    }
  }

  const toggleVADMode = async () => {
    if (isVADMode) {
      isVADModeRef.current = false
      audioService.stopVAD()
      audioService.setVADPaused(false) // Just in case it was paused
      setIsVADMode(false)
      setVadStatus('idle')
    } else {
      const hasPermission = await audioService.requestPermission(settings.microphoneDeviceId)
      if (!hasPermission) {
        alert('Microphone permission is required.')
        return
      }
      
      isVADModeRef.current = true
      setIsVADMode(true)
      setVadStatus('listening')
      setRussianText('')
      setTranslatedText('')
      
      await audioService.initVAD(
        () => {
          if (!isVADModeRef.current) return
          setVadStatus('listening')
        },
        async (blob) => {
          if (!isVADModeRef.current) return
          setVadStatus('transcribing')
          await processAudio(blob)
          
          if (!isVADModeRef.current) return
          // Re-enable listening after processing/playback
          setVadStatus('listening')
        },
        settings.vadThreshold,
        settings.vadSilenceDuration
      )
    }
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 relative">
        <h1 className="text-xl font-bold text-blue-600">TalkFlow</h1>
        <div className="flex items-center gap-2">
          {/* VAD Toggle */}
          <button
            onClick={toggleVADMode}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isVADMode ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isVADMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isVADMode ? 'Auto-Listen ON' : 'Auto-Listen OFF'}
          </button>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Status Bar */}
      {isVADMode && (
        <div className="bg-blue-600 text-white text-xs font-bold py-1 px-4 text-center uppercase tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
          Status: {vadStatus}
        </div>
      )}

      {/* Main Content (Split Screen) */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Top: Russian Source */}
        <div className="flex-1 bg-white flex flex-col border-b min-h-0">
          <div className="p-4 bg-white/90 sticky top-0 backdrop-blur-sm z-10 shrink-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Russian</span>
          </div>
          <div className={`flex-1 overflow-y-auto flex flex-col ${russianText ? 'px-6 pb-6 pt-2 justify-start items-start' : 'p-6 justify-center items-center'}`}>
            {russianText ? (
              <p className="text-2xl text-gray-800 w-full">{russianText}</p>
            ) : (
              <p className="text-2xl text-gray-300 italic text-center w-full">
                {isRecording || (isVADMode && vadStatus === 'listening') ? 'Listening...' : 'Tap microphone to start speaking...'}
              </p>
            )}
          </div>
        </div>

        {/* Bottom: Target Translation */}
        <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
          <div className="p-4 bg-gray-50/90 sticky top-0 backdrop-blur-sm z-10 shrink-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {settings.targetLanguage === 'en' ? 'English' : 'Italian'}
            </span>
          </div>
          <div className={`flex-1 overflow-y-auto flex flex-col ${translatedText ? 'px-6 pb-6 pt-2 justify-start items-start' : 'p-6 justify-center items-center'}`}>
            {translatedText ? (
              <>
                <p className="text-2xl text-blue-600 font-medium w-full">{translatedText}</p>
                {lastAudioUrl && (
                  <button
                    onClick={handleReplayAudio}
                    className="mt-4 p-3 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex items-center gap-2 shadow-sm"
                    title="Replay Audio"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <span className="font-semibold">Replay</span>
                  </button>
                )}
              </>
            ) : (
              <p className="text-2xl text-gray-300 italic text-center w-full">
                {isProcessing ? 'Processing...' : 'Translation will appear here'}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Microphone Button */}
      <footer className="p-6 bg-white border-t flex justify-center z-10 relative">
        {!isVADMode ? (
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
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`p-4 rounded-xl font-bold uppercase tracking-widest text-sm ${
              vadStatus === 'listening' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {vadStatus}
            </div>
            <button
              onClick={toggleVADMode}
              className="text-gray-500 text-xs underline"
            >
              Stop Auto-Listening
            </button>
          </div>
        )}
      </footer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsPanel 
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* App Update Modal */}
      {needRefresh && (
        <UpdateModal onUpdate={() => updateServiceWorker(true)} />
      )}
    </div>
  )
}

export default App
