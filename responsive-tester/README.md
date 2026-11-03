# Responsive Tester

Chrome extension (Manifest V3) for testing responsive layouts on 80+ devices, designed with Material 3 Expressive.

## Install
1. Open `chrome://extensions`, turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Open any page and click the toolbar icon (or press **Alt+Shift+R**, or right-click → *Open page in Responsive Tester*).
   The simulator opens right on the tab you are viewing; click the icon again, the red close button, or press **Esc** to leave.
   The device sidebar on the right can be collapsed with its toggle button.

## Features
- 79 preset devices: iPhone, Pixel, Galaxy, foldables, iPad, Android tablets, watches, laptops, desktops
- Responsive mode with drag handles, W×H fields and Tailwind-style breakpoint chips (320 to 1536)
- Custom devices (saved in your browser), rotate, zoom (fit / Ctrl+wheel), device frame with notch / island / punch-hole
- Compare up to 6 devices side by side with synced scroll and navigation
- Touch emulation (drag to scroll with inertia, touch events), hidden scrollbars, mobile User-Agent and client hints
- PNG screenshots with transparent rounded corners, recording to GIF / WebM / MP4 (up to 60 s)
- Dynamic Material 3 colour from any seed colour, light / dark, English and Vietnamese
- Keyboard: R rotate, F fit, C compare, S screenshot, P panel, / URL, +/− zoom

## How it works
A full-screen overlay (Shadow DOM) is injected into the current tab. The page is loaded again in an iframe with the exact
device viewport, so media queries behave like on a phone, and because the frame has the same origin as the tab, your login session works.
Per-tab `declarativeNetRequest` rules set the mobile User-Agent and remove `X-Frame-Options` / CSP frame rules; they are removed
when you close the overlay or navigate the tab. `agent.js` only activates inside frames created by the overlay (they carry a per-session token).

## Limits
Pixel ratio and touch are emulated in JavaScript only; CSS `hover` / `pointer` media queries follow the real mouse;
`<meta name="viewport">` is ignored; in compare mode the server-side User-Agent follows the first device;
recording asks Chrome to share this tab once. Chrome internal pages (chrome://, Web Store) cannot be simulated, and a site whose own CSP forbids frames (`frame-src`) may refuse to show the preview.

Third-party assets: Roboto Flex (OFL), Material Symbols (Apache 2.0), material-color-utilities (Apache 2.0).
