// Save Image As Type - service worker (Manifest V3)

const FORMATS = {
  png: { label: "PNG", mime: "image/png", ext: "png", needsBg: false },
  jpg: { label: "JPG", mime: "image/jpeg", ext: "jpg", needsBg: true },
  webp: { label: "WebP", mime: "image/webp", ext: "webp", needsBg: false },
  bmp: { label: "BMP", mime: "image/bmp", ext: "bmp", needsBg: true },
};

const DEFAULTS = {
  defaultFormat: "png",
  quality: 92, // áp dụng cho JPG / WebP
  background: "#ffffff", // nền thay cho vùng trong suốt (JPG / BMP)
  saveAs: false, // hỏi nơi lưu mỗi lần
  menuMode: "quick", // "quick": một chạm lưu định dạng mặc định | "choose": submenu chọn định dạng
};

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  const s = { ...DEFAULTS, ...stored };
  if (!FORMATS[s.defaultFormat]) s.defaultFormat = "png";
  return s;
}

/* ---------------------------- Context menu ---------------------------- */

async function buildMenus() {
  const s = await getSettings();
  await chrome.contextMenus.removeAll();

  // Chế độ một chạm: một mục duy nhất, bấm là lưu ngay theo định dạng mặc định
  if (s.menuMode !== "choose") {
    chrome.contextMenus.create({
      id: `ssat:${s.defaultFormat}`,
      title: `Lưu ảnh dưới dạng ${FORMATS[s.defaultFormat].label}`,
      contexts: ["image"],
    });
    return;
  }

  chrome.contextMenus.create({
    id: "ssat-root",
    title: "Lưu ảnh dưới dạng…",
    contexts: ["image"],
  });

  for (const [key, f] of Object.entries(FORMATS)) {
    chrome.contextMenus.create({
      id: `ssat:${key}`,
      parentId: "ssat-root",
      title: key === s.defaultFormat ? `${f.label}  (mặc định)` : f.label,
      contexts: ["image"],
    });
  }
}

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.defaultFormat || changes.menuMode)) buildMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (typeof info.menuItemId !== "string" || !info.menuItemId.startsWith("ssat:")) return;
  const key = info.menuItemId.slice(5);
  if (!FORMATS[key] || !info.srcUrl) return;
  saveImageAs(info, tab, key);
});

/* ------------------------------ Core flow ------------------------------ */

async function saveImageAs(info, tab, key) {
  const fmt = FORMATS[key];
  const s = await getSettings();
  const src = info.srcUrl;

  try {
    let dataUrl;
    try {
      dataUrl = await convertInWorker(src, key, s);
    } catch (_) {
      // blob:, SVG, hoặc ảnh bị chặn CORS -> chuyển đổi trong chính trang web
      dataUrl = await convertInPage(tab, info.frameId, src, key, s);
    }

    await chrome.downloads.download({
      url: dataUrl,
      filename: makeFilename(src, fmt.ext),
      saveAs: !!s.saveAs,
      conflictAction: "uniquify",
    });
  } catch (err) {
    console.error("[Save Image As Type]", err);
    flashError();
  }
}

function flashError() {
  chrome.action.setBadgeBackgroundColor({ color: "#c50f1f" });
  chrome.action.setBadgeText({ text: "!" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3500);
}

/* ------------------------- Chuyển đổi trong worker ------------------------- */

async function convertInWorker(url, key, s) {
  if (url.startsWith("blob:")) throw new Error("blob url");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (blob.type === "image/svg+xml") throw new Error("svg needs page context");

  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (FORMATS[key].needsBg) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  if (key === "bmp") {
    const bytes = encodeBMP(ctx.getImageData(0, 0, width, height));
    return bytesToDataUrl(bytes, "image/bmp");
  }

  const out = await canvas.convertToBlob({
    type: FORMATS[key].mime,
    quality: s.quality / 100,
  });
  return bytesToDataUrl(new Uint8Array(await out.arrayBuffer()), out.type);
}

/* ------------------------ Chuyển đổi trong trang web ------------------------ */

async function convertInPage(tab, frameId, url, key, s) {
  if (!tab || tab.id == null) throw new Error("no tab");

  // BMP: trang xuất PNG (đã đổ nền), worker mã hoá lại thành BMP
  const pageMime = key === "bmp" ? "image/png" : FORMATS[key].mime;

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [frameId ?? 0] },
    func: async (src, mime, quality, bg, fillBg) => {
      const img = new Image();
      let objectUrl = null;
      try {
        const blob = await (await fetch(src)).blob();
        objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
      } catch (_) {
        img.crossOrigin = "anonymous";
        img.src = src;
      }
      await img.decode();

      const w = img.naturalWidth || 1024;
      const h = img.naturalHeight || 1024;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (fillBg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return canvas.toDataURL(mime, quality);
    },
    args: [url, pageMime, s.quality / 100, s.background, FORMATS[key].needsBg],
  });

  if (!result || !result.result) throw new Error("page conversion failed");
  const dataUrl = result.result;

  if (key === "bmp") {
    return convertInWorker(dataUrl, "bmp", s);
  }
  return dataUrl;
}

/* -------------------------------- Tiện ích -------------------------------- */

function makeFilename(url, ext) {
  let name = "image";
  try {
    if (!url.startsWith("data:") && !url.startsWith("blob:")) {
      const u = new URL(url);
      const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
      name = last.replace(/\.[a-z0-9]{1,5}$/i, "") || "image";
    }
  } catch (_) {}
  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 100) || "image";
  return `${name}.${ext}`;
}

function bytesToDataUrl(bytes, mime) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

// BMP 24-bit, bottom-up (ảnh đã được đổ nền nên không cần kênh alpha)
function encodeBMP(imageData) {
  const { width, height, data } = imageData;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const fileSize = 54 + pixelBytes;
  const buf = new ArrayBuffer(fileSize);
  const dv = new DataView(buf);
  const out = new Uint8Array(buf);

  dv.setUint8(0, 0x42); // 'B'
  dv.setUint8(1, 0x4d); // 'M'
  dv.setUint32(2, fileSize, true);
  dv.setUint32(10, 54, true); // offset dữ liệu pixel
  dv.setUint32(14, 40, true); // BITMAPINFOHEADER
  dv.setInt32(18, width, true);
  dv.setInt32(22, height, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  dv.setUint32(34, pixelBytes, true);
  dv.setInt32(38, 2835, true);
  dv.setInt32(42, 2835, true);

  for (let y = 0; y < height; y++) {
    let o = 54 + (height - 1 - y) * rowSize;
    let i = y * width * 4;
    for (let x = 0; x < width; x++, i += 4) {
      out[o++] = data[i + 2]; // B
      out[o++] = data[i + 1]; // G
      out[o++] = data[i]; // R
    }
  }
  return out;
}
