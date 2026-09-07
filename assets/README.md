# Noder Branding Assets

- `logo.svg` — Official Noder logo (vector)

## Generating `icon.ico` for Windows

Electron-builder looks for `assets/icon.ico`. You can generate it from the SVG:

### Option A – Online
1. Open https://convertio.co/svg-ico/ or https://icoconvert.com/
2. Upload `logo.svg`
3. Download `icon.ico` and place it here as `assets/icon.ico`

### Option B – ImageMagick (CLI)
```bash
# Requires ImageMagick
magick convert assets/logo.svg -define icon:auto-resize=256,128,64,48,32,16 assets/icon.ico
```

### Option C – electron-icon-builder
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./assets/logo.svg --output=./assets
```

Until `icon.ico` exists, the Windows build still succeeds and uses a default Electron icon.
