# Noder

**Real-time collaborative code editor & app builder**  
Created by **JagX** and **JRILICENSE**

Noder is a modern development environment inspired by Visual Studio Code — with real-time collaboration, system terminal, GitHub integration, live preview, and Windows packaging.

## Features (v0.3.0)

- [x] **Monaco Editor** — Same engine as VS Code
- [x] **Real-time Collaboration** — Yjs + y-monaco (public or your own server)
- [x] **File Explorer** — Open folders, recursive tree, multi-tab editing
- [x] **Full System Terminal** — node-pty + xterm.js (PowerShell / bash) with fallback
- [x] **Live Preview** — Instant HTML / Markdown / JS / TS preview
- [x] **GitHub Integration** — Login, list repos, create Issues & Pull Requests
- [x] **Extension System Foundation** — Load extensions from `/extensions`
- [x] **Custom Collab Server** — `npm run collab:server`
- [x] **Windows Packaging** — NSIS installer + portable via electron-builder
- [x] **GitHub Actions CI** — Automated Windows builds
- [x] **Branding** — Logo SVG + icon generation instructions

## Quick Start

```bash
git clone https://github.com/JagX-JRILICENSE/Noder.git
cd Noder
npm install
npm run electron:dev
```

### Full system terminal (node-pty)

On Windows you need build tools (Visual Studio Build Tools / windows-build-tools). Then:

```bash
npm run rebuild
```

If node-pty fails to load, Noder automatically falls back to a simulated shell.

### Custom collaboration server

```bash
npm run collab:server
# Listening on ws://localhost:1234
```

In Noder: open **Settings** (gear icon) → set Collaboration server URL to `ws://localhost:1234` → Save. Then enable collab and share the room ID.

### GitHub

1. Click **Login** and paste a Personal Access Token (classic) with `repo` scope.
2. Click your username to open the GitHub panel.
3. Browse repos, create Issues and Pull Requests directly from Noder.

### Build Windows app

```bash
npm run build:win
```

Artifacts appear in `release/`. The GitHub Actions workflow also builds on every push to `main`.

### App icon

See [assets/README.md](assets/README.md) for generating `icon.ico` from the included logo.

## Project structure

```
Noder/
├── electron/          # Main process + preload (PTY, FS, extensions)
├── src/               # React + Monaco UI
│   ├── components/    # FileExplorer, Terminal, LivePreview, GitHubPanel
├── extensions/       # Sample + user extensions
├── collab-server/    # Custom Yjs WebSocket server
├── assets/           # Logo + icon instructions
├── .github/workflows # Windows CI
```

## License

MIT — See [LICENSE](LICENSE)

---

Made with ❤️ by **JagX** & **JRILICENSE**
