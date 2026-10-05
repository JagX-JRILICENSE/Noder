# Noder Android (APK + AAB)

Noder desktop is Electron. Android builds use **Capacitor** around the Vite web UI (editor + agent panel). Full native filesystem access on device uses Capacitor Filesystem / SAF.

## Prerequisites

- Node 20+
- Android Studio (SDK 34+, build-tools)
- JDK 17+

## One-time setup

```bash
cd Noder
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/filesystem @capacitor/preferences
npx cap init Noder com.jagx.noder --web-dir dist
npx cap add android
npm run build:web
npx cap sync android
```

## Build APK (debug)

```bash
npm run build:web
npx cap sync android
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Build APK (release)

```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Build AAB (Play Store)

```bash
cd android
./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

Sign release builds with your keystore (`jarsigner` / Android Studio Generate Signed Bundle).

## Scripts in package.json

- `npm run android:sync` — web build + cap sync
- `npm run android:apk` — assembleDebug
- `npm run android:aab` — bundleRelease

## Project persistence on Android

Last folder / recent projects are stored via `@capacitor/preferences` (and desktop via `noder-workspace.json` in userData).
