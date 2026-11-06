# X Media Downloader

> Download videos and images from X (Twitter) and TweetDeck with a single click — no third-party service, no crawling.

**Version** 1.4.0 · **Platform** Chrome (Manifest V3, Chrome 111+) · **Languages** English, Tiếng Việt · **Design** Material 3 Expressive

*Tiếng Việt: xem [README.vi.md](README.vi.md).*

---

## Highlights

| Feature | Description |
| --- | --- |
| One-click download | A download button is added to the action bar of every post that has media, with a progress ring. |
| Quoted posts | Media inside a quoted post is detected and can be downloaded too. |
| Pick individual media | Right-click the button (or set “Let me choose”) to pick a single photo/video from a multi-media post. |
| Original quality | Highest-bitrate MP4 for videos/GIFs, `name=orig` for images. |
| Custom filename | Template with tokens and sub-folders, live preview in Settings. |
| Save location | Choose a sub-folder inside Downloads (tokens allowed), or let Chrome ask where to save each file. |
| Auto reveal sensitive content | Clicks “View” on media hidden behind a sensitive-content warning — by label (English/Vietnamese plus your own words) and by the warning’s layout, so it works in other languages too. |
| Keyboard shortcut | In-page key (default `D`) plus a browser-wide command (`Alt+Shift+D`). |
| Video thumbnail | Optionally saves the cover image next to the video. |
| Quick popup | Toolbar popup with switches for the button, auto reveal, thumbnails and shortcut. |
| Activity log | Recent failures and automatic retries, with a one-click “Copy report”. |
| Backup | Export / import / reset all settings (reset asks for confirmation in a Material dialog). |
| Guidance | A first-run “Welcome” card, collapsible settings sections, a live preview of the button/tooltip/menu/notifications, and a red badge on the toolbar icon when a download fails. |
| Personalisation | Light / dark / system theme, all 19 Material colours plus a custom colour, text size, language and a custom font dropdown. |

**Out of scope by design:** tweet crawling, batch download and file compression.

## Installation (personal use)

1. Download and unzip this folder.
2. Open `chrome://extensions` and switch on **Developer mode**.
3. Click **Load unpacked** and select the `x-media-downloader` folder.
4. Open [x.com](https://x.com) — posts with media now show a download button.

> After updating the files, press the reload icon on the extension card and refresh open X tabs.

## Usage

- **Button:** click the download icon in a post’s action bar. A ring shows progress and turns into a check mark when done. By default a multi-media post downloads everything; **right-click** the button to choose individual items (or switch to *Let me choose* in Settings). Inside the photo viewer only the photo you are looking at is saved.
- **Shortcut:** hover a post (or select it with `J` / `K`) and press the shortcut. Change it in *Settings → Download*.
- **Browser-wide shortcut:** set it at `chrome://extensions/shortcuts` (default `Alt+Shift+D`).

### Filename tokens

| Token | Example | Meaning |
| --- | --- | --- |
| `{username}` | `minhtrong67` | Account handle |
| `{name}` | `Minh Trọng` | Display name |
| `{tweetId}` | `1850012345678901234` | Post ID |
| `{index}` | `1` | Media number within the post |
| `{date}` / `{time}` | `20261102` / `143005` | Post date / time (local) |
| `{text}` | `Sample post text` | First 40 characters of the post |
| `{type}` | `photo`, `video`, `gif` | Media type |
| `{filename}` | `G3xAbCdEfGh` | Original media name |

Presets are available in Settings, and **Try with a post link** previews the exact filenames for a real post. Use `/` to create folders, e.g. `X/{username}/{date}-{tweetId}-{index}`. The extension is appended automatically and invalid characters are replaced. Existing files are never overwritten.

## Settings

- **Appearance:** theme (light / dark / system); theme colour from the 19 Material colours (Red, Pink, Purple, Deep Purple, Indigo, Blue, Light Blue, Cyan, Teal, Green, Light Green, Lime, Yellow, Amber, Orange, Deep Orange, Brown, Grey, Blue Grey) laid out in a balanced grid, with a 20th tile for any custom colour; text size (small / medium / large); language (English / Tiếng Việt); font (System, Google Sans Flex, Roboto Flex, Roboto, Arial, Inter, Be Vietnam Pro) chosen from a custom dropdown with full keyboard support (arrows, Home/End, type-ahead, Esc).
- **Save location:** Chrome only lets extensions write inside its Downloads folder, so the setting is a *sub-folder* (e.g. `X Media/{username}`), with a live preview of the final path. Absolute paths such as `D:/Pics` are rejected with a hint. For any other folder turn on **Ask where to save each file** (Chrome’s Save dialog appears for every file), or move the main Downloads folder in `chrome://settings/downloads`.
- **Download:** filename template and presets, auto reveal (plus extra “View” labels), video thumbnail, behaviour for posts with several media, shortcut.
- **Activity:** recent problems and retries (stored locally, up to 60 entries).
- **About → Backup:** export/import settings as JSON, or reset everything.
- **Sync:** settings are stored with `chrome.storage.sync`; the activity log stays on this device.
- **Fonts:** all seven fonts are bundled (Latin + Vietnamese subsets), so they work offline and nothing is fetched from external servers. On x.com the toast, tooltip and menu use the chosen font only if it is installed on your system; otherwise they fall back to your system font.

## How it works

```
x.com page ──► inject.js (MAIN world) ──postMessage──► content.js ──runtime message──► background.js ──► chrome.downloads
   │  hooks GraphQL fetch/XHR           │ cache, button, shortcut, toast               │ filename + download
   └── reads media URLs from responses  └── fallback: syndication API via background ◄─┘
```

- `src/inject.js` reads the page’s own GraphQL responses to obtain media URLs. Sensitive and logged-in-only media work because the page already has them.
- If a post is not cached, `background.js` queries the public syndication endpoint as a fallback (public posts only).
- Heavy work is deferred and incremental: only responses under 6 MB are parsed, only new posts are scanned, and cached post data expires after 30 minutes.
- Downloads run through a small queue (at most 3 files at a time). If a download fails with a network/server error, the media link is refreshed through the fallback lookup and retried once; the outcome is recorded in *Activity*.

## Permissions

| Permission | Why |
| --- | --- |
| `downloads` | Save files through Chrome’s download manager. |
| `storage` | Keep your settings (synced). |
| `x.com`, `twitter.com` (and sub-domains) | Add the button and read media data on those sites. |
| `cdn.syndication.twimg.com` | Fallback lookup for public posts. |

No analytics, no remote servers, no data leaves your browser except the requests X itself makes and the downloads you start.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| No button on a post | Reload the extension and the tab. The button only appears on posts with photos/video. |
| “No downloadable media found” | Open the post once so X loads it, then retry. Protected/age-restricted posts need you to be logged in. |
| Sensitive media is not revealed | Add the local word for “View” (comma-separated) under *Settings → Download → Extra “View” labels*. The layout-based detection is a heuristic and may need adjusting if X changes its markup. |
| Files land in the wrong place | Check *Settings → Download → Save location*. The folder is always relative to Chrome’s Downloads folder. |
| Downloads misbehave | Disable other download-manager extensions on X — they can race with this one. |
| A download failed | Open *Settings → Activity* to see the reason (expired link, network, file system) and use **Copy report** when asking for help. |
| Browser feels slow | Open `chrome://extensions` → *Errors* for this extension and Chrome’s Task Manager (Shift+Esc) to see which tab is busy, then report it. |

## Development

No build step is needed to run the extension. `src/mcu.js` is a bundled copy of [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) used to generate Material 3 palettes. To rebuild it:

```bash
npm i @material/material-color-utilities esbuild
cat > entry.js <<'JS'
import { Hct, SchemeTonalSpot, MaterialDynamicColors, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
const KEYS = ['primary','onPrimary','primaryContainer','onPrimaryContainer','secondary','onSecondary','secondaryContainer','onSecondaryContainer','tertiary','onTertiary','tertiaryContainer','onTertiaryContainer','error','onError','errorContainer','onErrorContainer','background','onBackground','surface','onSurface','surfaceVariant','onSurfaceVariant','outline','outlineVariant','surfaceDim','surfaceBright','surfaceContainerLowest','surfaceContainerLow','surfaceContainer','surfaceContainerHigh','surfaceContainerHighest','inverseSurface','inverseOnSurface','inversePrimary','surfaceTint','scrim','shadow'];
const dyn = new MaterialDynamicColors();
globalThis.MCU = { scheme(hex, dark, contrast = 0) {
  const s = new SchemeTonalSpot(Hct.fromInt(argbFromHex(hex)), !!dark, contrast);
  return Object.fromEntries(KEYS.map((k) => [k, hexFromArgb(dyn[k]().getArgb(s))]));
} };
JS
npx esbuild entry.js --bundle --minify --format=iife --outfile=src/mcu.js
```

### Project structure

```
manifest.json        MV3 manifest
background.js        service worker: queue, retry, progress, activity log, fallback lookup
popup.html/js        toolbar quick switches
options.html/css/js  settings page (Material 3 Expressive)
src/inject.js        MAIN-world hook for X’s GraphQL responses
src/content.js       button, menu, shortcut, auto reveal, toast, tooltip (all X selectors live in `SEL`)
src/shared.js        defaults, i18n, filename builder, toast/tooltip helpers
src/theme.js         applies Material 3 theme tokens
src/ui.css           shared toast, tooltip, menu and dialog styles
fonts.css, fonts/    bundled web fonts (woff2, Latin + Vietnamese)
src/content.css      download button styles
src/mcu.js           bundled Material colour utilities
icons/               extension icons
```

## Maintenance notes

- X changes its markup from time to time. Every selector the extension relies on is collected in the `SEL` object at the top of `src/content.js`; update them there if the button stops appearing.
- The sensitive-content detection by layout is based on the structure of the warning (a short button next to a long warning text) and has not been verified against every variant of X’s UI.

## Disclaimer

This is an independent, personal-use project and is not affiliated with or endorsed by X Corp. Respect creators’ rights and X’s terms; download only content you are allowed to save.

## Credits

Created by **minhtrong67** with the support of **Claude**, an AI assistant by Anthropic.
