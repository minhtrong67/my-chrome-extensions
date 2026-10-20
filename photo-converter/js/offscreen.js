// Photo Converter — offscreen document (author: minhtrong67, built with Claude)
// Hidden extension page with DOM/canvas access. background.js sends it an image URL;
// it fetches, decodes, re-encodes and returns a blob: URL (no base64 round-trip = faster, lighter).

const MIME_BY_FORMAT = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
const EXT_BY_FORMAT = { png: "png", jpeg: "jpg", webp: "webp" };
const MAX_AREA = 268435456;

const work = new OffscreenCanvas(1, 1);
const thumb = new OffscreenCanvas(1, 1);

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("FileReader failed"));
    r.readAsDataURL(blob);
  });
}

function extFromMime(mime) {
  if (!mime) return "img";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("svg")) return "svg";
  if (mime.includes("bmp")) return "bmp";
  if (mime.includes("avif")) return "avif";
  return "img";
}

async function makeThumbnail(bitmap) {
  const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
  thumb.width = Math.max(1, Math.round(bitmap.width * scale));
  thumb.height = Math.max(1, Math.round(bitmap.height * scale));
  thumb.getContext("2d").drawImage(bitmap, 0, 0, thumb.width, thumb.height);
  return blobToDataURL(await thumb.convertToBlob({ type: "image/webp", quality: 0.7 }));
}

// blob: URLs are revoked after a while so nothing leaks (the download has long started by then).
function publish(blob) {
  const url = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return url;
}

async function convertImage({ url, format, quality }) {
  const resp = await fetch(url, { credentials: "omit" });
  if (!resp.ok) throw new Error(`Fetch failed (${resp.status})`);
  const source = await resp.blob();

  // "original": no re-encoding — download the exact bytes that were fetched.
  if (format === "original") {
    const bmp = await createImageBitmap(source).catch(() => null);
    const thumbnail = bmp ? await makeThumbnail(bmp) : null;
    if (bmp) bmp.close();
    return { blobUrl: publish(source), thumbnail, ext: extFromMime(source.type) };
  }

  const bitmap = await createImageBitmap(source);
  try {
    if (bitmap.width * bitmap.height > MAX_AREA) throw new Error("Image too large");
    work.width = bitmap.width;
    work.height = bitmap.height;
    const ctx = work.getContext("2d");
    if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, work.width, work.height); } // no black background for transparent images
    else ctx.clearRect(0, 0, work.width, work.height);
    ctx.drawImage(bitmap, 0, 0);

    const type = MIME_BY_FORMAT[format] || "image/png";
    const q = Math.min(Math.max(Number(quality) || 92, 1), 100) / 100;
    const out = await work.convertToBlob(type === "image/png" ? { type } : { type, quality: q });
    return { blobUrl: publish(out), thumbnail: await makeThumbnail(bitmap), ext: EXT_BY_FORMAT[format] || "img" };
  } finally {
    bitmap.close();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.target !== "offscreen" || message.type !== "convert-image") return false;
  convertImage(message.payload)
    .then((r) => sendResponse({ ok: true, ...r }))
    .catch((e) => sendResponse({ ok: false, error: e && e.message ? e.message : String(e) }));
  return true;
});
