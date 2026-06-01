# Tech Stack: TalkFlow

## Frontend
- **Framework**: React (TypeScript) - For a robust, type-safe component architecture.
- **Build Tool**: Vite - For lightning-fast development and optimized production builds.
- **Styling**: Tailwind CSS - For rapid, utility-first UI development and responsive design.

## AI & Services
- **Speech-to-Text (STT)**: Mistral AI (`voxtral-mini-latest`) - For transcribing Russian speech using offline `multipart/form-data` uploads.
- **Translation**: Google Cloud Translation API - For translating between Russian, English, and Italian.
- **Text-to-Speech (TTS)**: Mistral AI (`voxtral-mini-tts-2603`) - For high-quality target language synthesis using `@mistralai/mistralai` SDK with streaming support.
- **Audio Capture**: Browser Native `MediaRecorder` API with custom `AudioWorklet` for Voice Activity Detection (VAD). This replaces the manual MediaRecorder mode with an automated, volume-threshold-based listening loop.

## Data & State
- **Persistence**: Browser Local Storage - For storing API keys, user preferences (voices), and settings securely on the client side.
- **State Management**: React Context / Hooks - Sufficient for managing the application flow and global settings.

## Deployment & PWA
- **PWA**: `vite-plugin-pwa` - To enable offline manifest and service worker capabilities.
- **Hosting**: Compatible with any static hosting (Vercel, Netlify, GitHub Pages).
