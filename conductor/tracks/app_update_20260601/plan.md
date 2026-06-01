# Implementation Plan: App Update Notification

## Phase 1: PWA Configuration Update [checkpoint: ecd7345]
- [x] Task: Update `vite.config.ts` to change the PWA `registerType` from `autoUpdate` to `prompt`. (b54e757)
- [x] Task: Conductor - User Manual Verification 'Phase 1: PWA Configuration Update' (Protocol in workflow.md) (ecd7345)

## Phase 2: Update Detection and UI Implementation
- [x] Task: Create a new component `UpdateModal.tsx` for the mandatory update dialog. (6360f8b)
    - [x] Implement the UI for the modal (non-dismissible overlay, "Update Now" button). (6360f8b)
- [x] Task: Integrate `vite-plugin-pwa/client`'s `useRegisterSW` hook in `App.tsx` to listen for the `needRefresh` state. (6360f8b)
- [x] Task: Render the `UpdateModal` when `needRefresh` is true, passing the `updateServiceWorker` function to the modal's update button. (6360f8b)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Update Detection and UI Implementation' (Protocol in workflow.md)