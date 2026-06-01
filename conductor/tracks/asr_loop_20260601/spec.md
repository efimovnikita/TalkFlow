# Specification: Automatic Speech Recognition (ASR) Loop

## 1. Overview
Implement an automated Voice Activity Detection (VAD) mode in TalkFlow. In this mode, the application will continuously listen to the user, automatically detect when they stop speaking, transcribe the audio using Mistral STT, translate it via Google Cloud, synthesize the speech using Mistral TTS, and then immediately resume listening for the next phrase.

## 2. Functional Requirements
- **Audio Capture & VAD**:
  - Implement a custom `AudioWorklet` based on volume thresholding to detect speech onset and offset.
  - The application must capture audio chunks while speech is detected.
  - When a period of silence (below the threshold for a specific duration) is detected, the captured audio must be finalized and sent for processing.
- **Continuous Loop**:
  - The application must sequence the processing pipeline: STT -> Translation -> TTS.
  - Once the TTS audio finishes playing, the VAD should automatically and immediately resume listening ("Full Auto-Loop").
- **UI & Feedback**:
  - **State Indicators**: The UI must display the current state of the application (e.g., "Listening...", "Transcribing...", "Translating...", "Speaking...").
  - **Audio Chimes**: The application must play a short sound (beep/chime) to signal to the user when it starts listening and when it stops listening.
  - Provide a UI control (e.g., a toggle button) to switch the application into this continuous "Listening Mode".

## 3. Non-Functional Requirements
- **Cross-Browser Compatibility**: The custom `AudioWorklet` for volume thresholding must work reliably across modern browsers (Chrome, Safari, Firefox).
- **Performance**: The VAD logic must run efficiently in the audio thread without causing main thread blocking or audio glitches.

## 4. Acceptance Criteria
- User can activate "Listening Mode".
- When active, a chime plays, and the UI shows "Listening...".
- User speaks a phrase in Russian.
- User stops speaking; the app detects the silence, plays a "stop" chime, and transitions to "Transcribing...".
- The speech is transcribed, translated, and spoken aloud in the target language.
- Immediately after the TTS playback ends, a "start" chime plays, the UI switches back to "Listening...", and the app is ready for the next phrase.
- The volume thresholding accurately distinguishes between background noise and speech (within reasonable limits).

## 5. Out of Scope
- Integration of complex ML-based VAD (like Silero VAD).
- Handling overlapping speech (user speaking while TTS is playing). The app will strictly sequence the steps.
- Real-time partial transcriptions (streaming STT).