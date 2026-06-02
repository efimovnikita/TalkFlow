import { useState, useCallback, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import SettingsPanel from './components/SettingsPanel'
import UpdateModal from './components/UpdateModal'
import AutoShrinkText from './components/AutoShrinkText'
import { loadSettings, saveSettings } from './services/settingsService'
import type { Settings } from './services/settingsService'
import { audioService } from './services/audioService'
import { transcribeSpeech, synthesizeSpeech } from './services/mistralService'
import { translateText } from './services/translationService'
import { MistralRealtimeService } from './services/mistralRealtimeService'
import './App.css'

type VADStatus = 'idle' | 'listening' | 'transcribing' | 'translating' | 'speaking';

function App() {
  const {
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const [settings, setSettings] = useState<Settings>(loadSettings())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [russianText, setRussianText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null)
  
  const [isVADMode, setIsVADMode] = useState(false)
  const [vadStatus, setVadStatus] = useState<VADStatus>('idle')
  
  // Use a ref to track the latest VAD mode state for callbacks
  const isVADModeRef = useRef(isVADMode)
  const realtimeServiceRef = useRef<MistralRealtimeService | null>(null)
  const realtimeTextRef = useRef('')

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
    if (!isVADModeRef.current) return; // Check if we should still be processing

    try {
      audioService.setVADPaused(true)
      setIsProcessing(true)
      
      let text = realtimeTextRef.current.trim()
      
      if (!text) {
        setRussianText('Transcribing...')
        text = await transcribeSpeech(audioBlob, settings.mistralApiKey)
        console.log('Fallback transcription result:', text);
      } else {
        console.log('Using realtime transcription:', text);
      }
      
      if (!text) {
         setRussianText('No speech detected.');
         audioService.setVADPaused(false)
         return; 
      }
      
      if (!isVADModeRef.current) return;

      setRussianText(text)
      setVadStatus('translating')
      setTranslatedText('Translating...')
      
      const translation = await translateText(text, settings.targetLanguage, settings.googleApiKey)
      console.log('Translation result:', translation);
      
      if (!isVADModeRef.current) return;
      setTranslatedText(translation)
      
      if (translation) {
        setVadStatus('speaking')
        setTranslatedText(translation)
        console.log('Synthesizing speech...');
        const ttsBlob = await synthesizeSpeech(translation, settings.mistralVoice, settings.mistralApiKey)
        
        if (!isVADModeRef.current) return;

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
  }, [settings, lastAudioUrl]);

  // Keep VAD callbacks up-to-date to avoid stale closures with settings/processAudio
  const onSpeechStartRef = useRef<() => void>(() => {})
  const onSpeechEndRef = useRef<(blob: Blob) => Promise<void>>(async () => {})

  onSpeechStartRef.current = () => {
    if (!isVADModeRef.current) return
    setVadStatus('listening')
    setRussianText('')
    realtimeTextRef.current = ''
    
    // Connect to Mistral Realtime
    const service = new MistralRealtimeService(
      settings.mistralApiKey,
      (text) => {
        if (text) {
          setRussianText(prev => {
            const newText = prev + text
            realtimeTextRef.current = newText
            return newText
          })
        }
      },
      (error) => {
        console.error('Realtime transcription error:', error)
      },
      'voxtral-mini-transcribe-realtime-2602',
      settings.mistralProxyUrl
    )
    
    realtimeServiceRef.current = service
    service.connect().catch(e => {
      console.error('Failed to connect to realtime service:', e)
    })
  }

  onSpeechEndRef.current = async (blob) => {
    if (!isVADModeRef.current) return
    
    if (realtimeServiceRef.current) {
      realtimeServiceRef.current.disconnect()
      realtimeServiceRef.current = null
    }

    setVadStatus('transcribing')
    await processAudio(blob)
    
    if (!isVADModeRef.current) return
    // Re-enable listening after processing/playback
    setVadStatus('listening')
  }



  const toggleVADMode = async () => {
    if (isVADMode) {
      isVADModeRef.current = false
      audioService.stopVAD()
      audioService.setVADPaused(false) // Just in case it was paused
      setIsVADMode(false)
      setVadStatus('idle')
      
      if (realtimeServiceRef.current) {
        realtimeServiceRef.current.disconnect()
        realtimeServiceRef.current = null
      }
    } else {
      // Check if proxy URL is configured
      if (!settings.mistralProxyUrl || !settings.mistralProxyUrl.trim()) {
        alert('Для работы автопрослушивания с транскрипцией в реальном времени необходимо указать адрес прокси-сервера в настройках.')
        setIsSettingsOpen(true)
        return
      }

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
      setLastAudioUrl(null)
      realtimeTextRef.current = ''
      
      await audioService.initVAD(
        () => onSpeechStartRef.current(),
        async (blob) => onSpeechEndRef.current(blob),
        settings.vadThreshold,
        settings.vadSilenceDuration,
        (samples) => {
          if (realtimeServiceRef.current) {
            realtimeServiceRef.current.sendAudioChunk(samples)
          }
        }
      )
    }
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm p-2 md:p-4 flex justify-between items-center z-10 relative">
        <h1 className="text-lg md:text-xl font-bold text-blue-600">TalkFlow</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>


      {/* Main Content (Split Screen) */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Top: Russian Source */}
        <div className="flex-1 bg-white flex flex-col border-b min-h-0">
          <div className="px-3 py-1 md:p-4 bg-white/90 sticky top-0 backdrop-blur-sm z-10 shrink-0">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Russian</span>
          </div>
          <div className={`flex-1 flex flex-col min-h-0 w-full ${russianText ? 'px-4 pb-2 md:px-6 md:pb-6 pt-1 md:pt-2 justify-start items-start' : 'p-4 md:p-6 justify-center items-center'}`}>
            {russianText ? (
              <AutoShrinkText 
                text={russianText} 
                maxFontSizeRem={1.5} 
                minFontSizeRem={0.875} 
                color="text-gray-800"
              />
            ) : (
              <p className="text-xl md:text-2xl text-gray-300 italic text-center w-full">
                {isVADMode && vadStatus === 'listening' ? 'Listening...' : 'Tap microphone to start Auto-listening...'}
              </p>
            )}
          </div>
        </div>

        {/* Bottom: Target Translation */}
        <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
          <div className="px-3 py-1 md:p-4 bg-gray-50/90 sticky top-0 backdrop-blur-sm z-10 shrink-0">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">
              {settings.targetLanguage === 'en' ? 'English' : 'Italian'}
            </span>
          </div>
          <div className={`flex-1 flex flex-col min-h-0 w-full ${translatedText ? 'px-4 pb-2 md:px-6 md:pb-6 pt-1 md:pt-2 justify-start items-start' : 'p-4 md:p-6 justify-center items-center'}`}>
            {translatedText ? (
              <AutoShrinkText 
                text={translatedText} 
                maxFontSizeRem={1.5} 
                minFontSizeRem={0.875} 
                color="text-blue-600"
                fontWeight="font-medium"
                suffix={lastAudioUrl && (
                  <button
                    onClick={handleReplayAudio}
                    className="p-1 md:p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors inline-flex items-center shadow-sm"
                    title="Replay Audio"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                )}
              />
            ) : (
              <p className="text-xl md:text-2xl text-gray-300 italic text-center w-full">
                {isProcessing ? 'Processing...' : 'Translation will appear here'}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Auto-Listen Button */}
      <footer className="p-2 md:p-4 bg-white border-t grid grid-cols-3 items-center z-10 relative">
        <div className="flex justify-end pr-2 md:pr-4">
          {isVADMode && (
            <div className={`px-3 py-1 rounded-full font-bold uppercase tracking-widest text-[10px] md:text-xs border ${
              vadStatus === 'listening' 
                ? 'bg-green-50 text-green-700 border-green-200 animate-pulse' 
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {vadStatus}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={toggleVADMode}
            className={`relative ${
              isVADMode 
                ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-100 scale-105 active:scale-95' 
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
            } text-white p-5 md:p-8 rounded-full shadow-md transition-all duration-300 transform`}
            title={isVADMode ? "Stop Auto-Listening" : "Start Auto-Listening"}
          >
            {isVADMode && (
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25"></span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 md:h-10 md:w-10 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isVADMode ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              )}
            </svg>
          </button>
        </div>

        <div className="flex justify-start pl-2 md:pl-4">
          {/* Empty cell to balance the grid columns and keep the button centered */}
        </div>
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
