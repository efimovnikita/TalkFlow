# Implementation Plan: App Update Notification

## Phase 1: PWA Configuration Update
- [x] Task: Update `vite.config.ts` to change the PWA `registerType` from `autoUpdate` to `prompt`. (b54e757)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: PWA Configuration Update' (Protocol in workflow.md)

## Phase 2: Update Detection and UI Implementation
- [ ] Task: Create a new component `UpdateModal.tsx` for the mandatory update dialog.
    - [ ] Implement the UI for the modal (non-dismissible overlay, "Update Now" button).
- [ ] Task: Integrate `vite-plugin-pwa/client`'s `useRegisterSW` hook in `App.tsx` to listen for the `needRefresh` state.
- [ ] Task: Render the `UpdateModal` when `needRefresh` is true, passing the `updateServiceWorker` function to the modal's update button.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Update Detection and UI Implementation' (Protocol in workflow.md)