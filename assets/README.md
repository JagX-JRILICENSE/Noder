# Noder brand assets

## Wordmark & mark

| File | Use |
|------|-----|
| `logo.svg` | App mark — node network forming **N** + live pulse |
| `wordmark.svg` | Full logotype **Noder** + LIVE badge |

## App icons (generated)

Run:

```bash
pip install pillow
python scripts/generate-icons.py
```

Produces:

- `icon.png` (512×512) — macOS / Linux / Electron
- `icon.ico` (multi-size) — Windows installer & shortcut
- `icon-16.png` … `icon-1024.png` — marketing / stores

CI runs this automatically before packaging.

## Design language

- Background: deep graphite `#12161c`
- Primary: electric cyan `#3ecfff`
- Accent / live: mint `#00d4aa` → `#00ffb4`
- Wordmark: clean geometric sans, bold weight, tight tracking

Created for **JagX & JRILICENSE**.
