# Noder

**Real-time collaborative code editor & app builder**  
Created by **JagX** and **JRILICENSE**

## Features (v0.5.0)

- **Command Palette** — `Ctrl+Shift+P` (built-in + extension commands)
- **Richer Git UI** — stage / unstage / commit, branch status, blame gutter
- **Extension Marketplace skeleton** — local catalog + installed detection
- **macOS / Linux / Windows builds** — electron-builder + multi-OS CI
- **Real-time collaboration** — Yjs (public or `npm run collab:server`)
- Multi-terminal tabs, Monaco editor, live preview, GitHub panel, auto-updater

## Quick start

```bash
git clone https://github.com/JagX-JRILICENSE/Noder.git
cd Noder
npm install
npm run electron:dev
```

### Real-time collaboration

1. Open a file
2. Settings → set collab server (`wss://demos.yjs.dev` or `ws://localhost:1234`)
3. Click **Users** icon (or Command Palette → Toggle Collaboration)
4. Share the **room ID** from the status bar

Local server:

```bash
npm run collab:server
```

### Command Palette

`Ctrl+Shift+P` (or View menu) — search and run commands.

### Git

Open a Git repo folder → click branch icon for **Source Control** panel (stage/commit). Toggle blame with the **B** button.

### Extensions marketplace

Package icon → browse `marketplace/catalog.json`. Bundled: `extensions/hello-noder`.

### Builds

```bash
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
npm run build:all     # all (on supported hosts)
```

CI (`.github/workflows/build.yml`) builds **Windows, macOS, and Linux** on every push to `main`.

## License

MIT — See [LICENSE](LICENSE)

---

Made with ❤️ by **JagX** & **JRILICENSE**
