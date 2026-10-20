// Photo Converter — popup script (author: minhtrong67, built with Claude)

const LANDING_PAGE = "index.html"; // packaged landing page, opened in a new tab (no deploy URL needed)
const MAX_SIDE = 16384;
const MAX_AREA = 268435456; // Chrome canvas area limit

let settings = sanitizeSettings({});
let historyCache = [];
let queue = []; // { id, blob, objectUrl, name, width, height, size, aspect }
let queueSeq = 0;
let singleId = null; // id of the image the single-image fields were last synced to
let hadImages = false;
let busy = false;
const opt = { format: "png", quality: 90 };

const $ = (id) => document.getElementById(id);
const refs = {};
[
  "view-converter", "view-settings", "settingsBtn", "backBtn", "dropZone", "fileInput", "urlInput", "loadUrlBtn",
  "queueCard", "queueList", "queueCount", "clearQueueBtn", "optionsCard", "formatSeg", "qualityRow", "qualitySlider",
  "qualityValue", "resizeGroup", "optResize", "resizeBatchHint", "resizeRow", "widthInput", "heightInput", "lockBtn",
  "filenameRow", "filenameInput", "convertBtn", "convertLabel", "historyCard", "historyList", "exportHistoryBtn",
  "clearHistoryBtn", "swatches", "colorName", "themeSeg", "langSeg", "advanced", "defaultFormatSeg",
  "defaultQualitySlider", "defaultQualityValue", "optShowHistory", "historyLimitSeg", "menuOriginal", "menuPng",
  "menuJpeg", "menuWebp", "optAskFilename", "optShowNotification", "exportSettingsBtn", "importSettingsBtn",
  "importSettingsFile", "resetBtn", "resetLabel", "landingBtn", "versionLabel", "toast"
].forEach((id) => (refs[id] = $(id)));

/* ============ Small helpers ============ */

let toastTimer = null;
function showToast(key, ...args) {
  refs.toast.textContent = i18n.t(key, ...args);
  refs.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2400);
}

function persist() { return store.saveSettings(settings); }

function requestMenuRebuild() {
  try { chrome.runtime.sendMessage({ type: "rebuild-context-menus" }, () => void chrome.runtime.lastError); } catch (_) {}
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

const EXT = { png: "png", jpeg: "jpg", webp: "webp" };
const MIME = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
const FORMAT_LABEL = { original: "menuOriginal", png: "menuPng", jpeg: "menuJpeg", webp: "menuWebp" };
const baseName = (n) => String(n || "image").replace(/\.[a-z0-9]{1,5}$/i, "");
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

function safeFilename(name) {
  return String(name).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "image";
}

function downloadBlobAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Material ripple — one delegated listener for every .ripple element. */
document.addEventListener("pointerdown", (e) => {
  const t = e.target.closest && e.target.closest(".ripple");
  if (!t || t.disabled) return;
  const r = t.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const s = document.createElement("span");
  s.className = "ripple-wave";
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  t.appendChild(s);
  s.addEventListener("animationend", () => s.remove());
});

/** Destructive actions use "tap again to confirm" (native confirm() is unreliable in popups). */
function armDestructive(btn, labelEl, normalKey, onConfirm) {
  let armed = false, timer = null;
  const disarm = () => { armed = false; clearTimeout(timer); btn.classList.remove("is-armed"); labelEl.textContent = i18n.t(normalKey); };
  return () => {
    if (!armed) {
      armed = true;
      btn.classList.add("is-armed");
      labelEl.textContent = i18n.t("confirmAgain");
      timer = setTimeout(disarm, 3000);
    } else { disarm(); onConfirm(); }
  };
}

/** Segmented control helpers. */
function setSeg(seg, value) {
  seg.querySelectorAll(".seg").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === String(value))));
}
function bindSeg(seg, onChange) {
  seg.addEventListener("click", (e) => {
    const b = e.target.closest(".seg");
    if (!b) return;
    setSeg(seg, b.dataset.value);
    onChange(b.dataset.value);
  });
}

function setSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty("--p", `${pct}%`);
}

/* ============ Views ============ */

function showView(name) {
  const settingsOn = name === "settings";
  refs["view-settings"].classList.toggle("is-active", settingsOn);
  refs["view-converter"].classList.toggle("is-active", !settingsOn);
  refs["view-settings"].inert = !settingsOn;
  refs["view-converter"].inert = settingsOn;
  if (settingsOn) refs["view-settings"].querySelector(".scroll").scrollTop = 0;
  (settingsOn ? refs.backBtn : refs.settingsBtn).focus({ preventScroll: true });
}

/* ============ Decoding & queue ============ */

/** Decodes a blob to something drawable. Falls back to <img> for formats createImageBitmap rejects (SVG). */
async function decodeBlob(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    return { src: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch (_) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("decode failed"));
        i.src = url;
      });
      const w = img.naturalWidth || 512, h = img.naturalHeight || 512; // SVG without intrinsic size
      return { src: img, width: w, height: h, close: () => URL.revokeObjectURL(url) };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  }
}

async function addImageBlob(blob, name) {
  if (blob.type && !blob.type.startsWith("image/")) return false; // empty type: still try to decode
  try {
    const d = await decodeBlob(blob);
    const { width, height } = d;
    d.close();
    queue.push({
      id: ++queueSeq, blob, objectUrl: URL.createObjectURL(blob), name: name || "image",
      width, height, size: blob.size, aspect: width / height
    });
    return true;
  } catch (_) { return false; }
}

async function loadImagesFromFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  let ok = 0;
  for (const f of list) if (await addImageBlob(f, f.name)) ok++;
  renderQueue();
  const skipped = list.length - ok;
  if (ok === 0) showToast("toastInvalidFile");
  else if (skipped > 0) showToast("toastSkipped", skipped);
  else showToast(ok > 1 ? "toastImagesLoaded" : "toastLoaded", ok);
}

async function loadImageFromUrl(raw) {
  const url = (raw || "").trim();
  if (!url) return;
  let parsed;
  try { parsed = new URL(url); } catch (_) { return showToast("toastInvalidUrl"); }
  if (!/^(https?:|data:image\/)/i.test(parsed.protocol + (parsed.protocol === "data:" ? parsed.pathname : ""))) return showToast("toastInvalidUrl");
  refs.loadUrlBtn.disabled = true;
  try {
    const resp = await fetch(url, { credentials: "omit" });
    if (!resp.ok) throw new Error("fetch failed");
    const blob = await resp.blob();
    let name = "image";
    try { name = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "image"); } catch (_) {}
    if (await addImageBlob(blob, name)) {
      refs.urlInput.value = "";
      renderQueue();
      showToast("toastLoaded");
    } else showToast("toastInvalidFile");
  } catch (_) {
    showToast("toastLoadFailed");
  } finally { refs.loadUrlBtn.disabled = false; }
}

function resetQueue() {
  queue.forEach((i) => URL.revokeObjectURL(i.objectUrl));
  queue = [];
  singleId = null;
  refs.urlInput.value = "";
  renderQueue();
}

function removeFromQueue(id, li) {
  const img = queue.find((i) => i.id === id);
  if (!img || img.removing) return;
  img.removing = true;
  li.classList.add("leaving");
  setTimeout(() => {
    URL.revokeObjectURL(img.objectUrl);
    queue = queue.filter((i) => i.id !== id);
    renderQueue();
  }, 240);
}

function makeQueueItem(img) {
  const li = document.createElement("li");
  li.className = "queue-item";
  li.dataset.id = img.id;
  li.innerHTML = `
    <img class="queue-item-thumb checker" alt="">
    <div class="info"><span class="name"></span><span class="meta"></span></div>
    <button class="icon-btn ripple" type="button"><svg class="icon icon-sm"><use href="#i-x"/></svg></button>`;
  li.querySelector("img").src = img.objectUrl;
  li.querySelector(".name").textContent = img.name;
  li.querySelector(".meta").textContent = `${img.width}\u00D7${img.height} \u00B7 ${formatBytes(img.size)}`;
  const btn = li.querySelector("button");
  btn.title = i18n.t("removeImage");
  btn.setAttribute("aria-label", i18n.t("removeImage"));
  btn.dataset.i18nTitle = "removeImage";
  btn.addEventListener("click", () => removeFromQueue(img.id, li));
  return li;
}

function renderQueue() {
  const n = queue.length;
  refs.queueCard.classList.toggle("hidden", n === 0);
  refs.optionsCard.classList.toggle("hidden", n === 0);
  refs.queueCount.textContent = i18n.t("queueCount", n);

  // keyed diff: keep existing nodes (no flicker / re-animation), add new, drop stale
  const existing = new Map([...refs.queueList.children].map((li) => [Number(li.dataset.id), li]));
  queue.forEach((img) => {
    if (existing.has(img.id)) existing.delete(img.id);
    else refs.queueList.appendChild(makeQueueItem(img));
  });
  existing.forEach((li) => li.remove());

  if (n > 0 && !hadImages) { // first image → start from the user's defaults
    opt.format = settings.defaultFormat;
    opt.quality = settings.defaultQuality;
  }
  hadImages = n > 0;

  const single = n === 1;
  refs.optResize.closest(".switch").classList.toggle("hidden", !single);
  refs.resizeBatchHint.classList.toggle("hidden", single || n === 0);
  refs.filenameRow.classList.toggle("hidden", !single);
  if (!single) { refs.optResize.checked = false; singleId = null; }
  refs.resizeRow.classList.toggle("is-collapsed", !(single && refs.optResize.checked));

  if (single && singleId !== queue[0].id) { // sync fields only when the single image actually changed
    singleId = queue[0].id;
    refs.widthInput.value = queue[0].width;
    refs.heightInput.value = queue[0].height;
    refs.filenameInput.value = baseName(queue[0].name);
    refs.optResize.checked = false;
    refs.resizeRow.classList.add("is-collapsed");
  }
  syncOptionsUI();
}

function syncOptionsUI() {
  setSeg(refs.formatSeg, opt.format);
  refs.qualitySlider.value = opt.quality;
  refs.qualityValue.textContent = `${opt.quality}%`;
  setSliderFill(refs.qualitySlider);
  refs.qualityRow.classList.toggle("is-collapsed", opt.format === "png");
  updateConvertLabel();
}

function updateConvertLabel() {
  if (busy) return;
  const n = queue.length;
  refs.convertLabel.textContent = n > 1 ? i18n.t("convertAll", n) : i18n.t("convertOne");
  refs.convertBtn.disabled = n === 0;
}

/* ============ Conversion ============ */

const workCanvas = document.createElement("canvas");
const thumbCanvas = document.createElement("canvas");

async function encodeImage(decoded, format, quality, w, h) {
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext("2d");
  if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); } // JPEG has no alpha → avoid black background
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(decoded.src, 0, 0, w, h);
  const mime = MIME[format] || "image/png";
  const blob = await new Promise((res, rej) =>
    workCanvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), mime, mime === "image/png" ? undefined : quality)
  );
  const scale = Math.min(1, 96 / Math.max(w, h));
  thumbCanvas.width = Math.max(1, Math.round(w * scale));
  thumbCanvas.height = Math.max(1, Math.round(h * scale));
  thumbCanvas.getContext("2d").drawImage(workCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return { blob, thumbnail: thumbCanvas.toDataURL("image/webp", 0.7) };
}

function uniqueFilename(base, ext, used) {
  let name = `${base}.${ext}`, n = 2;
  while (used.has(name.toLowerCase())) name = `${base} (${n++}).${ext}`;
  used.add(name.toLowerCase());
  return name;
}

function setBusy(on, label) {
  busy = on;
  refs.convertBtn.classList.toggle("is-busy", on);
  refs.convertBtn.disabled = on;
  if (label) refs.convertLabel.textContent = label;
}

async function convertAndDownload() {
  if (busy) return;
  if (!queue.length) return showToast("toastNoImage");
  const format = opt.format;
  const quality = opt.quality / 100;
  const ext = EXT[format] || "png";
  const items = queue.slice();
  setBusy(true, i18n.t("converting", 1, items.length));
  await nextFrame();

  try {
    if (items.length === 1) {
      const src = items[0];
      let w = src.width, h = src.height;
      if (refs.optResize.checked) {
        w = Math.round(Number(refs.widthInput.value)) || src.width;
        h = Math.round(Number(refs.heightInput.value)) || src.height;
      }
      if (w < 1 || h < 1 || w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_AREA) return showToast("toastTooLarge");
      const d = await decodeBlob(src.blob);
      let out;
      try { out = await encodeImage(d, format, quality, w, h); } finally { d.close(); }
      const filename = `${safeFilename(baseName(refs.filenameInput.value.trim() || src.name))}.${ext}`;
      downloadBlobAs(out.blob, filename);
      historyCache = await store.addToHistory({ source: "popup", originalName: src.name, filename, format, thumbnail: out.thumbnail }, settings.historyLimit);
      renderHistory();
      showToast("toastConverted");
    } else {
      const used = new Set(), entries = [], records = [];
      for (let i = 0; i < items.length; i++) {
        refs.convertLabel.textContent = i18n.t("converting", i + 1, items.length);
        await nextFrame(); // keep the UI responsive between heavy encodes
        const src = items[i];
        if (src.width * src.height > MAX_AREA) continue;
        const d = await decodeBlob(src.blob);
        let out;
        try { out = await encodeImage(d, format, quality, src.width, src.height); } finally { d.close(); }
        const filename = uniqueFilename(safeFilename(baseName(src.name)), ext, used);
        entries.push({ name: filename, bytes: new Uint8Array(await out.blob.arrayBuffer()) });
        records.push({ source: "popup", originalName: src.name, filename, format, thumbnail: out.thumbnail });
      }
      if (!entries.length) return showToast("toastConvertFailed");
      downloadBlobAs(createZip(entries), `photo-converter-${new Date().toISOString().slice(0, 10)}.zip`);
      historyCache = await store.addToHistory(records, settings.historyLimit);
      renderHistory();
      showToast("toastConvertedZip", entries.length);
    }
  } catch (_) {
    showToast("toastConvertFailed");
  } finally {
    setBusy(false);
    updateConvertLabel();
  }
}

/* ============ History ============ */

function renderHistory() {
  const list = refs.historyList;
  list.innerHTML = "";
  if (!historyCache.length) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = i18n.t("historyEmpty");
    list.appendChild(li);
    return;
  }
  const frag = document.createDocumentFragment();
  historyCache.forEach((item) => {
    const li = document.createElement("li");
    const canRedo = item.source === "context-menu" && item.originalUrl;
    if (canRedo) li.classList.add("is-clickable", "ripple");
    const thumb = document.createElement("img");
    thumb.className = "history-thumb checker";
    thumb.alt = "";
    if (item.thumbnail) thumb.src = item.thumbnail;
    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.filename || item.originalName || "image";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${i18n.t(item.source === "context-menu" ? "sourceContextMenu" : "sourcePopup")} \u00B7 ${i18n.t(FORMAT_LABEL[item.format] || "menuPng")}`;
    info.append(name, meta);
    li.append(thumb, info);
    if (canRedo) {
      const b = document.createElement("button");
      b.className = "icon-btn";
      b.type = "button";
      b.title = i18n.t("redoAction");
      b.setAttribute("aria-label", i18n.t("redoAction"));
      b.innerHTML = '<svg class="icon icon-sm"><use href="#i-rotate-ccw"/></svg>';
      li.appendChild(b);
      li.addEventListener("click", () => redoHistoryItem(item));
    }
    frag.appendChild(li);
  });
  list.appendChild(frag);
}

function redoHistoryItem(item) {
  if (item.source !== "context-menu" || !item.originalUrl) return showToast("toastRedoUnavailable");
  showToast("toastRedoing");
  try {
    chrome.runtime.sendMessage({ type: "redo-save", payload: { url: item.originalUrl, format: item.format } }, () => void chrome.runtime.lastError);
  } catch (_) {}
}

/* ============ Settings UI ============ */

function renderSwatches() {
  refs.swatches.innerHTML = "";
  MD_COLORS.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch ripple";
    b.setAttribute("role", "radio");
    b.dataset.hex = c.hex;
    b.style.setProperty("--c", c.hex);
    b.style.setProperty("--on", _onColor(c.hex));
    b.innerHTML = '<svg class="icon"><use href="#i-check"/></svg>';
    b.addEventListener("click", () => {
      settings.color = c.hex;
      themeManager.apply(null, c.hex);
      syncSwatches();
      persist();
    });
    refs.swatches.appendChild(b);
  });
  syncSwatches();
}

function syncSwatches() {
  let name = "";
  refs.swatches.querySelectorAll(".swatch").forEach((b) => {
    const on = b.dataset.hex.toUpperCase() === settings.color.toUpperCase();
    b.setAttribute("aria-checked", String(on));
    const c = MD_COLORS.find((x) => x.hex === b.dataset.hex);
    b.title = b.ariaLabel = c[i18n.lang];
    if (on) name = c[i18n.lang];
  });
  refs.colorName.textContent = name;
  refs.colorName.classList.toggle("hidden", !name);
}

function applySettingsToUI() {
  setSeg(refs.themeSeg, settings.theme);
  setSeg(refs.langSeg, settings.language);
  setSeg(refs.defaultFormatSeg, settings.defaultFormat);
  setSeg(refs.historyLimitSeg, settings.historyLimit);
  refs.defaultQualitySlider.value = settings.defaultQuality;
  refs.defaultQualityValue.textContent = `${settings.defaultQuality}%`;
  setSliderFill(refs.defaultQualitySlider);
  ["optShowHistory:showHistory", "menuOriginal:menuOriginal", "menuPng:menuPng", "menuJpeg:menuJpeg", "menuWebp:menuWebp",
    "optAskFilename:askFilename", "optShowNotification:showNotification"].forEach((p) => {
    const [ref, key] = p.split(":");
    refs[ref].checked = settings[key];
  });
  refs.historyCard.classList.toggle("hidden", !settings.showHistory);
  syncSwatches();
}

function applyLanguage(lang) {
  settings.language = lang;
  i18n.setLang(lang);
  renderQueue();
  renderHistory();
  syncSwatches();
}

function openLanding() {
  const hash = `#theme=${settings.theme}&lang=${settings.language}&color=${encodeURIComponent(settings.color)}`;
  try {
    chrome.tabs.create({ url: chrome.runtime.getURL(LANDING_PAGE) + hash });
  } catch (_) {
    window.open(LANDING_PAGE + hash, "_blank", "noopener");
  }
}

/* ============ Event wiring ============ */

refs.settingsBtn.addEventListener("click", () => showView("settings"));
refs.backBtn.addEventListener("click", () => showView("converter"));
refs.landingBtn.addEventListener("click", openLanding);

// Drop zone (multi-file). Counter avoids flicker when the pointer crosses child nodes.
const dz = refs.dropZone;
dz.addEventListener("click", () => refs.fileInput.click());
dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); refs.fileInput.click(); } });
dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag-over"); });
dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
dz.addEventListener("drop", (e) => {
  e.preventDefault();
  dz.classList.remove("drag-over");
  if (e.dataTransfer.files.length) loadImagesFromFiles(e.dataTransfer.files);
});
// Dropping outside the zone must never navigate the popup to the file.
["dragover", "drop"].forEach((t) => document.addEventListener(t, (e) => e.preventDefault()));
refs.fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) loadImagesFromFiles(e.target.files);
  refs.fileInput.value = "";
});

document.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData ? e.clipboardData.items : [])].filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter(Boolean);
  if (!files.length) return;
  e.preventDefault();
  Promise.all(files.map((f, i) => addImageBlob(f, `pasted-${Date.now()}-${i + 1}.png`))).then((r) => {
    renderQueue();
    if (r.some(Boolean)) showToast("toastPasted");
  });
});

refs.loadUrlBtn.addEventListener("click", () => loadImageFromUrl(refs.urlInput.value));
refs.urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loadImageFromUrl(refs.urlInput.value); });
refs.clearQueueBtn.addEventListener("click", resetQueue);

bindSeg(refs.formatSeg, (v) => { opt.format = v; syncOptionsUI(); });
refs.qualitySlider.addEventListener("input", () => {
  opt.quality = Number(refs.qualitySlider.value);
  refs.qualityValue.textContent = `${opt.quality}%`;
  setSliderFill(refs.qualitySlider);
});
refs.optResize.addEventListener("change", () => refs.resizeRow.classList.toggle("is-collapsed", !refs.optResize.checked));
refs.lockBtn.addEventListener("click", () => {
  const on = refs.lockBtn.getAttribute("aria-pressed") !== "true";
  refs.lockBtn.setAttribute("aria-pressed", String(on));
  if (on && queue.length === 1) refs.heightInput.value = Math.round(Number(refs.widthInput.value) / queue[0].aspect) || queue[0].height;
});
function syncDims(from) {
  if (queue.length !== 1 || refs.lockBtn.getAttribute("aria-pressed") !== "true") return;
  const v = Number(from.value);
  if (!(v > 0)) return;
  if (from === refs.widthInput) refs.heightInput.value = Math.max(1, Math.round(v / queue[0].aspect));
  else refs.widthInput.value = Math.max(1, Math.round(v * queue[0].aspect));
}
refs.widthInput.addEventListener("input", () => syncDims(refs.widthInput));
refs.heightInput.addEventListener("input", () => syncDims(refs.heightInput));
refs.convertBtn.addEventListener("click", convertAndDownload);

refs.exportHistoryBtn.addEventListener("click", async () => {
  const history = await store.loadHistory();
  if (!history.length) return showToast("toastHistoryEmpty");
  const lines = history.map((h) => {
    const src = i18n.t(h.source === "context-menu" ? "sourceContextMenu" : "sourcePopup");
    return `[${new Date(h.ts).toLocaleString()}] ${h.filename || h.originalName || "image"} — ${i18n.t(FORMAT_LABEL[h.format] || "menuPng")} (${src})`;
  });
  downloadBlobAs(new Blob(["\uFEFF" + lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" }), `photo-converter-history-${new Date().toISOString().slice(0, 10)}.txt`);
  showToast("toastHistoryExported");
});
refs.clearHistoryBtn.addEventListener("click", armDestructive(refs.clearHistoryBtn, refs.clearHistoryBtn, "clear", async () => {
  await store.clearHistory();
  historyCache = [];
  renderHistory();
  showToast("toastCleared");
}));

// --- settings controls
bindSeg(refs.themeSeg, (v) => { settings.theme = v; themeManager.apply(v); persist(); });
bindSeg(refs.langSeg, (v) => { applyLanguage(v); persist(); requestMenuRebuild(); });
bindSeg(refs.defaultFormatSeg, (v) => { settings.defaultFormat = v; persist(); });
bindSeg(refs.historyLimitSeg, async (v) => {
  settings.historyLimit = Number(v);
  persist();
  historyCache = (await store.loadHistory()).slice(0, settings.historyLimit);
  await store.saveHistory(historyCache);
  renderHistory();
});
refs.defaultQualitySlider.addEventListener("input", () => {
  refs.defaultQualityValue.textContent = `${refs.defaultQualitySlider.value}%`;
  setSliderFill(refs.defaultQualitySlider);
});
refs.defaultQualitySlider.addEventListener("change", () => { settings.defaultQuality = Number(refs.defaultQualitySlider.value); persist(); });

refs.optShowHistory.addEventListener("change", () => {
  settings.showHistory = refs.optShowHistory.checked;
  refs.historyCard.classList.toggle("hidden", !settings.showHistory);
  persist();
});
[["menuOriginal", true], ["menuPng", true], ["menuJpeg", true], ["menuWebp", true], ["optAskFilename", false, "askFilename"], ["optShowNotification", false, "showNotification"]].forEach(([ref, rebuild, key]) => {
  refs[ref].addEventListener("change", () => {
    settings[key || ref] = refs[ref].checked;
    persist();
    if (rebuild) requestMenuRebuild();
  });
});

refs.exportSettingsBtn.addEventListener("click", async () => {
  const data = await store.exportAll();
  downloadBlobAs(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `photo-converter-settings-${new Date().toISOString().slice(0, 10)}.json`);
  showToast("toastExported");
});
refs.importSettingsBtn.addEventListener("click", () => refs.importSettingsFile.click());
refs.importSettingsFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("too big");
    settings = await store.importAll(JSON.parse(await file.text()));
    i18n.setLang(settings.language);
    themeManager.apply(settings.theme, settings.color);
    applySettingsToUI();
    historyCache = await store.loadHistory();
    renderQueue();
    renderHistory();
    requestMenuRebuild();
    showToast("toastImported");
  } catch (_) {
    showToast("toastImportFailed");
  } finally { refs.importSettingsFile.value = ""; }
});
refs.resetBtn.addEventListener("click", armDestructive(refs.resetBtn, refs.resetLabel, "resetDefault", async () => {
  settings = await store.resetSettings();
  await store.clearHistory();
  i18n.setLang(settings.language);
  themeManager.apply(settings.theme, settings.color);
  applySettingsToUI();
  historyCache = [];
  renderHistory();
  resetQueue();
  requestMenuRebuild();
  showToast("toastReset");
}));

/* ============ Init ============ */
(async function init() {
  settings = await store.loadSettings();
  themeManager.apply(settings.theme, settings.color);
  themeManager.watchSystemChanges();
  i18n.setLang(settings.language);
  refs.versionLabel.textContent = APP_VERSION;
  refs["view-settings"].inert = true;
  renderSwatches();
  applySettingsToUI();
  renderQueue();
  historyCache = await store.loadHistory();
  renderHistory();
  persist(); // saves the auto-detected language on first run

  // Keep history live when background.js finishes a right-click save while the popup is open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[HISTORY_KEY]) {
      historyCache = changes[HISTORY_KEY].newValue || [];
      renderHistory();
    }
  });
})();
