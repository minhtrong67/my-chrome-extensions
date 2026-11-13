// options.js — settings page. Every change is saved automatically (like
// Windows Settings), so there is no Save button to forget about.

let t = I18N.en;
let current = {};
const state = { mode: "ask", theme: "system", lang: "system" };
const PANES = ["saving", "images", "appearance", "about"];

const $ = (id) => document.getElementById(id);

async function init() {
  // Paint in the last-known theme right away, before storage resolves.
  applyTheme(getCachedThemePrefs().theme);

  current = await getSettings();
  state.mode = current.saveMode || "ask";
  state.theme = current.theme || "system";
  state.lang = current.language || "system";

  t = I18N[resolveLang(state.lang)];
  applyTheme(state.theme);
  loadValues();
  applyLang();
  bindEvents();
  openPane(location.hash.slice(1));
  document.body.classList.add("ready");
}

// Re-translates the static markup and everything that embeds translated text.
function applyLang() {
  document.documentElement.lang = resolveLang(state.lang);
  applyI18n(document, t);
  document.title = `${t.settings} – ${APP_NAME}`;
  $("aboutVersion").textContent = chrome.runtime.getManifest().version;
  $("aboutAuthor").textContent = APP_AUTHOR;
  updateBadges();
  updatePreview();
  validateSubfolder();
}

function loadValues() {
  const s = current;
  $("quality").value = s.quality;
  $("minImageSize").value = Number.isFinite(s.minImageSize) ? s.minImageSize : 32;
  $("saveSubfolder").value = s.saveSubfolder || "";
  $("filenameTemplate").value = s.filenameTemplate || "{original}";
  $("conflictAction").value = s.conflictAction || "uniquify";
  $("showNotification").checked = !!s.showNotification;
  $("convertWebp").checked = !!s.convertWebp;
  $("convertPng").checked = !!s.convertPng;
  $("convertGif").checked = !!s.convertGif;
  $("hideLogos").checked = !!s.hideLogos;
  setSegment("themeSegment", state.theme);
  setSegment("langSegment", state.lang);
  applyModeUI();
}

// ── Navigation ───────────────────────────────────────────

function openPane(name) {
  if (!PANES.includes(name)) name = "saving";
  PANES.forEach(p => { $("pane-" + p).hidden = p !== name; });
  document.querySelectorAll(".nav-item").forEach(b => {
    const on = b.dataset.pane === name;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  try { history.replaceState(null, "", "#" + name); } catch (_) {}
}

// ── Controls ─────────────────────────────────────────────

function setSegment(id, value) {
  $(id).querySelectorAll("button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.val === value)));
}

function applyModeUI() {
  document.querySelectorAll(".option").forEach(o =>
    o.setAttribute("aria-checked", String(o.dataset.mode === state.mode)));
  $("subfolderReveal").classList.toggle("open", state.mode === "subfolder");
  // The Save As dialog already asks about conflicts, so hide the setting then.
  $("conflictReveal").classList.toggle("open", state.mode !== "ask");
  updatePreview();
}

function paintSlider(el) {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty("--pct", pct + "%");
}

function updateBadges() {
  $("qualityBadge").textContent = $("quality").value;
  $("minSizeBadge").textContent = t.minSizePx($("minImageSize").value);
  paintSlider($("quality"));
  paintSlider($("minImageSize"));
}

function validateSubfolder() {
  const input = $("saveSubfolder");
  const err = $("subfolderError");
  const bad = !!input.value.trim() && INVALID_FOLDER_CHARS.test(input.value);
  input.classList.toggle("invalid", bad);
  err.textContent = bad ? t.errorInvalidFolder : "";
  err.classList.toggle("show", bad);
  return !bad;
}

function updatePreview() {
  const template = $("filenameTemplate").value || "{original}";
  const subfolder = $("saveSubfolder").value.trim();

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const name = template
    .replace("{original}", "photo_sunset")
    .replace("{date}", date)
    .replace("{time}", time)
    .replace("{datetime}", `${date}_${time}`)
    .replace(/[<>:"/\\|?*]/g, "_") || "image";

  let preview;
  if (state.mode === "ask") {
    preview = `Save As → ${name}.jpg`;
  } else if (state.mode === "subfolder" && subfolder) {
    const folder = sanitizeFolderPath(subfolder);
    preview = folder ? `Downloads/${folder}/${name}.jpg` : `Downloads/${name}.jpg`;
  } else {
    preview = `Downloads/${name}.jpg`;
  }
  $("previewValue").textContent = preview;
}

// ── Autosave ─────────────────────────────────────────────

let _saveTimer;
function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveSettings, 300);
}

async function saveSettings() {
  // Don't persist a folder name Windows would reject.
  if (state.mode === "subfolder" && !validateSubfolder()) return;

  const next = {
    quality:          parseInt($("quality").value, 10),
    saveMode:         state.mode,
    saveSubfolder:    $("saveSubfolder").value.trim(),
    filenameTemplate: $("filenameTemplate").value.trim() || "{original}",
    conflictAction:   $("conflictAction").value,
    theme:            state.theme,
    language:         state.lang,
    showNotification: $("showNotification").checked,
    convertWebp:      $("convertWebp").checked,
    convertPng:       $("convertPng").checked,
    convertGif:       $("convertGif").checked,
    hideLogos:        $("hideLogos").checked,
    minImageSize:     parseInt($("minImageSize").value, 10)
  };

  await chrome.storage.sync.set(next);
  current = { ...current, ...next };
  cachePrefs(current);
  showToast(t.saved);
}

let _toastTimer;
function showToast(msg) {
  setIcon($("toastIcon"), "circle-check", 18);
  $("toastMsg").textContent = msg;
  $("toast").classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => $("toast").classList.remove("show"), 1800);
}

// ── Events ───────────────────────────────────────────────

function bindEvents() {
  // Navigation
  document.querySelectorAll(".nav-item").forEach(b =>
    b.addEventListener("click", () => openPane(b.dataset.pane)));
  $("nav").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(document.querySelectorAll(".nav-item"));
    const i = items.findIndex(b => b.getAttribute("aria-selected") === "true");
    const next = items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
    openPane(next.dataset.pane);
    next.focus();
  });

  // Save location
  document.querySelectorAll(".option").forEach(o =>
    o.addEventListener("click", () => {
      state.mode = o.dataset.mode;
      applyModeUI();
      scheduleSave();
    }));

  $("saveSubfolder").addEventListener("input", () => { validateSubfolder(); updatePreview(); scheduleSave(); });
  $("filenameTemplate").addEventListener("input", () => { updatePreview(); scheduleSave(); });
  $("conflictAction").addEventListener("change", scheduleSave);

  $("varChips").querySelectorAll(".chip").forEach(chip =>
    chip.addEventListener("click", () => {
      const input = $("filenameTemplate");
      const v = chip.dataset.var;
      const pos = input.selectionStart ?? input.value.length;
      input.value = input.value.slice(0, pos) + v + input.value.slice(input.selectionEnd ?? pos);
      input.selectionStart = input.selectionEnd = pos + v.length;
      input.focus();
      updatePreview();
      scheduleSave();
    }));

  // Switches
  ["showNotification", "convertWebp", "convertPng", "convertGif", "hideLogos"].forEach(id =>
    $(id).addEventListener("change", scheduleSave));

  // Sliders
  ["quality", "minImageSize"].forEach(id =>
    $(id).addEventListener("input", () => { updateBadges(); scheduleSave(); }));

  // Theme
  $("themeSegment").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => {
      state.theme = b.dataset.val;
      setSegment("themeSegment", state.theme);
      applyTheme(state.theme);
      scheduleSave();
    }));

  // Language — takes effect immediately
  $("langSegment").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => {
      state.lang = b.dataset.val;
      setSegment("langSegment", state.lang);
      t = I18N[resolveLang(state.lang)];
      applyLang();
      scheduleSave();
    }));
}

init();
