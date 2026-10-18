// Renders the extension icons (16/32/48/128) from vector source in Material purple #9C27B0.
// Run: npm run build:icons
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const PURPLE = "#9C27B0";

// Full-detail mark: rounded tile + capture-frame corners + lens + annotation spark.
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#AB47BC"/><stop offset="1" stop-color="${PURPLE}"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="30" fill="url(#g)"/>
  <g fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M38 24H30a10 10 0 0 0-10 10v8"/>
    <path d="M90 24h8a10 10 0 0 1 10 10v8"/>
    <path d="M38 104h-8a10 10 0 0 1-10-10v-8"/>
    <path d="M90 104h8a10 10 0 0 0 10-10v-8"/>
  </g>
  <circle cx="64" cy="64" r="21" fill="#fff"/>
  <circle cx="64" cy="64" r="10" fill="${PURPLE}"/>
</svg>`;

// Simplified for tiny sizes: thicker strokes, no inner detail that would blur away.
const small = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="30" fill="${PURPLE}"/>
  <g fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 24H30a10 10 0 0 0-10 10v10"/>
    <path d="M88 24h10a10 10 0 0 1 10 10v10"/>
    <path d="M40 104H30a10 10 0 0 1-10-10V84"/>
    <path d="M88 104h10a10 10 0 0 0 10-10V84"/>
  </g>
  <circle cx="64" cy="64" r="22" fill="#fff"/>
</svg>`;

mkdirSync("icons", { recursive: true });
writeFileSync("icons/icon.svg", full);
for (const size of [16, 32, 48, 128]) {
  const src = size <= 32 ? small : full;
  await sharp(Buffer.from(src), { density: Math.max(72, (size / 128) * 72 * 8) })
    .resize(size, size).png({ compressionLevel: 9 }).toFile(`icons/icon${size}.png`);
}
// Larger raster used for social previews / landing page.
await sharp(Buffer.from(full), { density: 600 }).resize(512, 512).png().toFile("icons/icon512.png");
console.log("icons written");
