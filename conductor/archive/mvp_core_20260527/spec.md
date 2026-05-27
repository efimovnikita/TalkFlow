# Track Specification: MVP Core

## Overview
This track focuses on initializing the React/Vite project and implementing the end-to-end voice translation loop: Recording Russian speech -> Transcribing (Mistral) -> Translating (Google) -> Synthesizing (Mistral) -> Playback.

## Scope
- Project scaffolding with React, Vite, and Tailwind CSS.
- Basic UI with microphone control and settings panel.
- Integration with Mistral AI (STT/TTS) and Google Cloud Translation.
- Voice Activity Detection (VAD) integration.
- Local Storage persistence for API keys and settings.

## Technical Requirements
- **Vite/React Setup**: PWA configuration.
- **Audio Service**: Handle browser microphone access and streaming to APIs.
- **Settings Service**: CRUD operations for `localStorage`.
- **UI Components**: `MicrophoneButton`, `SettingsPanel`, `TranslationDisplay`.

## Success Criteria
- User can enter API keys in settings.
- App detects speech, transcribes, translates, and speaks back in English or Italian.
- User can see both texts on a split screen.
- Settings are persisted across refreshes.
