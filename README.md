# Ephemeral Dropzone

An always-on, edge-docked desktop widget for instantly capturing text, links, and images. Drop anything in, drag it back out.

Built with **Electron + Svelte 5 + TailwindCSS + SQLite**.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Edge-docked widget** | Slim strip on your screen edge — slides open on hover |
| **Capture anything** | Paste (Ctrl+V) or drag-and-drop text, links, images, files |
| **Drag out** | Drag snippets directly into Word, browser, IDE, or any app |
| **Copy out** | Click to copy — always clean plain text, no formatting artifacts |
| **Search** | Global hotkey `Ctrl+Shift+Space` to search snippets instantly |
| **Daily cleanup** | Auto-prompt at 5 PM to review & clear, plus a manual trigger |
| **Dock anywhere** | Drag the grip bar to dock left or right |
| **Save permanently** | Export any snippet to a file on disk |
| **Always on top** | Stays above all windows for instant access |

## 🎨 Design

- Dark glassmorphism UI with vibrant blue accent palette
- Type-colored badges — 🔵 text · 🟦 links · 🟣 images · 🟡 files
- Smooth slide animations with GPU compositing
- Custom scrollbar and pulse-glow effects

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+V` | Paste from clipboard |
| `Ctrl+C` | Copy selected snippet |
| `Ctrl+X` | Cut selected snippet |
| `Ctrl+Shift+Space` | Open & focus search (global) |
| `Ctrl+Q` | Quit app |

## 📥 Installation

### Download (Recommended)
1. Go to [Releases](https://github.com/rajmane4-boop/Ephemeral-Dropzone/releases)
2. Download `Ephemeral-Dropzone-Setup-1.0.0.exe`
3. Run the installer — the widget appears on your right screen edge

### Build from Source
```bash
git clone https://github.com/rajmane4-boop/Ephemeral-Dropzone.git
cd Ephemeral-Dropzone
npm install
npm run dev          # development
npm run build        # production build
npm run package      # create .exe installer
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Electron 34 |
| UI | Svelte 5 |
| Styling | TailwindCSS 4 |
| Database | SQLite (sql.js) |
| Build | electron-vite + electron-builder |

## 📁 Project Structure

```
src/
├── main/
│   └── index.js          # Electron main process, IPC, DB, window management
├── preload/
│   └── index.js          # Context bridge API
└── renderer/
    ├── index.html
    └── src/
        ├── App.svelte           # Main app logic
        ├── main.js              # Svelte entry point
        ├── assets/app.css       # Global styles & animations
        └── components/
            ├── SnippetCard.svelte     # Individual snippet card
            ├── SnippetList.svelte     # Scrollable snippet list
            ├── DropZone.svelte        # Drag-and-drop target area
            ├── SearchBar.svelte       # Search input
            ├── DoomsdayPrompt.svelte  # Daily cleanup overlay
            └── Toast.svelte           # Toast notifications
```

## 💻 System Requirements

- Windows 10/11
- ~120 MB disk space

## 📄 License

MIT
