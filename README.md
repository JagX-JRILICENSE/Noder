# Noder

**Real-time collaborative code editor & app builder**  
Created by **JagX** and **JRILICENSE**

Noder is a modern, high-performance development environment designed to feel exactly like Visual Studio Code — with seamless real-time collaboration, powerful GitHub integration, and the ability to build and package Windows/laptop applications directly from the editor.

## Vision

Build anything in real time. Just like VS Code and tools such as Qoder, Noder gives you:

- Lightning-fast editor experience powered by Monaco Editor
- Real-time multi-user collaboration
- Deep GitHub workflow integration
- One-click packaging of Windows desktop apps
- Extensible architecture (themes, extensions, language servers)

## Features (Roadmap)

- [x] Project scaffolding & repository structure
- [ ] Monaco-based editor core
- [ ] Real-time collaboration (CRDT / Yjs)
- [ ] File explorer & multi-tab editing
- [ ] Integrated terminal
- [ ] GitHub authentication & PR workflow
- [ ] Electron packaging for Windows
- [ ] Extension system
- [ ] AI-assisted coding (future)

## Tech Stack

- **Frontend**: React + TypeScript + Monaco Editor
- **Desktop**: Electron
- **Real-time**: Yjs + WebSocket / WebRTC
- **Build**: Vite + electron-builder
- **CI/CD**: GitHub Actions (Windows builds)

## Getting Started

### Prerequisites
- Node.js 20+
- Git
- Windows 10/11 (for packaging)

### Development

```bash
git clone https://github.com/JagX-JRILICENSE/Noder.git
cd Noder
npm install
npm run dev
```

### Build Windows App

```bash
npm run build:win
```

The GitHub Actions workflow will also produce Windows installers on every push to `main`.

## License

See [LICENSE](LICENSE) for details.

---

Made with ❤️ by JagX & JRILICENSE
