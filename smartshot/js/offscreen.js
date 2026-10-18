// SmartShot — offscreen document script
// Hidden extension page with full DOM/canvas access. The service worker delegates all image
// work here (crop / stitch / encode). Results are stored as Blobs in IndexedDB and only a
// small descriptor travels over runtime messaging — large data URLs would hit the message size cap.

// (storage.js — for capturesDb — is loaded via <script> in offscreen.html)

const MAX_CANVAS_DIM = 32767;            // Chrome's hard limit per side
const MAX_CANVAS_AREA = 268435456;       // ...and total pixel count
const THUMB_SIDE = 160;
const BLOB_URL_TTL = 5 * 60 * 1000;

const mimeFor = (format) => (format === "jpeg" ? "image/jpeg" : "image/png");

async function decode(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

function canvasToBlob(canvas, format, quality) {
  const mime = mimeFor(format);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), mime,
      mime === "image/jpeg" ? quality : undefined);
  });
}

function makeThumbnail(source, w, h) {
  const scale = Math.min(1, THUMB_SIDE / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = tw; c.height = th;
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.fillStyle = "#fff";
  g.fillRect(0, 0, tw, th);
  g.drawImage(source, 0, 0, tw, th);
  return c.toDataURL("image/jpeg", 0.72);
}

async function finalize(canvas, format, quality) {
  const blob = await canvasToBlob(canvas, format, quality);
  const id = `cap-${Date.now()}`;
  await capturesDb.put(id, { blob, format, width: canvas.width, height: canvas.height });
  const thumbnail = makeThumbnail(canvas, canvas.width, canvas.height);
  return { id, width: canvas.width, height: canvas.height, thumbnail };
}

function newCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

/* ---- Plain screenshot (visible area) ---- */
async function encodeImage({ dataUrl, format, quality }) {
  const bmp = await decode(dataUrl);
  const canvas = newCanvas(bmp.width, bmp.height);
  const g = canvas.getContext("2d");
  if (format === "jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, canvas.width, canvas.height); }
  g.drawImage(bmp, 0, 0);
  bmp.close();
  return finalize(canvas, format, quality);
}

/* ---- Crop to a CSS-pixel rect. Scale comes from the real bitmap, so page zoom can't skew it. ---- */
async function cropImage({ dataUrl, rect, viewportWidth, format, quality }) {
  const bmp = await decode(dataUrl);
  const scale = bmp.width / viewportWidth;
  const sx = Math.max(0, Math.round(rect.x * scale));
  const sy = Math.max(0, Math.round(rect.y * scale));
  const sw = Math.max(1, Math.min(bmp.width - sx, Math.round(rect.width * scale)));
  const sh = Math.max(1, Math.min(bmp.height - sy, Math.round(rect.height * scale)));
  const canvas = newCanvas(sw, sh);
  const g = canvas.getContext("2d");
  if (format === "jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, sw, sh); }
  g.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
  bmp.close();
  return finalize(canvas, format, quality);
}

/* ---- Incremental stitching: pieces are drawn as they arrive, so memory stays flat ---- */
let stitch = null;

async function stitchBegin({ totalWidth, totalHeight }) {
  stitch = { totalWidth, totalHeight, canvas: null, ctx: null, scale: 1 };
  return {};
}

async function stitchAdd({ dataUrl, y, viewportWidth }) {
  if (!stitch) throw new Error("Stitch session not started");
  const bmp = await decode(dataUrl);
  let maxCssHeight;

  if (!stitch.canvas) {
    const scale = bmp.width / viewportWidth;
    const width = bmp.width;
    let height = Math.round(stitch.totalHeight * scale);
    const maxH = Math.min(MAX_CANVAS_DIM, Math.floor(MAX_CANVAS_AREA / width));
    if (height > maxH) {
      height = maxH;
      maxCssHeight = Math.floor(maxH / scale);
    }
    stitch.scale = scale;
    stitch.canvas = newCanvas(width, height);
    stitch.ctx = stitch.canvas.getContext("2d");
    stitch.ctx.fillStyle = "#fff";
    stitch.ctx.fillRect(0, 0, width, height);
  }

  stitch.ctx.drawImage(bmp, 0, Math.round(y * stitch.scale));
  bmp.close();
  return maxCssHeight ? { maxCssHeight } : {};
}

async function stitchEnd({ format, quality }) {
  if (!stitch || !stitch.canvas) throw new Error("Nothing to stitch");
  const { canvas } = stitch;
  stitch = null;
  return finalize(canvas, format, quality);
}

/* ---- Hand-off helpers ---- */
const liveUrls = new Map();

async function blobUrl({ id }) {
  const rec = await capturesDb.get(id);
  if (!rec) throw new Error("Capture not found");
  const url = URL.createObjectURL(rec.blob);
  const timer = setTimeout(() => { URL.revokeObjectURL(url); liveUrls.delete(url); }, BLOB_URL_TTL);
  liveUrls.set(url, timer);
  return { url };
}

async function pngDataUrl({ id }) {
  const rec = await capturesDb.get(id);
  if (!rec) throw new Error("Capture not found");
  let blob = rec.blob;
  if (blob.type !== "image/png") {
    const bmp = await createImageBitmap(blob);
    const c = newCanvas(bmp.width, bmp.height);
    c.getContext("2d").drawImage(bmp, 0, 0);
    bmp.close();
    blob = await canvasToBlob(c, "png");
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  return { dataUrl };
}

async function deleteCapture({ id }) {
  await capturesDb.delete(id);
  return {};
}

const HANDLERS = {
  "encode-image": encodeImage,
  "crop-image": cropImage,
  "stitch-begin": stitchBegin,
  "stitch-add": stitchAdd,
  "stitch-end": stitchEnd,
  "blob-url": blobUrl,
  "png-data-url": pngDataUrl,
  "delete-capture": deleteCapture
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.target !== "offscreen") return false;
  const handler = HANDLERS[message.type];
  if (!handler) return false;

  handler(message.payload || {})
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((err) => sendResponse({ ok: false, error: err && err.message ? err.message : String(err) }));
  return true;
});
