# Noder

**Real-time collaborative code editor & app builder**  
Created by **JagX** and **JRILICENSE**

Noder is a modern, high-performance development environment designed to feel exactly like Visual Studio Code — with seamless real-time collaboration, powerful GitHub integration, live preview, and the ability to build and package Windows/laptop applications directly from the editor.

## Features (v0.2.0)

- [x] **Monaco Editor** — Same engine as VS Code
- [x] **Real-time Collaboration** — Powered by Yjs + y-monaco (share a room ID and code together live)
- [x] **File Explorer** — Open any folder, recursive tree, open files into tabs
- [x] **Multi-tab Editing** — Dirty indicators, close tabs, language detection
- [x] **Integrated Terminal** — xterm.js based terminal panel (Ctrl+`)
- [x] **Live Preview** — Instant preview for HTML, Markdown, JavaScript & TypeScript
- [x] **GitHub Login** — Connect with a Personal Access Token
- [x] **Windows Packaging** — electron-builder (NSIS installer + portable)
- [x] **GitHub Actions CI** — Automatic Windows builds on every push
- [ ] Extension system
- [ ] Full node-pty shell
- [ ] AI-assisted coding (future)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Monaco Editor
- **Desktop**: Electron 33
- **Real-time**: Yjs + y-monaco + y-websocket
- **Terminal**: xterm.js
- **Build**: Vite + electron-builder
- **CI/CD**: GitHub Actions (Windows)

## Getting Started

### Prerequisites
- Node.js 20+
- Git
- Windows 10/11 recommended for packaging

### Development

```bash
git clone https://github.com/JagX-JRILICENSE/Noder.git
cd Noder
npm install
npm run electron:dev   # recommended (full desktop experience)
# or
npm run dev            # browser only
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` / Menu | Open Folder |
| `Ctrl+S` | Save current file |
| `Ctrl+`` ` | Toggle Terminal |

### Build Windows App

```bash
npm run build:win
```

Outputs appear in the `release/` folder (NSIS installer + portable executable).

The GitHub Actions workflow also produces Windows artifacts on every push to `main`.

### Real-time Collaboration

1. Open a file
2. Click the **Users** icon in the title bar
3. Share the room ID shown in the status bar with collaborators
4. They open the same room — edits sync in real time via the public Yjs demo server

> For production use, deploy your own y-websocket server.

### GitHub Integration

Click **Login** in the title bar and paste a GitHub Personal Access Token (classic) with `repo` scope.

## License

MIT — See [LICENSE](LICENSE)

---

Made with ❤️ by **JagX** & **JRILICENSE**
