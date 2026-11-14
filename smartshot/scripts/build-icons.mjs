// Renders the extension icons (16/32/48/128 + 512) from vector source in a Microsoft Fluent style:
// a soft brand-blue gradient tile, a layered "photo" card with depth, and capture-frame corners.
// Run: npm run build:icons
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

// Full-detail mark (>= 48px): gradient tile + layered card + capture corners.
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="tile" x1="14" y1="6" x2="114" y2="124" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4FB0F7"/>
      <stop offset="0.55" stop-color="#1977D4"/>
      <stop offset="1" stop-color="#0B4F99"/>
    </linearGradient>
    <linearGradient id="rim" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".18"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="40" x2="0" y2="92" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#DCEBFA"/>
    </linearGradient>
    <linearGradient id="hill" x1="40" y1="60" x2="88" y2="92" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3A97EC"/>
      <stop offset="1" stop-color="#0F5FB8"/>
    </linearGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#032a57" flood-opacity=".38"/>
    </filter>
    <clipPath id="cardClip"><rect x="36" y="42" width="56" height="44" rx="8"/></clipPath>
  </defs>
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#tile)"/>
  <rect x="4.75" y="4.75" width="118.5" height="118.5" rx="27.25" fill="none" stroke="url(#rim)" stroke-width="1.5"/>
  <g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".95">
    <path d="M44 26H36a10 10 0 0 0-10 10v8"/>
    <path d="M84 26h8a10 10 0 0 1 10 10v8"/>
    <path d="M44 102h-8a10 10 0 0 1-10-10v-8"/>
    <path d="M84 102h8a10 10 0 0 0 10-10v-8"/>
  </g>
  <g filter="url(#drop)">
    <rect x="36" y="42" width="56" height="44" rx="8" fill="url(#card)"/>
  </g>
  <g clip-path="url(#cardClip)">
    <circle cx="76" cy="55" r="5.5" fill="#F9B233"/>
    <path d="M30 90 54 62a3 3 0 0 1 4.6 0L72 78l6-6a3 3 0 0 1 4.4 0L98 90z" fill="url(#hill)"/>
  </g>
</svg>`;

// Simplified for tiny sizes: thicker corners, one solid card, no fine detail that would blur away.
const small = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="tile" x1="14" y1="6" x2="114" y2="124" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3FA5F5"/>
      <stop offset="1" stop-color="#0F62BF"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="124" height="124" rx="30" fill="url(#tile)"/>
  <g fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">
    <path d="M46 24H34a10 10 0 0 0-10 10v12"/>
    <path d="M82 24h12a10 10 0 0 1 10 10v12"/>
    <path d="M46 104H34a10 10 0 0 1-10-10V82"/>
    <path d="M82 104h12a10 10 0 0 0 10-10V82"/>
  </g>
  <rect x="42" y="44" width="44" height="40" rx="8" fill="#fff"/>
  <circle cx="72" cy="56" r="5" fill="#F9B233"/>
  <path d="M42 84 58 64l10 12 6-6 12 14z" fill="#1977D4"/>
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
