# Save & return to your project

Noder remembers the last folder you opened.

## Desktop (Electron)

- Opening a folder writes `noder-workspace.json` under the app userData directory.
- On next launch, the last project path is restored if it still exists.
- Recent projects (up to 12) are kept for quick reopen.

APIs (preload):

- `workspaceSave(path)`
- `workspaceGetLast()` → `{ path, recent }`
- `workspaceListRecent()`

## Android

Uses Capacitor Preferences when running in the Capacitor shell. See `android/README.md`.
