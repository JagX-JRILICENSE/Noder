# Noder User Guide (v0.9.8)

## Install & run

```bash
npm install
npm run electron:dev
```

### Build installers

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

Artifacts land in `release/`.

## AI Agent (Ctrl+Shift+A)

1. Paste API key (OpenRouter / Groq / NVIDIA free tiers).
2. List models → pick free or paid.
3. Auto-apply and Auto-run are ON by default.

## Quest board

Title bar checklist icon → multi-step goals.

## Live Preview

Source / App / Guide modes. Project chip auto-detects Vite, Next, Flutter.

## GitHub

Login with PAT → clone/browse → edit → Push button (save+commit+push).

## Marketplace

Activity bar → Extensions. Add your own under `extensions/` + `marketplace/catalog.json`.

## Shortcuts

- Ctrl+Shift+P Command palette
- Ctrl+Shift+A AI agent
- Ctrl+` Terminal
- Ctrl+S Save
