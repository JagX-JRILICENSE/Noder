# Noder Android (APK + AAB)

Noder desktop is Electron. Android builds use **Capacitor** around the Vite web UI.

Do **not** put a partial `android/` folder in git with only a README — CI checks for `android/gradlew`. If it is missing, the workflow runs `npx cap add android`.

## Local build

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build:web
npx cap add android   # once
npx cap sync android
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```

Or use GitHub Actions: **Build Android APK + AAB** workflow, then download Artifacts.
