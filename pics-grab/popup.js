// popup.js — scans the active tab, shows the images as a grid or list, and
// saves them one at a time or in bulk.

let t = I18N.en;
let settings = {};
let images = [];              // everything found on the current tab
let selected = new Set();     // indices into `images`
let activeFilter = "all";     // "all" or an extension badge like "PNG"
let query = "";               // name filter from the search box
let showLogos = false;        // true = user revealed logos hidden by the setting
let viewMode = "grid";        // "grid" | "list"
let busy = false;             // a bulk save is running
let cancelRequested = false;
let lastToggled = null;       // anchor for shift-click range selection
let pageHost = "";

const $ = (id) => document.getElementById(id);

async function init() {
  // Paint in the last-known theme straight away, before storage resolves.
  applyTheme(getCachedThemePrefs().theme);
  showState("loading");

  settings = await getSettings();
  t = I18N[await getLang(settings)];
  applyTheme(settings.theme);
  viewMode = settings.viewMode === "list" ? "list" : "grid";
  document.documentElement.lang = resolveLang(settings.language);

  applyI18n(document, t);
  updateViewToggle();
  bindEvents();
  await loadImages();
}

// ── Scanning ─────────────────────────────────────────────

function isRestricted(url) {
  return !url
    || /^(chrome|chrome-extension|chrome-search|edge|about|devtools|view-source):/.test(url)
    || /^https:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/.test(url);
}

async function loadImages() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pageHost = "";
  try { pageHost = new URL(tab.url).hostname.replace(/^www\./, ""); } catch (_) {}
  $("appSub").textContent = pageHost || t.appTagline;

  if (!tab || !tab.id || isRestricted(tab.url)) { showRestricted(); return; }

  selected.clear();
  activeFilter = "all";
  query = "";
  $("search").value = "";
  $("searchClear").hidden = true;
  showLogos = false;
  lastToggled = null;
  showState("loading");

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectPageImages,
      args: [settings.minImageSize ?? 32, !!settings.hideLogos]
    });
    images = (results?.[0]?.result || []).filter(i => i?.src);
    sortImagesBySize(images);
    updateBadge(tab.id, pool().length);
    if (images.length === 0) {
      showEmpty({ icon: "image-off", title: t.noImagesTitle, desc: t.noImagesDesc,
                  action: { label: t.rescan, icon: "rotate-cw", fn: rescan } });
    } else {
      showState("list");
      renderFilterChips();
      renderList();
    }
  } catch (_) {
    showRestricted();
  }
}

function showRestricted() {
  images = [];
  showEmpty({ icon: "shield-alert", title: t.restrictedTitle, desc: t.restrictedDesc, action: null });
}

// Larger images (likely real content) surface first; images whose dimensions we
// never learned (w or h === 0) sink to the bottom since they sort as smallest.
function sortImagesBySize(list) {
  list.sort((a, b) => (b.w * b.h) - (a.w * a.h));
}

function updateBadge(tabId, count) {
  try {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#0F6CBD", tabId });
  } catch (_) {}
}

async function rescan() {
  const svg = $("btnRescan").querySelector("svg");
  $("btnRescan").disabled = true;
  svg?.classList.add("spin");
  await loadImages();
  svg?.classList.remove("spin");
  $("btnRescan").disabled = false;
}

// ── Logo filter ──────────────────────────────────────────
// `img.isLogo` is decided inside the page (see collectPageImages). Here we only
// decide what to do with it: hide it, or show it because the user asked to.

function isHiddenLogo(img) {
  return !!settings.hideLogos && !showLogos && !!img.isLogo;
}
function logoCount() {
  return settings.hideLogos ? images.filter(i => i.isLogo).length : 0;
}
// Every image not currently hidden as a logo, keeping its index into `images`.
function pool() {
  return images.map((img, i) => ({ img, i })).filter(({ img }) => !isHiddenLogo(img));
}
function toggleLogos() {
  showLogos = !showLogos;
  selected.clear(); // no "selected but hidden" items
  renderFilterChips();
  renderList();
}

// Injected into the page, so it must be fully self-contained (no references
// to anything outside this function).
//
// `minSize` comes from settings so the "skip small images" threshold is honored.
// `detectLogos` turns on the logo heuristic; each result then carries `isLogo`.
function collectPageImages(minSize, detectLogos) {
  const byUrl = new Map();
  const floor = Number.isFinite(minSize) ? minSize : 32;

  // ── Logo heuristic ──────────────────────────────────────────
  // Pixel content of cross-origin images can't be read, so this scores
  // *metadata* instead: how the image is named, where it sits on the page
  // and what it looks like. An image is a logo when its score reaches 3.
  //   explicit "logo"-style name .......... +3  (decisive on its own)
  //   weaker brand-ish name (badge, …) .... +1
  //   ancestor named "logo" ............... +2
  //   wrapped in a link to the site root .. +2
  //   inside site header / nav / footer ... +1
  //   SVG / small / banner-shaped ......... +1 each, ONLY when the image is
  //                                         already in a logo-ish context —
  //                                         small photos elsewhere stay safe.
  // The prefix/suffix boundaries keep words such as "analogous" from matching.
  const STRONG_RE = /(^|[^a-z])(logo|wordmark|favicon|emblem)|(logo|wordmark|favicon|emblem)($|[^a-z])/i;
  const STRONG_CAMEL = /[a-z](Logo|Wordmark|Favicon|Emblem)|(Logo|Wordmark|Favicon|Emblem)[A-Z]/;
  const WEAK_RE = /(^|[^a-z])(brand|badge|watermark|sprite)|site-?icon|app-?icon/i;
  const CHROME_ROLES = ['banner', 'navigation', 'contentinfo'];
  const CHROME_CLASS = /(^|[\s_-])(navbar|masthead|site-header|site-footer|topbar)([\s_-]|$)/i;

  function fileNameOf(src) {
    try {
      return decodeURIComponent(new URL(src, location.href).pathname.split('/').pop() || '');
    } catch (_) { return String(src); }
  }

  function logoScore(el, src, alt, w, h) {
    let score = 0;
    if (!w || !h) { // not-yet-loaded <img>: judge by its rendered box instead
      const r = el.getBoundingClientRect();
      w = Math.round(r.width); h = Math.round(r.height);
    }
    const file = fileNameOf(src);
    const own = [file, alt, el.getAttribute('class'), el.id, el.getAttribute('aria-label')]
      .filter(Boolean).join(' ');
    if (STRONG_RE.test(own) || STRONG_CAMEL.test(own)) score += 3;
    else if (WEAK_RE.test(own)) score += 1;

    let inChrome = false, homeLink = false, logoAncestor = false;
    let p = el.parentElement;
    for (let depth = 0; p && depth < 6; depth++, p = p.parentElement) {
      const tag = p.tagName;
      if (tag === 'NAV' || tag === 'FOOTER') inChrome = true;
      // A <header> inside an <article>/<section>/<main> is a content header, not the site banner.
      if (tag === 'HEADER' && !p.closest('article, section, main')) inChrome = true;
      if (CHROME_ROLES.includes(p.getAttribute('role'))) inChrome = true;
      const pc = (p.getAttribute('class') || '') + ' ' + (p.id || '');
      if (STRONG_RE.test(pc) || STRONG_CAMEL.test(pc)) logoAncestor = true;
      else if (CHROME_CLASS.test(pc)) inChrome = true;
      if (tag === 'A' && !homeLink) {
        try {
          const u = new URL(p.href, location.href);
          if (u.origin === location.origin && (u.pathname === '/' || u.pathname === '')) homeLink = true;
        } catch (_) {}
      }
    }
    if (logoAncestor) score += 2;
    if (homeLink)     score += 2;
    if (inChrome)     score += 1;

    const inLogoContext = inChrome || homeLink || logoAncestor || score > 0;
    if (inLogoContext) {
      const ext = (file.split('.').pop() || '').toLowerCase();
      if (ext === 'svg') score += 1;
      if (w && h && Math.max(w, h) <= 320) score += 1;
      if (w && h && w / h >= 3 && h <= 120) score += 1; // wide wordmark / banner strip
    }
    return score;
  }

  // `allowUnknown`: skip the min-size check when we genuinely don't know the
  // image's real dimensions yet (e.g. <img> not finished loading). For
  // background-images we DO know the size (the element's own box), so we
  // always enforce the size floor for those.
  function add(src, w, h, alt, allowUnknown, el) {
    if (!src || src.startsWith('data:')) return;
    const existing = byUrl.get(src);
    if (!existing && !allowUnknown && (w < floor || h < floor)) return;
    const isLogo = !!(detectLogos && el && logoScore(el, src, alt || '', w, h) >= 3);
    if (existing) {
      // The same file is also used somewhere that doesn't look like a logo
      // (e.g. in the article body) → it's real content, keep it visible.
      if (!isLogo) existing.isLogo = false;
      return;
    }
    byUrl.set(src, { src, w: w || 0, h: h || 0, alt: alt || '', isLogo });
  }

  document.querySelectorAll('img').forEach(img =>
    add(img.src, img.naturalWidth, img.naturalHeight, img.alt, true, img));
  document.querySelectorAll('*').forEach(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m) {
        const rect = el.getBoundingClientRect();
        add(m[1], Math.round(rect.width), Math.round(rect.height), '', false, el);
      }
    }
  });
  document.querySelectorAll('picture source').forEach(s => {
    const first = (s.srcset || '').split(',')[0].trim().split(' ')[0];
    if (first) add(first, 0, 0, '', true, s.closest('picture')?.querySelector('img') || s);
  });

  const list = Array.from(byUrl.values());
  // Real images first, so a logo-heavy page can't push content past the 120 cap.
  if (detectLogos) list.sort((a, b) => Number(a.isLogo) - Number(b.isLogo));
  return list.slice(0, 120);
}


// ── View state ───────────────────────────────────────────

function showState(state) {
  const list = state === "list";
  $("loadingState").hidden = state !== "loading";
  $("emptyState").hidden = state !== "empty";
  $("imageList").hidden = !list;
  $("toolbar").hidden = !list;
  $("commandbar").hidden = !list;
  if (!list) $("filterRow").hidden = true;
}

function setEmpty({ icon: iconName, title, desc, action }) {
  setIcon($("emptyIcon"), iconName, 28);
  $("emptyTitle").textContent = title;
  $("emptyDesc").textContent = desc;
  const btn = $("emptyAction");
  btn.hidden = !action;
  if (action) {
    btn.innerHTML = icon(action.icon, 16) + `<span>${esc(action.label)}</span>`;
    btn.onclick = action.fn;
  }
}

function showEmpty(cfg) {
  setEmpty(cfg);
  showState("empty");
}

// ── Format chips ─────────────────────────────────────────

function extBadge(src) {
  const ext = getExtFromUrl(src);
  return ext === "unknown" ? "IMG" : ext.toUpperCase();
}

function makeChip(label, pressed, onClick, iconName) {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.setAttribute("aria-pressed", String(pressed));
  if (iconName) chip.insertAdjacentHTML("afterbegin", icon(iconName, 14));
  chip.append(document.createTextNode(label));
  chip.addEventListener("click", onClick);
  return chip;
}

function renderFilterChips() {
  const row = $("filterRow");
  const counts = new Map();
  pool().forEach(({ img }) => {
    const ext = extBadge(img.src);
    counts.set(ext, (counts.get(ext) || 0) + 1);
  });
  const exts = Array.from(counts.keys()).sort();
  // The active format may only have existed among logos that just got hidden.
  if (activeFilter !== "all" && !counts.has(activeFilter)) activeFilter = "all";

  const logoN = logoCount();
  const showFormats = exts.length > 1;
  if (!showFormats && logoN === 0) { row.hidden = true; row.replaceChildren(); return; }

  row.hidden = false;
  row.replaceChildren();
  if (showFormats) {
    row.appendChild(makeChip(`${t.filterAll} (${pool().length})`, activeFilter === "all", () => setFilter("all")));
    exts.forEach(ext =>
      row.appendChild(makeChip(`${ext} (${counts.get(ext)})`, activeFilter === ext, () => setFilter(ext))));
  }
  if (logoN > 0) {
    row.appendChild(makeChip(showLogos ? t.hideLogosChip : t.showLogosChip(logoN), showLogos,
                             toggleLogos, showLogos ? "eye" : "eye-off"));
  }
}

function setFilter(filter) {
  activeFilter = filter;
  selected.clear();
  renderFilterChips();
  renderList();
}

function visibleImages() {
  const q = query.trim().toLowerCase();
  return pool().filter(({ img }) => {
    if (activeFilter !== "all" && extBadge(img.src) !== activeFilter) return false;
    if (q && !(getFileName(img.src).toLowerCase().includes(q) || (img.alt || "").toLowerCase().includes(q))) return false;
    return true;
  });
}

// ── Rendering ────────────────────────────────────────────

function renderList() {
  const list = $("imageList");
  const vis = visibleImages();

  if (vis.length === 0) {
    list.hidden = true;
    showEmptyInline({ icon: "scan-search", title: t.noMatchTitle, desc: t.noMatchDesc(images.length),
                      action: { label: t.resetFilters, icon: "rotate-cw", fn: resetFilters } });
    updateFooter();
    return;
  }
  $("emptyState").hidden = true;
  list.hidden = false;
  list.className = viewMode === "grid" ? "grid" : "rows";
  list.replaceChildren();
  const frag = document.createDocumentFragment();
  vis.forEach(({ img, i }) => frag.appendChild(viewMode === "grid" ? buildTile(img, i) : buildRow(img, i)));
  list.appendChild(frag);
  updateFooter();
}

// Empty state shown while the toolbar and footer stay on screen.
function showEmptyInline(cfg) {
  setEmpty(cfg);
  $("emptyState").hidden = false;
}

function resetFilters() {
  query = "";
  $("search").value = "";
  $("searchClear").hidden = true;
  activeFilter = "all";
  if (pool().length === 0) showLogos = true; // everything was a hidden logo
  renderFilterChips();
  renderList();
}

function thumbMarkup(img) {
  return `<img src="${esc(img.src)}" alt="" loading="lazy" decoding="async">`;
}

function wireThumbError(root) {
  const im = root.querySelector("img");
  if (!im) return;
  im.addEventListener("error", () => {
    im.replaceWith(Object.assign(document.createElement("span"), {
      innerHTML: icon("image-off", 20),
      style: "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-3)"
    }));
  }, { once: true });
}

function buildTile(img, index) {
  const el = document.createElement("div");
  el.className = "tile thumb";
  el.dataset.index = index;
  el.tabIndex = 0;
  el.setAttribute("role", "checkbox");
  el.setAttribute("aria-checked", String(selected.has(index)));
  el.setAttribute("aria-label", getFileName(img.src));
  const sizeStr = img.w && img.h ? `${img.w}×${img.h}` : t.unknown;
  el.innerHTML = `
    ${thumbMarkup(img)}
    <span class="checkbox">${icon("check", 14)}</span>
    ${img.isLogo ? `<span class="badge logo badge-logo">${esc(t.logoBadge)}</span>` : ""}
    <div class="tile-meta truncate"><b>${esc(extBadge(img.src))}</b> ${esc(sizeStr)}</div>
    <button class="dl-btn" title="${esc(t.saveImage)}" aria-label="${esc(t.saveImage)}">${icon("download", 16)}</button>`;
  wireThumbError(el);
  return el;
}

function buildRow(img, index) {
  const el = document.createElement("div");
  el.className = "row";
  el.dataset.index = index;
  el.tabIndex = 0;
  el.setAttribute("role", "checkbox");
  el.setAttribute("aria-checked", String(selected.has(index)));
  const name = getFileName(img.src);
  const sizeStr = img.w && img.h ? `${img.w}×${img.h}` : t.unknown;
  el.innerHTML = `
    <span class="checkbox">${icon("check", 14)}</span>
    <div class="thumb">${thumbMarkup(img)}</div>
    <div class="info">
      <div class="name truncate" title="${esc(name)}">${esc(name)}</div>
      <div class="meta">
        <span class="badge">${esc(extBadge(img.src))}</span>
        ${img.isLogo ? `<span class="badge logo">${esc(t.logoBadge)}</span>` : ""}
        <span class="truncate">${esc(sizeStr)}</span>
      </div>
    </div>
    <button class="dl-btn" title="${esc(t.saveImage)}" aria-label="${esc(t.saveImage)}">${icon("download", 16)}</button>`;
  wireThumbError(el.querySelector(".thumb"));
  return el;
}

// ── Selection ────────────────────────────────────────────

function syncSelectionUI() {
  $("imageList").querySelectorAll("[data-index]").forEach(el =>
    el.setAttribute("aria-checked", String(selected.has(Number(el.dataset.index)))));
}

function toggleSelect(index, range) {
  const order = visibleImages().map(v => v.i);
  if (range && lastToggled !== null && order.includes(lastToggled) && order.includes(index)) {
    const a = order.indexOf(lastToggled), b = order.indexOf(index);
    const turnOn = !selected.has(index);
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) {
      turnOn ? selected.add(order[k]) : selected.delete(order[k]);
    }
  } else {
    selected.has(index) ? selected.delete(index) : selected.add(index);
  }
  lastToggled = index;
  syncSelectionUI();
  updateFooter();
}

function toggleSelectAll() {
  const vis = visibleImages();
  const all = vis.length > 0 && vis.every(({ i }) => selected.has(i));
  vis.forEach(({ i }) => all ? selected.delete(i) : selected.add(i));
  syncSelectionUI();
  updateFooter();
}

function clearSelection() {
  selected.clear();
  syncSelectionUI();
  updateFooter();
}

function updateFooter() {
  const vis = visibleImages();
  const selCount = vis.filter(({ i }) => selected.has(i)).length;
  const hasSel = selCount > 0;
  const allSel = vis.length > 0 && selCount === vis.length;

  $("selectionText").textContent = hasSel ? t.selectedOf(selCount, vis.length) : t.count(vis.length);
  $("selectAllLabel").textContent = allSel ? t.deselectAll : t.selectAll;
  setIcon($("selectAllIcon"), allSel ? "square-check" : "square", 16);
  $("btnSelectAll").disabled = busy || vis.length === 0;
  $("btnClear").hidden = !hasSel || busy;
  $("btnCancel").hidden = !busy;
  $("btnSave").disabled = busy || vis.length === 0;
  if (!busy) $("btnSaveLabel").textContent = hasSel ? t.saveSelected(selCount) : t.saveAll(vis.length);
}

// ── Saving ───────────────────────────────────────────────

async function saveOne(img, btn) {
  if (btn.classList.contains("busy")) return;
  btn.classList.add("busy");
  btn.innerHTML = icon("loader-circle", 16, "spin");
  try {
    await doSave(img.src);
    btn.classList.add("done");
    btn.innerHTML = icon("check", 16);
    if (settings.saveMode !== "ask") showToast(t.imageSaved, "success");
  } catch (_) {
    btn.innerHTML = icon("download", 16);
    showToast(t.imageError, "error");
  } finally {
    btn.classList.remove("busy");
    setTimeout(() => { btn.classList.remove("done"); btn.innerHTML = icon("download", 16); }, 1600);
  }
}

async function runSave(targets) {
  if (busy || targets.length === 0) return;
  busy = true;
  cancelRequested = false;
  $("progress").hidden = false;
  $("progressBar").style.width = "0%";
  updateFooter();

  let done = 0, ok = 0, fail = 0;
  for (const img of targets) {
    if (cancelRequested) break;
    $("btnSaveLabel").textContent = t.savingProgress(done + 1, targets.length);
    $("progressBar").style.width = `${(done / targets.length) * 100}%`;
    try { await doSave(img.src); ok++; } catch (_) { fail++; }
    done++;
  }
  $("progressBar").style.width = "100%";
  setTimeout(() => { $("progress").hidden = true; }, 350);

  const stopped = cancelRequested;
  busy = false;
  cancelRequested = false;
  updateFooter();

  if (stopped) showToast(t.stoppedAt(done, targets.length), "info");
  else if (fail > 0) showToast(t.savedWithErrors(ok, fail), "error");
  else if (settings.saveMode !== "ask") showToast(t.savedN(ok), "success");
}

async function doSave(srcUrl) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const openSaveAs = settings.saveMode === "ask";

  const ext = getExtFromUrl(srcUrl);
  const convert = shouldConvertExt(ext, settings);
  const finalExt = convert ? "jpg" : ext;

  let dataUrl = null;
  if (convert) {
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: convertToJpg,
        args: [srcUrl, settings.quality]
      });
      dataUrl = res?.[0]?.result || null;
    } catch (_) {}
  }

  const filename = buildDownloadPath(srcUrl, settings, finalExt);

  await chrome.downloads.download({
    url: dataUrl || srcUrl,
    filename: dataUrl && !openSaveAs ? filename : undefined,
    conflictAction: openSaveAs ? undefined : settings.conflictAction,
    saveAs: openSaveAs
  });
}

function convertToJpg(srcUrl, quality) {
  return new Promise(resolve => {
    function convert(img) {
      try {
        const c = document.createElement('canvas');
        c.width  = img.naturalWidth  || img.width  || 1;
        c.height = img.naturalHeight || img.height || 1;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', (quality || 92) / 100));
      } catch (_) { resolve(null); }
    }
    const i1 = new Image(); i1.crossOrigin = 'anonymous';
    i1.onload = () => convert(i1);
    i1.onerror = () => { const i2 = new Image(); i2.onload = () => convert(i2); i2.onerror = () => resolve(null); i2.src = srcUrl; };
    i1.src = srcUrl;
  });
}


// ── Utilities ────────────────────────────────────────────

function getFileName(src) {
  try {
    const last = new URL(src).pathname.split("/").pop() || "image";
    try { return decodeURIComponent(last); } catch (_) { return last; }
  } catch (_) { return "image"; }
}

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let _toastTimer;
function showToast(msg, type = "success") {
  const el = $("toast");
  el.classList.remove("error", "info");
  if (type !== "success") el.classList.add(type);
  setIcon($("toastIcon"), type === "error" ? "circle-alert" : type === "info" ? "info" : "circle-check", 18);
  $("toastMsg").textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// ── View switch, search, events ──────────────────────────

function updateViewToggle() {
  $("viewGrid").setAttribute("aria-pressed", String(viewMode === "grid"));
  $("viewList").setAttribute("aria-pressed", String(viewMode === "list"));
}

function setViewMode(mode) {
  if (mode === viewMode) return;
  viewMode = mode;
  settings.viewMode = mode;
  chrome.storage.sync.set({ viewMode: mode });
  updateViewToggle();
  renderList();
}

function clearSearch() {
  query = "";
  $("search").value = "";
  $("searchClear").hidden = true;
  renderList();
}

function bindEvents() {
  $("btnSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("btnRescan").addEventListener("click", rescan);
  $("viewGrid").addEventListener("click", () => setViewMode("grid"));
  $("viewList").addEventListener("click", () => setViewMode("list"));

  $("search").addEventListener("input", (e) => {
    query = e.target.value;
    $("searchClear").hidden = query === "";
    renderList();
  });
  $("searchClear").addEventListener("click", () => { clearSearch(); $("search").focus(); });

  $("btnSelectAll").addEventListener("click", toggleSelectAll);
  $("btnClear").addEventListener("click", clearSelection);
  $("btnCancel").addEventListener("click", () => { cancelRequested = true; });
  $("btnSave").addEventListener("click", () => {
    const vis = visibleImages();
    const sel = vis.filter(({ i }) => selected.has(i));
    runSave((sel.length ? sel : vis).map(v => v.img));
  });

  // One listener for every tile/row: select on click, save on the download button.
  const list = $("imageList");
  list.addEventListener("click", (e) => {
    const item = e.target.closest("[data-index]");
    if (!item) return;
    const index = Number(item.dataset.index);
    const dl = e.target.closest(".dl-btn");
    if (dl) { saveOne(images[index], dl); return; }
    toggleSelect(index, e.shiftKey);
  });
  list.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && e.target.matches("[data-index]")) {
      e.preventDefault();
      toggleSelect(Number(e.target.dataset.index), e.shiftKey);
    }
  });

  document.addEventListener("keydown", (e) => {
    const typing = e.target.matches && e.target.matches("input");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !typing && !$("imageList").hidden) {
      e.preventDefault();
      const vis = visibleImages();
      vis.forEach(({ i }) => selected.add(i));
      syncSelectionUI();
      updateFooter();
    } else if (e.key === "Escape") {
      if (query) clearSearch();
      else if (selected.size) clearSelection();
    }
  });
}

init();
