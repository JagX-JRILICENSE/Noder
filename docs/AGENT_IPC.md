# Agent IPC (shell + images)

`electron/registerAgentIpc.js` is on `main` and exposes:

| Channel | Purpose |
|---------|---------|
| `shell:exec` | Run a command, return stdout/stderr (agent auto-run) |
| `dialog:openImage` | Native image file picker |
| `fs:copyFile` | Copy image into workspace |

## Wire into `electron/main.ts`

Add **before** `app.whenReady()`:

```ts
try {
  require('./registerAgentIpc')(ipcMain, {
    getWin: () => win,
    getWorkspace: () => currentWorkspace,
  })
} catch (e) {
  console.warn('[Noder] registerAgentIpc', e)
}
```

Preload already exposes `shellExec`, `openImageDialog`, `copyFile` when those handlers exist.

After adding the snippet, rebuild:

```bash
npm run electron:dev
```
