# Product Guidelines: TalkFlow

## Visual Identity
- **Minimalist Design**: A clean, distraction-free interface inspired by modern utility apps (e.g., Google Translate). Focus on typography and clear functional elements.
- **Color Palette**: Neutral tones with high-contrast accent colors for primary actions (e.g., the microphone button).

## User Experience (UX)
- **Extreme Simplicity**: The main screen should be focused entirely on the conversation. Secondary features must be tucked away in settings.
- **Immediate Utility**: The app should be ready to listen as soon as the microphone is activated.
- **Settings Accessibility**: A dedicated button on the home screen provides access to the configuration panel.

## Functional Components
- **Settings Panel**: Must include:
  - Input fields for **Mistral API Key**.
  - Input fields for **Google Cloud Translation API Key**.
  - Dropdown for **Mistral Voice Selection** (pre-configured list).
  - Dropdown for **Target Language Selection** (English/Italian).

## Voice and Tone
- **Interface**: Concise and functional instructions.
- **Synthesis**: The personality of the "speaker" is defined by the user-selected Mistral voice.

## Engineering Standards
- **Self-documenting Code**: Prioritize expressive naming and clean structure over excessive commenting. Use comments primarily for complex business logic or architectural decisions.
- **Privacy First**: API keys must be handled securely (e.g., stored in local storage and never logged).
