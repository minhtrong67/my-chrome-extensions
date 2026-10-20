// popup.js — scan the active tab, show a selectable gallery, hand downloads to the service worker.

let t = makeT("en");
let settings = {};
let images = [];               // everything found on the page (allowed formats only)
let visible = [];              // indices into `images` after filter / logo rules
const selected = new Set();    // indices into `images`
let activeFilter = "all";
let showLogos = false;         // session-only override of "auto-exclude logos"
let hiddenLogos = 0;
let tabId = null;
let busy = false;
let currentBatch = null;
let lastIndex = null;          // anchor for shift-click range selection
const tileEls = new Map();
let restricted = false;        // the active tab can't be scanned (chrome://, web store, …)
let settingsFrame = null;      // embedded options.html (created on first open)
let settingsOpen = false;
let needsRescan = false;       // settings changed while the panel was open
let needsRender = false;

const $ = (id) => document.getElementById(id);
const gallery = $("gallery");

// ── Boot ─────────────────────────────────────────────────────
async function init() {
  chrome.runtime.connect({ name: "popup" }); // lets the service worker know the popup is open
  renderIcons();
  settings = await getSettings();
  setAppearance(pickAppearance(settings));
  const lang = resolveLang(settings.language);
  t = makeT(lang);
  document.documentElement.lang = lang;
  applyI18n(t);
  updateViewToggle();
  bindEvents();
  await scan();
}

function pickAppearance(s) {
  const o = {};
  APPEARANCE_KEYS.forEach((k) => (o[k] = s[k]));
  return o;
}

// ── Scanning ─────────────────────────────────────────────────
function isRestrictedUrl(url) {
  return !url || /^(chrome|chrome-extension|edge|about|view-source|devtools|brave|opera|vivaldi):/i.test(url) ||
    /chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(url);
}

async function scan() {
  setState("loading");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id != null ? tab.id : null;
  restricted = tabId == null || isRestrictedUrl(tab.url);
  if (restricted) return setState("empty", true);
  try {
    const out = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectPageImages,
      args: [{ minSize: settings.minImageSize ?? 32, max: 400 }]
    });
    const list = ((out && out[0] && out[0].result && out[0].result.list) || [])
      .filter((i) => i && i.src && isAllowedExt(getExtFromUrl(i.src)));
    list.sort((a, b) => b.w * b.h - a.w * a.h); // biggest first; unknown sizes sink
    images = list;
  } catch (_) {
    restricted = true;
    return setState("empty", true);
  }
  selected.clear();
  activeFilter = "all";
  showLogos = false;
  lastIndex = null;
  hiddenLogos = settings.excludeLogos ? images.filter((i) => i.isLogo).length : 0;
  updateBadge();
  render();
}

function updateBadge() {
  if (tabId == null) return;
  const n = images.length - hiddenLogos;
  try {
    const tok = MD_THEMES[window.__appearance.themeColor][resolveScheme(window.__appearance.themeMode)];
    chrome.action.setBadgeText({ text: n > 0 ? String(Math.min(n, 999)) : "", tabId });
    chrome.action.setBadgeBackgroundColor({ color: tok.primary, tabId });
    if (chrome.action.setBadgeTextColor) chrome.action.setBadgeTextColor({ color: tok["on-primary"], tabId });
  } catch (_) {}
}

// ── States ───────────────────────────────────────────────────
function setState(state, restricted) {
  const loading = state === "loading";
  $("scanBar").hidden = !loading;
  $("skeleton").hidden = !loading;
  $("emptyState").hidden = state !== "empty";
  gallery.hidden = state !== "gallery";
  $("bottomBar").hidden = state !== "gallery";
  if (loading) {
    $("filters").hidden = true;
    $("skeleton").innerHTML = Array.from({ length: 9 }, (_, n) => `<i style="--n:${n}"></i>`).join("");
  }
  if (state === "empty") {
    $("emptyTitle").textContent = restricted ? t("restrictedTitle") : t("emptyTitle");
    $("emptyDesc").textContent = restricted ? t("restrictedDesc") : t("emptyDesc");
    $("btnEmptyRescan").hidden = !!restricted;
    if (restricted) $("filters").hidden = true;
  }
  $("btnRescan").classList.toggle("spinning", loading);
}

// ── Rendering ────────────────────────────────────────────────
function extBadge(src) {
  const e = getExtFromUrl(src);
  return e === "jpeg" ? "JPG" : e.toUpperCase();
}

function computeVisible() {
  visible = [];
  images.forEach((img, i) => {
    if (settings.excludeLogos && !showLogos && img.isLogo) return;
    if (activeFilter !== "all" && extBadge(img.src) !== activeFilter) return;
    visible.push(i);
  });
}

function render() {
  computeVisible();
  renderFilters();
  if (visible.length === 0) return setState("empty", false);
  setState("gallery");
  renderGallery();
  updateFooter();
}

function renderFilters() {
  const row = $("filters");
  const pool = images.filter((i) => !(settings.excludeLogos && !showLogos && i.isLogo));
  const counts = new Map();
  pool.forEach((i) => { const e = extBadge(i.src); counts.set(e, (counts.get(e) || 0) + 1); });
  const exts = [...counts.keys()].sort();
  const chips = [];
  if (exts.length > 1) {
    chips.push(chip("all", `${t("filterAll")} (${pool.length})`, activeFilter === "all"));
    exts.forEach((e) => chips.push(chip(e, `${e} (${counts.get(e)})`, activeFilter === e)));
  }
  if (hiddenLogos > 0) {
    const on = showLogos;
    chips.push(`<button class="chip sl ripple" type="button" data-act="logos" aria-pressed="${on}" title="${escapeHtml(t("logosToggleHint"))}">` +
      `<span class="chip-check">${lucideSvg("check", 18)}</span>${lucideSvg(on ? "eye" : "eye-off", 16)}` +
      `<span>${escapeHtml(on ? t("logosShown", hiddenLogos) : t("logosHidden", hiddenLogos))}</span></button>`);
  }
  row.innerHTML = chips.join("");
  row.hidden = chips.length === 0;
}

function chip(value, label, pressed) {
  return `<button class="chip sl ripple" type="button" data-filter="${escapeHtml(value)}" aria-pressed="${pressed}">` +
    `<span class="chip-check">${lucideSvg("check", 18)}</span><span>${escapeHtml(label)}</span></button>`;
}

function renderGallery() {
  gallery.className = "gallery view-" + (settings.viewMode === "list" ? "list" : "grid");
  tileEls.clear();
  const frag = document.createDocumentFragment();
  visible.forEach((idx, n) => {
    const el = buildTile(images[idx], idx, n);
    tileEls.set(idx, el);
    frag.appendChild(el);
  });
  gallery.replaceChildren(frag);
  $("content").scrollTop = 0;
}

const fileName = (src) => {
  try { return decodeURIComponent(new URL(src).pathname.split("/").pop() || "image"); } catch (_) { return "image"; }
};
const looksTooSmall = (img) => img.w && img.h && !meetsImageRequirements(img.w, img.h);

function buildTile(img, idx, n) {
  const el = document.createElement("div");
  const isSel = selected.has(idx);
  el.className = "tile" + (isSel ? " selected" : "");
  el.setAttribute("role", "option");
  el.setAttribute("aria-selected", String(isSel));
  el.tabIndex = 0;
  el.dataset.i = idx;
  el.style.setProperty("--n", Math.min(n, 14));
  const name = fileName(img.src);
  el.title = name;
  el.innerHTML =
    `<span class="sel">${lucideSvg("check", 14)}</span>` +
    `<div class="thumb"><img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy" decoding="async" draggable="false"></div>` +
    `<div class="meta"><div class="name">${escapeHtml(name)}</div>` +
    `<div class="info"><span class="fmt">${escapeHtml(extBadge(img.src))}</span>` +
    `<span class="dim">${img.w && img.h ? img.w + "×" + img.h : "…"}</span>` +
    `<span class="warn-slot">${looksTooSmall(img) ? warnIcon() : ""}</span></div></div>` +
    `<button class="icon-btn tile-dl sl ripple" type="button" data-act="dl" title="${escapeHtml(t("saveThis"))}" aria-label="${escapeHtml(t("saveThis"))}">${lucideSvg("download", 18)}</button>`;
  return el;
}

const warnIcon = () => `<span class="warn" title="${escapeHtml(t("needsFix"))}">${lucideSvg("crop", 14)}</span>`;

// Thumbnails tell us the real size for images whose size the scan couldn't know.
gallery.addEventListener("load", (e) => {
  const im = e.target;
  if (!(im instanceof HTMLImageElement)) return;
  im.classList.add("loaded");
  const tile = im.closest(".tile");
  if (!tile) return;
  const img = images[+tile.dataset.i];
  if (img && (!img.w || !img.h) && im.naturalWidth) {
    img.w = im.naturalWidth; img.h = im.naturalHeight;
    tile.querySelector(".dim").textContent = img.w + "×" + img.h;
    tile.querySelector(".warn-slot").innerHTML = looksTooSmall(img) ? warnIcon() : "";
  }
}, true);
gallery.addEventListener("error", (e) => {
  const im = e.target;
  if (!(im instanceof HTMLImageElement)) return;
  const thumb = im.closest(".thumb");
  if (thumb) thumb.innerHTML = lucideSvg("image-off", 26);
}, true);

// ── Selection ────────────────────────────────────────────────
function setSelected(idx, on) {
  on ? selected.add(idx) : selected.delete(idx);
  const el = tileEls.get(idx);
  if (el) { el.classList.toggle("selected", on); el.setAttribute("aria-selected", String(on)); }
}

function select(idx, range) {
  const turnOn = !selected.has(idx);
  if (range && lastIndex != null && visible.includes(lastIndex)) {
    const a = visible.indexOf(lastIndex), b = visible.indexOf(idx);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) setSelected(visible[i], turnOn);
  } else {
    setSelected(idx, turnOn);
  }
  lastIndex = idx;
  updateFooter();
}

function selectAllVisible(on) {
  visible.forEach((i) => setSelected(i, on));
  updateFooter();
}

function updateFooter() {
  const n = visible.length;
  const sel = visible.filter((i) => selected.has(i)).length;
  const chk = $("chkAll");
  chk.checked = n > 0 && sel === n;
  chk.indeterminate = sel > 0 && sel < n;
  $("countText").textContent = sel ? t("countSel", sel, n) : t("countAll", n);
  if (!busy) $("btnDownloadLabel").textContent = sel ? t("downloadSel", sel) : t("downloadAll", n);
}

// ── Saving (delegated to the service worker) ─────────────────
function updateProgress(m) {
  const processed = m.done + m.skipped + m.failed;
  $("saveBar").style.setProperty("--v", (processed / m.total) * 100 + "%");
  $("btnDownloadLabel").textContent = t("saving", Math.min(processed + 1, m.total), m.total);
}

async function startBatch(idxs, tile) {
  if (busy || !idxs.length) return;
  const single = !!tile;
  busy = true;
  currentBatch = "b" + Date.now() + Math.random().toString(36).slice(2, 6);
  const myBatch = currentBatch;
  if (single) tile.classList.add("busy");
  else {
    $("bottomBar").classList.add("busy");
    $("saveBar").hidden = false;
    $("saveBar").style.setProperty("--v", "0%");
    $("btnCancel").hidden = false;
    $("btnDownloadLabel").textContent = t("saving", 1, idxs.length);
  }
  $("btnDownload").disabled = true;

  let stats = null;
  try {
    stats = await chrome.runtime.sendMessage({
      type: "SAVE_BATCH", urls: idxs.map((i) => images[i].src), tabId, batchId: myBatch, bulk: !single
    });
  } catch (_) { /* service worker unreachable */ }

  busy = false;
  currentBatch = null;
  if (single) tile.classList.remove("busy");
  $("bottomBar").classList.remove("busy");
  $("saveBar").hidden = true;
  $("btnCancel").hidden = true;
  $("btnDownload").disabled = false;
  updateFooter();
  report(stats, single);
}

function report(stats, single) {
  if (!stats) return showSnackbar(t("saveFailed"), null, true);
  const bad = stats.skipped + stats.failed;
  if (stats.cancelled) return showSnackbar(t("cancelled"), "ban", false);
  if (stats.done === 0) {
    const r = (stats.results || []).find(Boolean) || {};
    const msg = r.reason === "FORMAT_NOT_ALLOWED" ? t("skipFormat")
      : r.reason === "PROCESSING_FAILED" ? t("skipProcessing")
      : single ? t("saveFailed") : t("nothingSaved");
    return showSnackbar(msg, null, true);
  }
  if (single) {
    if (settings.saveMode !== "ask") showSnackbar(t("savedFile", stats.results[0].filename.split("/").pop()));
    return;
  }
  let msg = bad ? t("savedNSkipped", stats.done, bad) : t("savedN", stats.done);
  if (stats.folder) msg += " → Downloads/" + stats.folder;
  showSnackbar(msg, bad && !stats.done ? null : "circle-check", false);
}

const downloadAction = () => {
  const picked = visible.filter((i) => selected.has(i));
  startBatch(picked.length ? picked : visible.slice());
};

// ── View toggle ──────────────────────────────────────────────
function updateViewToggle() {
  const list = settings.viewMode === "list";
  const btn = $("btnView");
  btn.innerHTML = lucideSvg(list ? "layout-grid" : "list", 20);
  const label = t(list ? "viewGrid" : "viewList");
  btn.title = label;
  btn.setAttribute("aria-label", label);
  gallery.classList.toggle("view-list", list);
  gallery.classList.toggle("view-grid", !list);
}

// ── Embedded settings ────────────────────────────────────────
const settingsPanel = $("settingsPanel");

function openSettings() {
  if (settingsOpen) return;
  settingsOpen = true;
  if (!settingsFrame) {
    settingsFrame = document.createElement("iframe");
    settingsFrame.title = t("settings");
    settingsFrame.addEventListener("load", () => settingsOpen && settingsFrame.contentWindow.focus());
    settingsFrame.src = "options.html?embedded=1";
    settingsPanel.appendChild(settingsFrame);
  } else {
    settingsFrame.title = t("settings");
  }
  settingsPanel.inert = false;
  settingsPanel.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    settingsPanel.classList.add("open");
    settingsFrame.contentWindow && settingsFrame.contentWindow.focus();
  });
}

async function closeSettings() {
  if (!settingsOpen) return;
  settingsOpen = false;
  settingsPanel.classList.remove("open");
  settingsPanel.setAttribute("aria-hidden", "true");
  settingsPanel.inert = true;
  await refreshSettings();
  if (!busy) {
    if (needsRescan) { needsRescan = needsRender = false; scan(); }
    else if (needsRender) { needsRender = false; rerender(); }
  }
  $("btnSettings").focus();
}

/** Re-reads settings after the embedded page changed them and applies what can be applied live. */
async function refreshSettings() {
  const prev = settings;
  settings = await getSettings();
  setAppearance(pickAppearance(settings));
  updateBadge();
  if (settings.language !== prev.language) {
    const lang = resolveLang(settings.language);
    t = makeT(lang);
    document.documentElement.lang = lang;
    applyI18n(t);
    if (settingsFrame) settingsFrame.title = t("settings");
    needsRender = true;
  }
  if (settings.minImageSize !== prev.minImageSize) needsRescan = true;
  if (settings.excludeLogos !== prev.excludeLogos) needsRender = true;
  updateViewToggle();
  if (!busy) updateFooter();
}

function rerender() {
  hiddenLogos = settings.excludeLogos ? images.filter((i) => i.isLogo).length : 0;
  if (restricted) return setState("empty", true);
  render();
}

// ── Events ───────────────────────────────────────────────────
function bindEvents() {
  $("btnSettings").addEventListener("click", openSettings);
  window.addEventListener("message", (e) => {
    if (e.origin === location.origin && settingsFrame && e.source === settingsFrame.contentWindow &&
        e.data && e.data.type === "CLOSE_SETTINGS") closeSettings();
  });
  // Appearance / language / layout changes made in the settings panel show up in the popup immediately.
  let syncTimer;
  chrome.storage.onChanged.addListener((_c, area) => {
    if (area !== "sync" || !settingsOpen) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(refreshSettings, 80);
  });
  $("btnRescan").addEventListener("click", () => !busy && scan());
  $("btnEmptyRescan").addEventListener("click", () => scan());
  $("btnView").addEventListener("click", () => {
    settings.viewMode = settings.viewMode === "list" ? "grid" : "list";
    chrome.storage.sync.set({ viewMode: settings.viewMode });
    updateViewToggle();
  });
  $("btnDownload").addEventListener("click", downloadAction);
  $("btnCancel").addEventListener("click", () => {
    if (currentBatch) chrome.runtime.sendMessage({ type: "CANCEL_BATCH", batchId: currentBatch });
    $("btnCancel").hidden = true;
  });
  $("chkAll").addEventListener("change", (e) => selectAllVisible(e.target.checked));

  $("filters").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.act === "logos") showLogos = !showLogos;
    else if (b.dataset.filter) activeFilter = b.dataset.filter;
    else return;
    selected.clear();
    lastIndex = null;
    render();
  });

  gallery.addEventListener("click", (e) => {
    const tile = e.target.closest(".tile");
    if (!tile) return;
    const idx = +tile.dataset.i;
    if (e.target.closest('[data-act="dl"]')) { e.stopPropagation(); startBatch([idx], tile); return; }
    select(idx, e.shiftKey);
  });
  gallery.addEventListener("keydown", (e) => {
    const tile = e.target.closest && e.target.closest(".tile");
    if (!tile || e.target !== tile) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); select(+tile.dataset.i, e.shiftKey); }
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); (tile.nextElementSibling || tile).focus(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); (tile.previousElementSibling || tile).focus(); }
  });
  document.addEventListener("keydown", (e) => {
    if (settingsOpen) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !gallery.hidden) { e.preventDefault(); selectAllVisible(true); }
    else if (e.key === "Escape" && selected.size) { selectAllVisible(false); }
  });

  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === "BATCH_PROGRESS" && m.batchId === currentBatch) updateProgress(m);
  });
}

init();
