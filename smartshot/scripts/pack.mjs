// Builds the installable package (only runtime files — no landing page, docs or dev tooling).
// Output: dist/SmartShot-v<version>.zip and a copy at download/SmartShot-Setup.zip (linked by index.html).
// Run: npm run pack
import archiver from "archiver";
import { createWriteStream, mkdirSync, copyFileSync, readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("manifest.json", "utf8"));
mkdirSync("dist", { recursive: true });
mkdirSync("download", { recursive: true });
const out = `dist/SmartShot-v${version}.zip`;

const zip = archiver("zip", { zlib: { level: 9 } });
const stream = createWriteStream(out);
zip.pipe(stream);

for (const f of ["manifest.json", "popup.html", "editor.html", "offscreen.html"]) zip.file(f, { name: f });
for (const d of ["css", "js", "fonts", "_locales"]) zip.directory(d, d);
for (const f of ["icon.svg", "icon16.png", "icon32.png", "icon48.png", "icon128.png"]) zip.file(`icons/${f}`, { name: `icons/${f}` });

await zip.finalize();
await new Promise((r) => stream.on("close", r));
copyFileSync(out, "download/SmartShot-Setup.zip");
console.log(`${out} (${(zip.pointer() / 1024).toFixed(0)} KB) → download/SmartShot-Setup.zip`);
