// popup.js

let t = I18N.en;
let settings = {};
let images = [];          // full collected list for the current tab
let selected = new Set(); // indices into `images`
let activeFilter = "all";
let activeTabId = null;
let hiddenLogos = 0;     // logos auto-excluded from the current scan

async function init() {
  // Apply the last-known theme instantly from cache, before storage.sync
  // resolves, so the popup never flashes the wrong theme on open.
  applyTheme(getCachedThemePrefs().theme);
  showLoading();

  settings = await getSettings();
  const lang = await getLang(settings);
  t = I18N[lang];
  applyTheme(settings.theme);
  applyTranslations();
  await loadImages();
}

function applyTranslations() {
  document.getElementById('headerTitle').textContent = t.appName;
  document.getElementById('tipText').textContent = t.rightClickTip;
  document.getElementById('loadingLabel').textContent = t.loading;
  document.getElementById('emptyLabel').textContent = t.noImages;
  document.getElementById('sectionTitle').textContent = t.pageImages.toUpperCase();
  document.getElementById('selectAllLabel').textContent = t.selectAll;
  document.getElementById('btnSaveAllLabel').textContent = t.saveAll;
  document.getElementById('btnSaveSelectedLabel').textContent = t.saveSelected;
  document.getElementById('btnSettings').title = t.settings;
  document.getElementById('btnRescan').title = t.rescan;
}

async function loadImages() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
    showEmpty(); return;
  }
  activeTabId = tab.id;
  selected.clear();
  activeFilter = "all";
  showLoading();
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectPageImages,
      args: [settings.minImageSize ?? 32, settings.excludeLogos !== false]
    });
    // Only PNG/JPG/WebP are downloadable — drop anything else (GIF, SVG,
    // AVIF, BMP, or a URL with no recognizable image extension) right here
    // so the popup never lists an image the user can't actually save.
    const payload = results?.[0]?.result || { list: [], hiddenLogos: 0 };
    hiddenLogos = payload.hiddenLogos || 0;
    images = (payload.list || [])
      .filter(i => i?.src)
      .filter(i => isAllowedExt(getExtFromUrl(i.src)));
    sortImagesBySize(images);
    updateBadge(tab.id, images.length);
    document.getElementById('sectionTitle').textContent =
      t.pageImages.toUpperCase() + (hiddenLogos > 0 ? ` · ${t.logosHidden(hiddenLogos)}` : '');
    images.length === 0 ? showEmpty() : showImages();
  } catch (_) { showEmpty(); }
}

// Larger images (likely real content photos) surface first; images whose
// dimensions we never learned (w or h === 0) naturally sink to the bottom
// since they sort as the smallest area, without needing a separate branch.
function sortImagesBySize(list) {
  list.sort((a, b) => (b.w * b.h) - (a.w * a.h));
}

function updateBadge(tabId, count) {
  try {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#1565C0", tabId });
  } catch (_) {}
}

// Injected into the page. `minSize` comes from settings so the "skip small
// images" threshold configured in Settings → Behaviour is actually honored.
// `excludeLogos` drops anything that looks like a logo / brand mark / site
// icon BEFORE the 120-image cap is applied, so a page with a dozen header,
// footer and partner logos can't crowd real content images out of the list.
//
// Must stay self-contained (executeScript serializes it into the page), so
// the logo heuristics live inside this function rather than in shared.js.
// Returns { list, hiddenLogos }.
function collectPageImages(minSize, excludeLogos) {
  const seen = new Map(), results = [];
  const floor = Number.isFinite(minSize) ? minSize : 32;

  // ── Logo detection ─────────────────────────────────────────
  // "logo" as a whole word/token: site_logo.png, logo-2x.webp, Company Logo,
  // client-logos … but NOT catalog.jpg, technology.png or logout.png.
  const LOGO_RE = /(^|[^a-z])(logo|logos|logotype|logomark|wordmark|brandmark|site-?icon|favicon)([^a-z]|$)/i;
  const LOGO_CAMEL_RE = /[a-z0-9](Logo|Logos|Logotype|Wordmark|Favicon)(?![a-z])/; // siteLogo.png
  const BRAND_RE = /(^|[^a-z])(navbar-brand|site-brand|brand-logo|site-title|site-name)([^a-z]|$)/i;
  const hasLogoText = s => !!s && (LOGO_RE.test(s) || LOGO_CAMEL_RE.test(s));
  const classOf = el => typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
  const attr = (el, n) => (el.getAttribute && el.getAttribute(n)) || '';

  function isHomeLink(a) {
    try {
      const u = new URL(a.getAttribute('href') || '', location.href);
      if (u.origin !== location.origin) return false;
      return /^\/(index\.(html?|php))?$/i.test(u.pathname) || /^\/[a-z]{2}(-[a-z]{2})?\/?$/i.test(u.pathname);
    } catch (_) { return false; }
  }

  function looksLikeLogo(el, src) {
    // 1) File name / path
    let path = src;
    try { path = decodeURIComponent(new URL(src, location.href).pathname); } catch (_) {}
    if (hasLogoText(path)) return true;
    if (!el || el.nodeType !== 1) return false;

    // 2) The element itself: alt, class, id, itemprop, aria-label…
    if (attr(el, 'itemprop').toLowerCase() === 'logo') return true;
    const own = [el.alt, classOf(el), el.id, attr(el, 'name'), attr(el, 'aria-label'),
                 attr(el, 'title'), attr(el, 'data-testid'), attr(el, 'data-name')];
    if (own.some(v => hasLogoText(v) || BRAND_RE.test(v || ''))) return true;

    // 3) A few ancestors (header/brand/logo wrappers, "client-logos" strips…)
    let p = el.parentElement, depth = 0;
    while (p && depth < 4 && p !== document.body && p !== document.documentElement) {
      const hints = [classOf(p), p.id, attr(p, 'aria-label'), attr(p, 'itemprop')];
      if (attr(p, 'itemprop').toLowerCase() === 'logo') return true;
      if (hints.some(v => hasLogoText(v) || BRAND_RE.test(v || ''))) return true;
      p = p.parentElement; depth++;
    }

    // 4) Size on screen. Unknown size (hidden / not laid out) → skip the
    //    position-based rules rather than guess.
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
    const side = Math.max(rect.width || 0, rect.height || 0);
    if (!side) return false;

    // Small image wrapped in a link back to the site's home page → brand logo.
    const a = el.closest && el.closest('a[href]');
    if (a && side <= 400 && isHomeLink(a)) return true;

    // Small image living in the page chrome (header / nav / footer / banner).
    if (side <= 240 && el.closest &&
        el.closest('header, nav, footer, [role="banner"], [role="contentinfo"], [role="navigation"]')) return true;

    return false;
  }

  // allowUnknown: skip the min-size check when we genuinely don't know the
  // image's real dimensions yet (e.g. <img> not finished loading). For
  // background-images we DO know the size (the element's own box), so we
  // always enforce the size floor for those — otherwise every CSS sprite,
  // icon, and tracking pixel on the page (which report w=0,h=0) sails
  // through the old "w === 0" bypass and pollutes "Save all" with dozens of
  // tiny, low-quality images.
  function add(src, w, h, alt, allowUnknown, el) {
    if (!src || src.startsWith('data:')) return;
    const logo = looksLikeLogo(el, src);
    if (seen.has(src)) {
      // Same file used several times (e.g. header + footer logo): it's only
      // a logo if EVERY use looks like one — otherwise keep it.
      const prev = seen.get(src);
      prev.isLogo = prev.isLogo && logo;
      return;
    }
    if (!allowUnknown && (w < floor || h < floor)) return;
    const item = { src, w: w || 0, h: h || 0, alt: alt || '', isLogo: logo };
    seen.set(src, item);
    results.push(item);
  }
  document.querySelectorAll('img').forEach(img =>
    add(img.currentSrc || img.src, img.naturalWidth, img.naturalHeight, img.alt, true, img));
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
    if (first) add(first, 0, 0, '', true, s.closest('picture')?.querySelector('img') || s.parentElement);
  });

  const kept = excludeLogos ? results.filter(r => !r.isLogo) : results;
  return { list: kept.slice(0, 120), hiddenLogos: results.length - kept.length };
}

function showLoading() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('tipBanner').style.display = 'none';
  document.getElementById('sectionHeader').style.display = 'none';
  document.getElementById('filterRow').style.display = 'none';
  document.getElementById('footerBar').style.display = 'none';

  const list = document.getElementById('imageList');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';
  list.innerHTML = Array.from({ length: 5 }).map((_, i) => `
    <div class="skeleton-item fade-in" style="animation-delay:${i * 40}ms">
      <div class="skel-thumb skeleton"></div>
      <div class="skel-info">
        <div class="skel-line skeleton" style="width:${70 - i * 4}%"></div>
        <div class="skel-line skel-line-short skeleton"></div>
      </div>
    </div>
  `).join('');
}
function showEmpty() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('imageList').style.display = 'none';
  document.getElementById('sectionHeader').style.display = 'none';
  document.getElementById('filterRow').style.display = 'none';
  document.getElementById('tipBanner').style.display = 'flex';
  document.getElementById('footerBar').style.display = 'none';
}
function showImages() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('tipBanner').style.display = 'none';
  document.getElementById('sectionHeader').style.display = 'flex';
  document.getElementById('footerBar').style.display = 'flex';
  renderFilterChips();
  renderList();
}

// ── Format filter chips ──────────────────────────────────────

function extBadge(src) {
  const ext = getExtFromUrl(src);
  return ext === "unknown" ? "IMG" : ext.toUpperCase();
}

function renderFilterChips() {
  const row = document.getElementById('filterRow');
  const counts = new Map();
  images.forEach(img => {
    const ext = extBadge(img.src);
    counts.set(ext, (counts.get(ext) || 0) + 1);
  });
  const exts = Array.from(counts.keys()).sort();

  if (exts.length <= 1) {
    row.style.display = 'none';
    row.innerHTML = '';
    return;
  }
  row.style.display = 'flex';
  row.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'chip filter-chip' + (activeFilter === 'all' ? ' active' : '');
  allChip.textContent = `${t.filterAll} (${images.length})`;
  allChip.addEventListener('click', () => setFilter('all'));
  row.appendChild(allChip);

  exts.forEach(ext => {
    const chip = document.createElement('button');
    chip.className = 'chip filter-chip' + (activeFilter === ext ? ' active' : '');
    chip.textContent = `${ext} (${counts.get(ext)})`;
    chip.addEventListener('click', () => setFilter(ext));
    row.appendChild(chip);
  });
}

function setFilter(filter) {
  activeFilter = filter;
  selected.clear(); // avoid "hidden but still selected" confusion
  renderFilterChips();
  renderList();
}

function visibleImages() {
  if (activeFilter === 'all') return images.map((img, i) => ({ img, i }));
  return images
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => extBadge(img.src) === activeFilter);
}

function renderList() {
  const list = document.getElementById('imageList');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';
  list.innerHTML = '';
  const visible = visibleImages();
  visible.forEach(({ img, i }, renderIndex) => list.appendChild(buildImageItem(img, i, renderIndex)));
  updateFooter();
}

function buildImageItem(img, index, renderIndex) {
  const div = document.createElement('div');
  div.className = 'image-item fade-in';
  div.dataset.index = index;
  div.style.animationDelay = `${Math.min(renderIndex * 30, 200)}ms`;
  if (selected.has(index)) div.classList.add('selected');
  const ext = extBadge(img.src);
  const name = getFileName(img.src);
  const sizeStr = img.w && img.h ? `${img.w}×${img.h}` : t.unknown;
  // Best-effort heads-up only — a scanned <img> naturalWidth/Height is the
  // real pixel size, but a background-image's w/h here is just its CSS
  // box, so this can be off for that case. Doesn't block anything: doSave()
  // auto-crops/upscales any image that doesn't meet the requirement, using
  // the real decoded pixels as the source of truth, right before saving.
  const looksTooSmall = img.w && img.h && !meetsImageRequirements(img.w, img.h);
  div.innerHTML = `
    <div class="image-thumb-wrap">
      <img class="image-thumb" src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy">
      <span class="material-icons-round image-thumb-placeholder" style="display:none">broken_image</span>
    </div>
    <div class="image-info">
      <div class="image-name truncate">${esc(name)}</div>
      <div class="image-meta">
        <span class="image-type-badge">${esc(ext)}</span>
        <span${looksTooSmall ? ' class="size-warn" title="' + esc(t.imageTooSmall) + '"' : ''}>${esc(sizeStr)}</span>
      </div>
    </div>
    <div class="image-action">
      <div class="check-icon"><span class="material-icons-round">check</span></div>
      <button class="save-btn-single" data-index="${index}">
        <span class="material-icons-round">download</span>
      </button>
    </div>`;
  const thumbImg = div.querySelector('.image-thumb');
  thumbImg.addEventListener('error', () => {
    thumbImg.style.display = 'none';
    thumbImg.nextElementSibling.style.display = 'flex';
  });
  div.querySelector('.save-btn-single').addEventListener('click', async (e) => {
    e.stopPropagation();
    await saveOne(img, e.currentTarget);
  });
  div.addEventListener('click', () => toggleSelect(index, div));
  return div;
}

function toggleSelect(index, el) {
  selected.has(index) ? (selected.delete(index), el.classList.remove('selected'))
                      : (selected.add(index),    el.classList.add('selected'));
  updateFooter();
}

function updateFooter() {
  const visible = visibleImages();
  const visibleCount = visible.length;
  const selectedVisibleCount = visible.filter(({ i }) => selected.has(i)).length;

  const selCount = document.getElementById('selectionCount');
  const btnSel   = document.getElementById('btnSaveSelected');
  const btnAll   = document.getElementById('btnSaveAll');
  if (selectedVisibleCount > 0) {
    selCount.style.display = 'block';
    selCount.textContent = t.count(selectedVisibleCount);
    btnSel.style.display = 'flex';
  } else {
    selCount.style.display = 'none';
    btnSel.style.display = 'none';
  }
  btnAll.style.display = 'flex';
  const isAll = visibleCount > 0 && selectedVisibleCount === visibleCount;
  document.getElementById('selectAllLabel').textContent = isAll ? t.deselectAll : t.selectAll;
  document.getElementById('btnSelectAll').querySelector('.material-icons-round').textContent =
    isAll ? 'check_box' : 'check_box_outline_blank';
}

// ── Save logic ────────────────────────────────────────────

async function saveOne(img, btn) {
  const origIcon = btn.querySelector('.material-icons-round').textContent;
  btn.disabled = true;
  btn.querySelector('.material-icons-round').textContent = 'autorenew';
  btn.style.animation = 'spin .8s linear infinite';
  try {
    await doSave(img.src);
    btn.querySelector('.material-icons-round').textContent = 'check';
    // Only show snackbar when NOT in "ask" mode (ask mode opens browser dialog, no need for snackbar)
    if (settings.saveMode !== 'ask') showSnackbar(t.imageSaved, 'check_circle', false);
  } catch (err) {
    const msg = err?.code === 'FORMAT_NOT_ALLOWED' ? t.imageFormatNotAllowed
      : err?.code === 'PROCESSING_FAILED' ? t.imageProcessingFailed
      : t.imageError;
    showSnackbar(msg, 'error', true);
    btn.querySelector('.material-icons-round').textContent = origIcon;
  } finally {
    btn.disabled = false;
    btn.style.animation = '';
    setTimeout(() => { btn.querySelector('.material-icons-round').textContent = origIcon; }, 1800);
  }
}

async function doSave(srcUrl) {
  // Defense in depth: the popup list is already pre-filtered to allowed
  // formats, but re-check here too since this list can be a little stale
  // by the time a save actually happens (page DOM can change between scan
  // and click).
  if (!isAllowedExt(getExtFromUrl(srcUrl))) {
    const err = new Error('FORMAT_NOT_ALLOWED');
    err.code = 'FORMAT_NOT_ALLOWED';
    throw err;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Real decoded pixel size — the `w`/`h` already sitting in `images` come
  // from the DOM scan (naturalWidth, or the CSS box for background-images)
  // and can't be trusted as the source of truth, so re-check here with the
  // actual image before every single save, regardless of format.
  let dims = { w: 0, h: 0 };
  try {
    const dimResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkImageDimensions,
      args: [srcUrl]
    });
    dims = dimResult?.[0]?.result || { w: 0, h: 0 };
  } catch (_) {}

  const crop = computeCropAndScale(dims.w, dims.h);
  if (!crop) {
    const err = new Error('PROCESSING_FAILED');
    err.code = 'PROCESSING_FAILED';
    throw err;
  }
  const needsFix = !meetsImageRequirements(dims.w, dims.h);

  const openSaveAs = settings.saveMode === 'ask';

  const ext = getExtFromUrl(srcUrl);
  const convert = shouldConvertExt(ext, settings);
  const finalExt = convert ? 'jpg' : ext;

  // Only fire up the canvas when bytes actually need to change: the user
  // wants this format converted to JPG, or the image doesn't meet the
  // size/ratio requirement and has to be auto-cropped/scaled to fit.
  let dataUrl = null;
  if (convert || needsFix) {
    const outMime = convert ? 'image/jpeg' : MIME_FOR_EXT[ext];
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: processImageForDownload,
        args: [srcUrl, crop, outMime, settings.quality]
      });
      dataUrl = res?.[0]?.result || null;
    } catch (_) {}

    if (!dataUrl && needsFix) {
      // Couldn't crop/scale (most likely a cross-origin canvas taint), and
      // the original alone doesn't meet the size/ratio requirement —
      // downloading it unmodified would violate that requirement.
      const err = new Error('PROCESSING_FAILED');
      err.code = 'PROCESSING_FAILED';
      throw err;
    }
    // Otherwise: convert was requested but failed, and the original
    // already meets the requirement on its own — fall back to it below.
  }

  const filename = buildDownloadPath(srcUrl, settings, finalExt);

  await chrome.downloads.download({
    url: dataUrl || srcUrl,
    filename: dataUrl && !openSaveAs ? filename : undefined,
    conflictAction: openSaveAs ? undefined : settings.conflictAction,
    saveAs: openSaveAs
  });
}

// ── Utilities ─────────────────────────────────────────────

function getFileName(src) {
  try { const u = new URL(src); return u.pathname.split('/').pop() || 'image'; } catch { return 'image'; }
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let _sbTimer;
function showSnackbar(msg, icon='check', isError=false) {
  const sb = document.getElementById('snackbar');
  document.getElementById('snackbarMsg').textContent  = msg;
  document.getElementById('snackbarIcon').textContent = icon;
  sb.style.color = isError ? 'var(--md-error)' : '';
  clearTimeout(_sbTimer);
  sb.classList.add('show');
  _sbTimer = setTimeout(() => sb.classList.remove('show'), 2500);
}

// ── Event listeners ───────────────────────────────────────

document.getElementById('btnSettings').addEventListener('click', () => chrome.runtime.openOptionsPage());

document.getElementById('btnRescan').addEventListener('click', async (e) => {
  const icon = e.currentTarget.querySelector('.material-icons-round');
  e.currentTarget.disabled = true;
  icon.style.animation = 'spin .6s linear infinite';
  await loadImages();
  icon.style.animation = '';
  e.currentTarget.disabled = false;
});

document.getElementById('btnSelectAll').addEventListener('click', () => {
  const visible = visibleImages();
  const allSelected = visible.length > 0 && visible.every(({ i }) => selected.has(i));
  visible.forEach(({ i }) => allSelected ? selected.delete(i) : selected.add(i));
  renderList();
});

function setBulkButtonBusy(btn, labelEl, busy, icon) {
  const iconEl = btn.querySelector('.material-icons-round');
  btn.disabled = busy;
  if (busy) {
    iconEl.dataset.orig = iconEl.textContent;
    iconEl.textContent = 'autorenew';
    iconEl.style.animation = 'spin .8s linear infinite';
    labelEl.dataset.orig = labelEl.textContent;
    labelEl.textContent = t.savingBtn;
  } else {
    iconEl.textContent = icon || iconEl.dataset.orig || iconEl.textContent;
    iconEl.style.animation = '';
    labelEl.textContent = labelEl.dataset.orig || labelEl.textContent;
  }
}

document.getElementById('btnSaveAll').addEventListener('click', async () => {
  const btn = document.getElementById('btnSaveAll');
  const label = document.getElementById('btnSaveAllLabel');
  const targets = visibleImages().map(({ img }) => img);
  document.getElementById('btnSaveSelected').disabled = true;
  setBulkButtonBusy(btn, label, true);
  let done = 0, skipped = 0;
  for (const img of targets) {
    label.textContent = t.savingProgress(done + skipped + 1, targets.length);
    try { await doSave(img.src); done++; }
    catch (err) { if (err?.code === 'FORMAT_NOT_ALLOWED' || err?.code === 'PROCESSING_FAILED') skipped++; }
  }
  setBulkButtonBusy(btn, label, false, 'download_for_offline');
  document.getElementById('btnSaveSelected').disabled = selected.size === 0;
  if (settings.saveMode !== 'ask') {
    const suffix = skipped > 0 ? ` (${t.skippedSize(skipped)})` : '';
    showSnackbar(`${t.count(done)} — ${t.done}${suffix}`, 'download_done', skipped > 0 && done === 0);
  }
});

document.getElementById('btnSaveSelected').addEventListener('click', async () => {
  const btn = document.getElementById('btnSaveSelected');
  const label = document.getElementById('btnSaveSelectedLabel');
  const targets = Array.from(selected).map(i => images[i]);
  document.getElementById('btnSaveAll').disabled = true;
  setBulkButtonBusy(btn, label, true);
  let done = 0, skipped = 0;
  for (const img of targets) {
    label.textContent = t.savingProgress(done + skipped + 1, targets.length);
    try { await doSave(img.src); done++; }
    catch (err) { if (err?.code === 'FORMAT_NOT_ALLOWED' || err?.code === 'PROCESSING_FAILED') skipped++; }
  }
  setBulkButtonBusy(btn, label, false, 'download');
  document.getElementById('btnSaveAll').disabled = false;
  if (settings.saveMode !== 'ask') {
    const suffix = skipped > 0 ? ` (${t.skippedSize(skipped)})` : '';
    showSnackbar(`${t.count(done)} — ${t.done}${suffix}`, 'download_done', skipped > 0 && done === 0);
  }
});

init();
