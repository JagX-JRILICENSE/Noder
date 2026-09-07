# Noder

**Real-time collaborative code editor & app builder**  
Created by **JagX** and **JRILICENSE**

## Features (v0.6.0)

- **Working terminal** — node-pty when available, otherwise a real PowerShell/bash process shell
- **BYOK AI Assistant** — OpenAI, Anthropic, Grok (xAI), OpenRouter, NVIDIA NIM (your API key)
- **Marketplace install** — install extensions into the user extensions folder
- **Git push / pull** — Source Control panel + command palette
- **Command palette history** — recent commands first
- Real-time collab (Yjs), multi-terminal tabs, live preview, auto-updater

## Quick start

```bash
git clone https://github.com/JagX-JRILICENSE/Noder.git
cd Noder
npm install
npm run electron:dev
```

Optional full PTY terminal:

```bash
npm run rebuild   # needs build tools (VS on Windows)
```

## AI (bring your own key)

1. `Ctrl+Shift+A` or sparkle icon
2. Choose provider: OpenAI · Anthropic · Grok · OpenRouter · NVIDIA
3. Paste API key (stored only in localStorage on this machine)
4. Chat with active file as context

## Terminal

`Ctrl+`` opens the panel. Tabs support multiple shells. Without node-pty, Noder still runs a real system shell via `child_process`.

## Git

Open a repo folder → Git panel → stage / commit / **Pull** / **Push**.

## Marketplace

Package icon → **Install** on local catalog extensions.

## Builds

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

## License

MIT — See [LICENSE](LICENSE)

---

Made with love by **JagX** & **JRILICENSE**
