// Builds the installable package (runtime files only — no docs or dev tooling).
// The landing page (index.html) and the screenshots it shows ARE included, because the
// Settings → "Open landing page" button opens that local copy in a new tab.
// Output: dist/SmartShot-v<version>.zip and a copy at download/SmartShot-Setup.zip (linked by index.html).
// Run: npm run pack
import archiver from "archiver";
import { createWriteStream, mkdirSync, copyFileSync, readFileSync, readdirSync } from "node:fs";

const { version } = JSON.parse(readFileSync("manifest.json", "utf8"));
mkdirSync("dist", { recursive: true });
mkdirSync("download", { recursive: true });
const out = `dist/SmartShot-v${version}.zip`;

const zip = archiver("zip", { zlib: { level: 9 } });
const stream = createWriteStream(out);
zip.pipe(stream);

for (const f of ["manifest.json", "popup.html", "editor.html", "offscreen.html", "index.html", "LICENSE"]) zip.file(f, { name: f });
for (const d of ["css", "js", "_locales"]) zip.directory(d, d);
for (const f of readdirSync("icons")) if (f !== "icon512.png") zip.file(`icons/${f}`, { name: `icons/${f}` });
for (const f of readdirSync("screenshots")) if (/^image\d+\.png$/.test(f)) zip.file(`screenshots/${f}`, { name: `screenshots/${f}` });

await zip.finalize();
await new Promise((r) => stream.on("close", r));
copyFileSync(out, "download/SmartShot-Setup.zip");
console.log(`${out} (${(zip.pointer() / 1024).toFixed(0)} KB) → download/SmartShot-Setup.zip`);
