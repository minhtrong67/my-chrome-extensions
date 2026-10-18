<div align="center">

<img src="icons/icon128.png" alt="SmartShot" width="96" height="96" />

# SmartShot — Screenshot & Annotate

**Capture the visible area, a full page or any selection — then annotate and redact it in a Material Design 3 editor.**
Free, open source and 100% on-device.

![Version](https://img.shields.io/badge/version-1.1.0-9C27B0)
![Manifest](https://img.shields.io/badge/Manifest-V3-9C27B0)
![License](https://img.shields.io/badge/license-MIT-9C27B0)
![Languages](https://img.shields.io/badge/lang-EN%20%7C%20VI-9C27B0)

[English](README.md) · [Tiếng Việt](README.vi.md) · [Landing page](index.html)

</div>

---

## Introduction

SmartShot is a lightweight Chrome / Chromium extension for taking screenshots and marking them up. It has three capture modes, a fast annotation editor and a clean Material Design 3 interface that follows your device's language and theme. Nothing is uploaded anywhere — capture, editing and export all happen locally in your browser.

## Screenshots

| Annotation editor | Capture popup | Settings |
|---|---|---|
| ![Editor](screenshots/image01.png) | ![Popup](screenshots/image02.png) | ![Settings](screenshots/image03.png) |

| Dark · Tiếng Việt | Teal accent |
|---|---|
| ![Dark](screenshots/image04.png) | ![Teal](screenshots/image05.png) |

## Features

**Capture**
- **Visible area** — exactly what's on screen, instantly.
- **Full page** — scrolls and stitches a seamless tall image; sticky/fixed elements appear only once; works with `scroll-behavior: smooth` pages; very tall pages are safely capped at the browser's canvas limit.
- **Selected area** — drag a rectangle with a live size label (the overlay never ends up in the shot).
- Save straight to Downloads or the clipboard, or open the editor first.

**Editor**
- Pen, arrow, rectangle, ellipse, text (multi-line), highlighter, **pixelate/redact** and crop.
- Non-destructive: **select, move, resize, recolor and delete** any annotation; nudge with arrow keys.
- Undo / redo (60 steps), zoom (`Ctrl` + wheel), fit-to-window, paste or drop any image to edit.
- Export PNG or JPEG (quality control), editable file name, download or copy.
- Shortcuts: `V P A R E T H B C` for tools, `Ctrl+Z / Y`, `Ctrl+S`, `Ctrl+C`, `Del`, `Shift` to constrain.

**Personalization**
- **Light / Dark / System** theme.
- **19 Material theme colors** (Red … Blue Grey) generated as full Material 3 color roles.
- **Fonts**: System default (default), Roboto, Inter, Open Sans, Noto Sans, Nunito, Montserrat, Be Vietnam Pro, Serif, Monospace.
- **Font size**: Small / Medium / Large / Extra large.
- **English & Tiếng Việt** — automatically follows your device language, or choose manually.
- Import / export settings as JSON, one-click reset.

**Privacy** — no analytics, no network requests, minimal permissions (`activeTab`, `scripting`, `downloads`, `storage`, `offscreen`).

## Installation

### From the release package
1. Download `download/SmartShot-Setup.zip` (or the file from the [landing page](index.html)) and extract it to a permanent folder.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder.
4. Pin the purple SmartShot icon to the toolbar.

### From source
```bash
git clone https://github.com/minhtrong67/web-screenshot-ext.git
```
Then load the cloned folder with **Load unpacked** as above. No build step is required to run the extension.

> Requires Chrome / Edge / Brave **109+** (Offscreen Documents API).

## Tech stack

- **Manifest V3**, service worker + Offscreen Document (canvas work), content script injected on demand
- Plain **HTML / CSS / JavaScript** — no framework, no runtime dependencies
- **Material Design 3** tokens generated with [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities)
- **[Lucide](https://lucide.dev)** icons (inlined SVG sprite)
- Self-hosted fonts via [Fontsource](https://fontsource.org) (latin + vietnamese subsets)
- IndexedDB for large capture hand-off, `chrome.storage.local` for settings & history
- Dev tooling: Node.js, `sharp`, `archiver`

## Development

```bash
npm install            # dev tooling only (icons, themes, packaging)
npm run build:themes   # css/themes.css + js/accents.js  (19 colors × light/dark)
npm run build:lucide   # js/lucide.js  (edit the icon list in scripts/build-lucide.mjs)
npm run build:icons    # icons/*.png from the vector source, color #9C27B0
npm run build:assets   # all of the above
```

Edit the source, then press **Reload** on `chrome://extensions`. Inspect the popup, the editor tab and the service worker from there.

## Build

```bash
npm run pack
```
Creates `dist/SmartShot-v<version>.zip` containing only runtime files and copies it to `download/SmartShot-Setup.zip`, the file the landing page links to.

## Project structure

```
web-screenshot-ext/
├── manifest.json            Extension manifest (MV3, localized name/description)
├── popup.html               Capture popup + settings
├── editor.html              Annotation editor (full tab)
├── offscreen.html           Hidden page for crop / stitch / encode
├── index.html               Landing page (single file, Material 3)
├── css/                     material.css (shared M3), popup.css, editor.css, themes.css*, fonts.css
├── js/
│   ├── background.js        Service worker: capture orchestration, download, history
│   ├── content.js           Page metrics, scrolling, area-selection overlay
│   ├── offscreen.js         Crop / stitch / encode into blobs
│   ├── main.js              Popup logic          editor.js   Editor engine
│   ├── storage.js           Settings, history, IndexedDB hand-off
│   ├── i18n.js              EN / VI strings + device-language detection
│   ├── theme.js, boot.js    Theme / accent / font handling, flash-free boot
│   └── lucide.js*, accents.js*, fonts.js, ripple.js
├── fonts/                   Self-hosted woff2
├── icons/                   Extension icons (#9C27B0) + SVG source
├── _locales/en, vi          Store name & description
├── screenshots/             image01.png, image02.png, …
├── download/                SmartShot-Setup.zip (release package)
├── scripts/                 build-themes / build-lucide / build-icons / pack
└── LICENSE
                             * generated files
```

## Notes & limitations
- Browser pages (`chrome://…`), the Chrome Web Store and some PDF viewers can't be captured — the popup tells you.
- Full-page capture follows the main document scroll; pages that scroll inside an inner container capture only the visible part.
- Chrome allows ~2 captures per second, so the scroll delay never goes below 550 ms.
- Copying straight to the clipboard from the popup needs a secure (`https://`) page; otherwise SmartShot saves to Downloads instead. The editor's **Copy** button always works.

## License

Released under the **[MIT License](LICENSE)** — public and open source.

## Author

Created by **[minhtrong67](https://github.com/minhtrong67)** with AI support from **Claude** (Anthropic).
