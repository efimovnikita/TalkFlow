# Implementation Plan: Automatic Speech Recognition (ASR) Loop

## Phase 1: VAD AudioWorklet Implementation [checkpoint: 0d5f47d]
- [x] Task: Create `volume-processor.js` (AudioWorklet) for volume thresholding and silence detection. (0e45552)
- [x] Task: Implement message passing to send "speech_start" and "speech_end" events to the main thread. (0e45552)
- [x] Task: Conductor - User Manual Verification 'Phase 1: VAD AudioWorklet Implementation' (Protocol in workflow.md) (0d5f47d)

## Phase 2: Audio Service Integration [checkpoint: 45b3b5d]
- [x] Task: Update `audioService.ts` to load the `volume-processor` worklet and manage the audio graph. (93e1f51)
- [x] Task: Implement logic to capture audio chunks only during active speech (between "speech_start" and "speech_end" events). (93e1f51)
- [x] Task: Add methods to start and stop the continuous VAD listening mode. (93e1f51)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Audio Service Integration' (Protocol in workflow.md) (45b3b5d)

## Phase 3: UI Feedback and Chimes
- [x] Task: Add logic to play audio chimes (start and stop beeps) using the Web Audio API. (93e1f51)
- [x] Task: Update the main application state to track "Listening", "Transcribing", "Translating", and "Speaking" phases. (86a38d4)
- [x] Task: Update `App.tsx` to display the new visual state indicators and provide a toggle for "Listening Mode". (86a38d4)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Feedback and Chimes' (Protocol in workflow.md)

## Phase 4: Continuous Loop Logic
- [ ] Task: Implement the "Full Auto-Loop" control flow in the main application logic.
- [ ] Task: Sequence the steps: Trigger VAD -> On speech end, call Mistral STT -> Google Translate -> Mistral TTS.
- [ ] Task: Wire the end of Mistral TTS playback to automatically trigger the "start listening" chime and re-enable VAD.
- [ ] Task: Update `tech-stack.md` to reflect the addition of the custom AudioWorklet for VAD, replacing manual MediaRecorder.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Continuous Loop Logic' (Protocol in workflow.md)