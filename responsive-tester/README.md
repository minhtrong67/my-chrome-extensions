<div align="center">

# Responsive Tester

**Test responsive layouts on 79 phones, tablets, foldables, watches and desktops — right on the tab you are working on.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4) ![Chrome 121+](https://img.shields.io/badge/Chrome-121%2B-34A853) ![Design](https://img.shields.io/badge/Design-Material%203%20Expressive-6750A4) ![i18n](https://img.shields.io/badge/Languages-EN%20%7C%20VI-F9AB00) ![License](https://img.shields.io/badge/License-MIT-lightgrey)

</div>

---

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Keyboard shortcuts](#keyboard-shortcuts)
6. [Settings](#settings)
7. [How it works](#how-it-works)
8. [Permissions and privacy](#permissions-and-privacy)
9. [Limitations](#limitations)
10. [Troubleshooting](#troubleshooting)
11. [Project structure](#project-structure)
12. [Development](#development)
13. [Credits](#credits)
14. [License](#license)

## Overview

Responsive Tester opens the page you are currently viewing inside a realistic device frame, without leaving the tab.
The page is loaded in an iframe with the exact viewport of the selected device, so CSS media queries, breakpoints and
viewport units behave as they do on a real screen. A left sidebar holds the tools, the centre shows the device, and a right
sidebar lists every device with search and filters.

## Features

| Area | What you get |
| --- | --- |
| **Devices** | 79 presets: iPhone 8 to 17 Pro Max, Pixel 5 to 10, Galaxy S / A, foldables, iPad, Android tablets, Apple Watch, MacBook, laptops, desktops, iMac and kiosks. Custom devices are saved in your browser. |
| **Realistic frames** | Each family has its own look: titanium iPhone with Dynamic Island and side buttons, Pixel, Galaxy, iPad, foldable with crease, MacBook with notch and deck, monitor and iMac with stand, Apple Watch with straps. |
| **System bars** | Status bar and home indicator are drawn per device and the page viewport shrinks accordingly, like a real browser. The bar colour follows the page. |
| **Responsive mode** | Drag the edges, type W×H, or tap Tailwind-style breakpoints (320 to 1536). |
| **Compare** | Up to 6 devices side by side with synced scrolling and navigation. |
| **Emulation** | Mobile User-Agent and client hints, touch emulation (drag to scroll with inertia, touch events), device pixel ratio, optional scrollbar. |
| **Capture** | PNG screenshots with transparent rounded corners; recording to GIF, WebM or MP4 (up to 60 s). |
| **Interface** | Material 3 Expressive, light / dark / system, 19 Material colour themes plus a custom colour, three text sizes, seven fonts, English and Vietnamese. |
| **Polish** | Resizable and collapsible sidebars, custom tooltips with shortcut hints, themed dropdowns, toasts (info, success, warning, error), ripple and shape-morph animations, scroll-to-top. |

## Installation

1. Download or clone this folder.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Choose **Load unpacked** and select the `responsive-tester` folder.
4. Pin the extension for quick access.

After updating the files, click **Reload** on the extension card and refresh the page you want to test.

## Usage

1. Open any `http(s)` page and click the toolbar icon, press **Alt+Shift+R**, or right-click and choose **Open page in Responsive Tester**.
2. Pick a device in the right sidebar. Filter by iOS, Android, tablets, foldables, watches, desktops or your custom devices.
3. Use the left sidebar to change the URL, rotate, resize, zoom, enable touch emulation, toggle the frame or the scrollbar, take a screenshot or start recording.
4. Switch to **Compare** to select several devices at once.
5. Close with the red button, the toolbar icon, or **Esc**.

Both sidebars collapse with their toggle buttons and can be resized by dragging their inner edge. On narrow windows they become slide-in sheets.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `R` | Rotate |
| `F` | Fit to screen |
| `C` | Toggle compare mode |
| `S` | Screenshot |
| `P` / `L` | Toggle the devices panel / tools panel |
| `/` | Focus the URL field |
| `+` / `-` | Zoom in / out (also `Ctrl` + mouse wheel) |
| `Esc` | Close the simulator |
| `Alt+Shift+R` | Open or close the simulator (global, from the browser) |

## Settings

Open the gear icon in the left sidebar.

- **Appearance** — System, Light or Dark.
- **Theme color** — Red, Pink, Purple, Deep Purple, Indigo, Blue, Light Blue, Cyan, Teal, Green, Light Green, Lime, Yellow, Amber, Orange, Deep Orange, Brown, Grey, Blue Grey, or any custom colour.
- **Font and text size** — System, Google Sans Flex, Roboto Flex, Roboto, Arial, Inter, Be Vietnam Pro; small, medium or large text.
- **Language** — English or Tiếng Việt.
- **Simulation** — hide the preview scrollbar, send a mobile User-Agent, allow sites that block embedding, sync scrolling and navigation in compare mode, copy screenshots to the clipboard.

## How it works

1. **Overlay.** A background service worker injects a script into the active tab. It builds a full-screen overlay inside a closed Shadow DOM so the host page cannot restyle it.
2. **Device frame.** The page URL is loaded in an iframe sized to the device viewport (screen minus status bar and home indicator). Frames are drawn with CSS only.
3. **Headers.** Per-tab `declarativeNetRequest` session rules set the mobile `User-Agent` / client hints and remove `X-Frame-Options` and CSP frame rules from sub-frame responses so sites can be embedded. The rules are removed when you close the overlay or navigate the tab.
4. **Frame agent.** A content script (`agent.js`, MAIN world) runs only in frames created by the overlay, identified by a per-session token in the frame name. It overrides `navigator`, `screen`, `devicePixelRatio` and touch detection, emulates touch drag, and reports scroll, URL and page colour to the overlay through `postMessage`.
5. **Capture.** Screenshots use `tabs.captureVisibleTab` and are cropped to the device. Recording uses `getDisplayMedia` and a cropped canvas; GIFs are encoded in the page with a built-in LZW encoder.
6. **Theme.** Colours are generated from the seed colour with `@material/material-color-utilities` (Vibrant scheme).

## Permissions and privacy

| Permission | Why it is needed |
| --- | --- |
| `activeTab`, `scripting` | Inject the overlay into the tab you click on. |
| `declarativeNetRequest`, host access (`<all_urls>`) | Set the User-Agent and allow embedding for the simulated frames of that tab only. |
| `storage` | Save settings, custom devices and sidebar widths locally. |
| `contextMenus` | The "Open page in Responsive Tester" entry. |

Nothing is sent to any server. There is no analytics, and all data stays in `chrome.storage.local`.

## Limitations

- Responsive Tester is a **simulator**, not a real device. Confirm critical flows on hardware.
- Pixel ratio and touch are emulated in JavaScript; CSS `hover` / `pointer` media queries follow the real mouse and the `<meta name="viewport">` tag is ignored.
- In compare mode the server-side User-Agent follows the first device.
- Chrome internal pages (`chrome://`, Chrome Web Store) cannot be simulated.
- A site whose own CSP forbids frames (`frame-src`) can refuse to display the preview.
- Recording asks Chrome to share the current tab once per recording.

## Troubleshooting

| Symptom | What to try |
| --- | --- |
| Icon shows `!` | The tab is a restricted page. Open a normal `http(s)` page. |
| "Page did not respond inside the frame" | Reload the extension and the page. If it persists, the site probably blocks framing through its own CSP. |
| Mobile layout not served | Make sure "Send a mobile User-Agent" is on, then reload the preview. |
| Screenshot fails | Zoom out so the whole device is visible, then try again. |
| Recording does not start | Allow screen sharing for the current tab in the Chrome prompt. |

## Project structure

```
responsive-tester/
├── manifest.json        Manifest V3 definition
├── background.js        Injects the overlay, manages header rules, screenshots
├── agent.js             MAIN-world frame agent (device emulation, messaging)
├── css/app.css          Material 3 Expressive styles (loaded into the Shadow DOM)
├── js/
│   ├── app.js           Overlay application
│   ├── template.js      Overlay markup
│   ├── devices.js       Device database and breakpoints
│   ├── i18n.js          English and Vietnamese strings
│   ├── icons.js         Material Symbols (Rounded) sprite
│   └── gif.js           GIF89a encoder
├── lib/theme.js         Bundled material-color-utilities
├── fonts/               Roboto Flex, Roboto, Inter, Be Vietnam Pro, Google Sans Flex
└── icons/               Extension icons
```

## Development

There is no build step for the extension itself. `lib/theme.js` is a bundle of `@material/material-color-utilities`:

```bash
npm i @material/material-color-utilities esbuild
npx esbuild theme-src.js --bundle --minify --format=iife --outfile=lib/theme.js
```

Load the folder as an unpacked extension and use **Reload** on the extension card after each change.

## Credits

**Created by [minhtrong67](https://github.com/minhtrong67), built with the help of Claude (AI by Anthropic).**

Third-party assets: Roboto Flex, Roboto, Inter, Be Vietnam Pro and Google Sans Flex (SIL OFL), Material Symbols (Apache 2.0), material-color-utilities (Apache 2.0).

## License

Released under the [MIT License](LICENSE).
