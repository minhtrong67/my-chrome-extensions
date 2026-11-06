# Privacy policy — Responsive Tester

_Last updated: 2026-11-05_

Responsive Tester runs entirely in your browser.

- **No data leaves your device.** The extension has no server, no analytics, no tracking and makes no network requests of its own.
- **What is stored locally** (`chrome.storage.local`): your settings, custom devices, favourites and recent devices, saved compare sets, sidebar widths, and the last device used per website origin. You can clear it by removing the extension.
- **Pages you test** are loaded in an iframe inside the page you opened the tool on. Their content is never copied, logged or transmitted by the extension.
- **Screenshots and recordings** are created in your browser and saved to your Downloads folder (or the clipboard if you choose). Nothing is uploaded.
- **Request headers.** While the simulator is open on a tab, the extension changes the `User-Agent` / client-hint request headers and removes `X-Frame-Options` / `Content-Security-Policy` response headers for sub-frames of that tab only. The rules are deleted when you close the simulator, navigate the tab, or close it.
- **QR codes** are generated locally; the URL is not sent anywhere.

Contact: https://github.com/minhtrong67
