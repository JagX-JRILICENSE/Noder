# Noder

**Real-time collaborative code editor & app builder**  
Created by **JagX** and **JRILICENSE**

Noder is a modern development environment inspired by Visual Studio Code — with real-time collaboration, multi-terminal, Git status/blame, deep extension API, GitHub integration, live preview, and auto-updating Windows builds.

## Features (v0.4.0)

- [x] **Monaco Editor** — Same engine as VS Code
- [x] **Real-time Collaboration** — Yjs (public or self-hosted server)
- [x] **File Explorer** — Recursive tree, multi-tab editing
- [x] **Multi-terminal tabs** — Multiple node-pty sessions (+ / ✕)
- [x] **Git status & blame** — Branch in status bar, toggle blame gutter
- [x] **Deep Extension API** — Commands, status bar contributions, activate/deactivate
- [x] **Auto-updater** — electron-updater via GitHub Releases
- [x] **Live Preview** — HTML / Markdown / JS / TS
- [x] **GitHub panel** — List repos, create Issues & PRs
- [x] **Custom collab server** — `npm run collab:server`
- [x] **Windows packaging + hardened CI**

## Quick Start

```bash
git clone https://github.com/JagX-JRILICENSE/Noder.git
cd Noder
npm install
npm run electron:dev
```

### Full system terminal

```bash
npm run rebuild   # after installing build tools on Windows
```

Open terminal with **Ctrl+`**. Use **+** to open additional terminal tabs.

### Git blame

Open a file inside a Git repo → click the **Git branch** icon in the title bar to toggle the blame gutter.

### Extensions

Place extensions under `extensions/<name>/` with a `package.json` and `extension.js`:

```js
function activate(api) {
  api.registerCommand('my.cmd', () => {
    api.showMessage('Hello!')
  })
}
module.exports = { activate }
```

Sample extension: `extensions/hello-noder`.

### Auto-updater

Packaged builds check GitHub Releases automatically.  
Help → Check for Updates, or click the green badge in the status bar when an update is ready.

### Custom collab server

```bash
npm run collab:server   # ws://localhost:1234
```

Settings (gear) → set server URL → enable collab.

### Build Windows app

```bash
npm run build:win
```

CI on `main` produces artifacts. Publish a GitHub Release with the built installers to enable auto-updates for users.

## License

MIT — See [LICENSE](LICENSE)

---

Made with ❤️ by **JagX** & **JRILICENSE**
