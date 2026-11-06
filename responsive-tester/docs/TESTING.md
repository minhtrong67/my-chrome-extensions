# Testing

## Automated
```bash
npm install                                  # installs puppeteer-core
npm test                                     # unit tests (data, i18n parity, manifest, GIF encoder)
CHROME_PATH=/path/to/chrome npm run test:e2e # 21 end-to-end checks in a real Chrome
```
The end-to-end suite mocks only the `chrome.*` APIs. The overlay, the frame agent, rendering, iframe sandboxing,
touch emulation, screenshots (including full page stitching) and the settings UI run for real against a local test server.

It does **not** cover Chrome's `declarativeNetRequest` header rules, `tabs.captureVisibleTab` and `getDisplayMedia`
recording, because they need a real extension context. Use the manual checklist below for those.

## Manual checklist (real Chrome, extension loaded)
Open each page, start the simulator, then check: it appears, mobile layout is served, scrolling/links work, screenshot saves.

| # | Kind of page | Example to try | Look for |
| --- | --- | --- | --- |
| 1 | News site (heavy ads) | any large news site | loads, spinner disappears, desktop device works |
| 2 | Site that sends `X-Frame-Options: DENY` | github.com | shows after the header rule is applied |
| 3 | Strict CSP | any bank / SaaS login page | shows, or the warning with "Open in window" appears |
| 4 | Single-page app | a React / Vue demo | URL bar follows client-side navigation |
| 5 | Frame-busting page | an old forum | host tab is not redirected |
| 6 | Logged-in page | your own dashboard | session cookies work in the frame |
| 7 | Page with no `<meta viewport>` | an old static site | renders at 980px, readout says "Layout 980" |
| 8 | Page with hover-only menus | a mega-menu site | touch emulation shows the mobile menu |
| 9 | Long page | any article | full-page screenshot, scroll-to-top, recording GIF/WebM/MP4 |
| 10 | `localhost` dev server | your project | works; QR note warns it is a local address |

Also check: pop-out window keeps the mobile User-Agent, Esc during recording, compare mode sync, light/dark theme, Vietnamese UI.
