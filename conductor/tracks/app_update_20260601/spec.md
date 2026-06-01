# Specification: App Update Notification

## 1. Overview
Implement an app update notification mechanism for TalkFlow. When a new version of the Progressive Web App (PWA) is published and a new service worker is installed and waiting, the application will prompt the user to refresh and apply the update.

## 2. Functional Requirements
- **PWA Configuration**: Update `vite-plugin-pwa` configuration from `autoUpdate` to `prompt` to take manual control of the update lifecycle.
- **Update Detection**: Listen for service worker events (specifically `needRefresh`) to detect when a new version is downloaded and ready to be activated.
- **Mandatory Update UI**: Display a non-dismissible Modal Dialog in the center of the screen when an update is available.
- **Update Action**: The modal must contain an "Update Now" button. Clicking this button will trigger the new service worker to take control and automatically reload the page to apply the update.

## 3. Non-Functional Requirements
- **User Experience**: The modal should be clearly visible, block interaction with the underlying app, and explain that a new version is required to continue.
- **Reliability**: The update mechanism must reliably trigger across supported browsers when a new deployment occurs.

## 4. Acceptance Criteria
- PWA `registerType` is set to `prompt` in `vite.config.ts`.
- When a new build is deployed and downloaded by the browser, a Modal Dialog appears.
- The modal cannot be closed by clicking outside or pressing Escape (it is mandatory).
- Clicking the update button in the modal refreshes the page and loads the new version.

## 5. Out of Scope
- Background periodic checks for updates (we will rely on standard PWA navigation/reload triggers).
- Displaying complex release notes or changelogs within the update modal.