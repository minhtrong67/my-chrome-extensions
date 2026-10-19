/**
 * build.mjs — packs the extension into dist/youtube-grid-v<version>.zip.
 * Zero dependencies: a minimal ZIP writer built on node:zlib.
 * Only files the browser needs are included (no README, scripts, screenshots…).
 * index.html ships too: the popup's "Landing page" button opens it from inside the extension.
 * Run with: npm run build
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { deflateRawSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));

const INCLUDE = ["manifest.json", "popup.html", "options.html", "index.html", "_locales", "css", "fonts", "icons", "js"];
const SKIP = new Set(); // nothing to skip: the landing page uses icons/icon.svg

function walk(path) {
  const st = statSync(path);
  if (st.isFile()) return [path];
  return readdirSync(path).flatMap((n) => walk(join(path, n)));
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const files = INCLUDE.flatMap((p) => walk(join(root, p))).filter((f) => !SKIP.has(f.split(sep).pop()));
const parts = [];
const central = [];
let offset = 0;
const dt = new Date();
const dosTime = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1);
const dosDate = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();

for (const file of files) {
  const name = Buffer.from(relative(root, file).split(sep).join("/"));
  const data = readFileSync(file);
  const comp = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(8, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  parts.push(local, name, comp);

  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8);
  cd.writeUInt16LE(8, 10); cd.writeUInt16LE(dosTime, 12); cd.writeUInt16LE(dosDate, 14);
  cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(offset, 42);
  central.push(cd, name);
  offset += local.length + name.length + comp.length;
}

const cdBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16);

mkdirSync(join(root, "dist"), { recursive: true });
const out = join(root, "dist", `youtube-grid-v${manifest.version}.zip`);
writeFileSync(out, Buffer.concat([...parts, cdBuf, end]));
console.log(`${files.length} files -> ${relative(root, out)} (${(statSync(out).size / 1024).toFixed(0)} KB)`);
