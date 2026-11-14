# X Downloader

> Download videos and images from X (Twitter) and TweetDeck with one click — no third-party service, no crawling.

**Version** 2.0.0 · **Platform** Chrome (Manifest V3, Chrome 111+) · **Languages** English, Tiếng Việt · **Design** Fluent · **Icons** [Lucide](https://lucide.dev)

*Tiếng Việt: xem [README.vi.md](README.vi.md).*

## Features

- **One-click download** — a button in every post’s action bar, with a progress ring and a check mark when done.
- **Quoted posts & multiple media** — right-click the button (or choose “Let me choose”) to pick single photos/videos.
- **Original quality** — highest-bitrate MP4 for videos/GIFs, `name=orig` for images.
- **Custom file name & save folder** — template tokens, sub-folders inside Downloads, live example.
- **Auto-reveal sensitive content**, **video thumbnail**, **keyboard shortcut** (default `D`, plus a browser-wide command `Alt+Shift+D`).
- **Quick popup** — switches for the button, auto-reveal, thumbnail and shortcut.
- **Activity log** — recent failures and automatic retries, with a red badge on the toolbar icon.
- **Appearance** — light / dark / system theme and English / Tiếng Việt. The font is always the system font.

**Out of scope by design:** tweet crawling, batch download and file compression.

## Install (personal use)

1. Unzip `x-downloader.zip`.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `x-downloader` folder.
4. Open [x.com](https://x.com) — posts with media now show a download button.

After changing files, press the reload icon on the extension card and refresh open X tabs.

## Project structure

```
x-downloader/
├─ manifest.json
├─ background.js        service worker: downloads, retry, activity log, badge
├─ popup.html / .js     toolbar popup
├─ options.html / .js   settings page
├─ fluent.css           Fluent styles for popup + settings
├─ icons/               logo (SVG + PNG)
└─ src/
   ├─ shared.js         defaults, i18n, file-name helpers
   ├─ icons.js          Lucide icons used by the extension
   ├─ ui.js, overlay.css  toast, tooltip, menu, dialog
   ├─ content.js, content.css  button on X pages
   └─ inject.js         reads X’s own GraphQL responses (MAIN world)
```

## Credits

Author: **minhtrong67** — built with AI assistance from **Claude** (Anthropic).
Icons: [Lucide](https://lucide.dev) (ISC License).
