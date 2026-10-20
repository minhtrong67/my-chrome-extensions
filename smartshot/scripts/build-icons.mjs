// Renders the extension icons (16/32/48/128 + 512) from vector source in Material Light Blue 500 (#03A9F4).
// Run: npm run build:icons
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const BRAND = "#03A9F4";

// Full-detail mark (Material keyline: glyph inside the 96px safe zone of a 128px rounded tile):
// capture-frame corners + lens.
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${BRAND}"/>
  <g fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M44 28H36a8 8 0 0 0-8 8v8"/>
    <path d="M84 28h8a8 8 0 0 1 8 8v8"/>
    <path d="M44 100h-8a8 8 0 0 1-8-8v-8"/>
    <path d="M84 100h8a8 8 0 0 0 8-8v-8"/>
  </g>
  <circle cx="64" cy="64" r="20" fill="#fff"/>
  <circle cx="64" cy="64" r="9" fill="${BRAND}"/>
</svg>`;

// Simplified for tiny sizes: thicker strokes, no inner detail that would blur away.
const small = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${BRAND}"/>
  <g fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
    <path d="M46 28H36a8 8 0 0 0-8 8v10"/>
    <path d="M82 28h10a8 8 0 0 1 8 8v10"/>
    <path d="M46 100H36a8 8 0 0 1-8-8V82"/>
    <path d="M82 100h10a8 8 0 0 0 8-8V82"/>
  </g>
  <circle cx="64" cy="64" r="21" fill="#fff"/>
</svg>`;

mkdirSync("icons", { recursive: true });
writeFileSync("icons/icon.svg", full);
for (const size of [16, 32, 48, 128]) {
  const src = size <= 32 ? small : full;
  await sharp(Buffer.from(src), { density: Math.max(72, (size / 128) * 72 * 8) })
    .resize(size, size).png({ compressionLevel: 9 }).toFile(`icons/icon${size}.png`);
}
// Larger raster used for the Web Store listing / social previews.
await sharp(Buffer.from(full), { density: 600 }).resize(512, 512).png().toFile("icons/icon512.png");
console.log("icons written");
