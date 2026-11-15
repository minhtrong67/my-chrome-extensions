# Discord Image Downloader

Chrome extension (MV3) adds **Download all images** to Discord's message context menu.

## Install
1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. Open (or reload) Discord in the browser: discord.com, ptb.discord.com, canary.discord.com.

## Use
Right-click a message that contains images (or use its ••• button) → **Download all images**.
Files go to `Downloads/Discord/<user>/<date>_<index>_<name>` by default (change in Settings: click the toolbar icon).

## Notes
- Original files are requested by removing Discord's resize params (`width`, `height`, `format`, `quality`).
- Menu detection uses Discord's stable element ids (`message-actions`, `message-actions-copy-link`, `chat-messages-*`, `message-accessories-*`) rather than hashed class names.
- Author: minhtrong67 · built with the help of Claude AI.
