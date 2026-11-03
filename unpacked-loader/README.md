# Unpacked Loader
Chrome blocks extensions from installing other extensions, so this tool offers two routes:
1. **Launch script** (Chromium / Chrome for Testing): loads every selected extension at once via `--load-extension`. Official Chrome 137+ ignores this flag.
2. **Guided load** (regular Chrome): copy each path, click *Load unpacked*, paste; progress is ticked automatically.

Plus a **Loaded** tab to reload / enable / disable all unpacked extensions in one click.

Install: `chrome://extensions` → Developer mode → Load unpacked → select this folder. Click the toolbar icon to open the app.
Tip: type the absolute folder path in the app (browsers cannot read it) so full paths can be generated.
