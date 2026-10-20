// options.js — auto-saving settings page. Every control carries data-setting="<key>".

let t = makeT("en");
let settings = {};
const $ = (id) => document.getElementById(id);
const EMBEDDED = new URLSearchParams(location.search).has("embedded");
if (EMBEDDED) document.documentElement.classList.add("embedded"), document.addEventListener("DOMContentLoaded", () => document.body.classList.add("embedded"));
const closeEmbedded = () => parent.postMessage({ type: "CLOSE_SETTINGS" }, location.origin);

async function init() {
  renderIcons();
  settings = await getSettings();
  setAppearance(pickAppearance(settings));
  buildSwatches();
  buildFontGrid();
  bind();
  localize();
  syncAll();
  $("repoLink").href = REPO_URL;
  $("aboutVersion").textContent = t("version", chrome.runtime.getManifest().version);
  document.body.classList.add("ready");
}

const pickAppearance = (s) => Object.fromEntries(APPEARANCE_KEYS.map((k) => [k, s[k]]));

// ── Dynamic controls ─────────────────────────────────────────
const isLightColor = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};

function buildSwatches() {
  $("swatches").innerHTML = Object.keys(MD_THEMES).map((k) => {
    const seed = MD_THEMES[k].seed;
    return `<button type="button" class="swatch ripple" role="radio" data-value="${k}" aria-checked="false" ` +
      `style="--c:${seed};--on:${isLightColor(seed) ? "#1b1b1b" : "#fff"}">${lucideSvg("check", 20)}</button>`;
  }).join("");
}

function buildFontGrid() {
  $("fontGrid").innerHTML = FONTS.map((f) =>
    `<button type="button" class="font-card sl ripple" role="radio" data-value="${f.id}" aria-checked="false" style="font-family:${f.stack.replace(/"/g, "&quot;")}">` +
    `<span class="aa">Aa</span><span class="fname" data-font="${f.id}"></span></button>`).join("");
}

/** (Re)applies the current language to every piece of text, including generated ones. */
function localize() {
  const lang = resolveLang(settings.language);
  t = makeT(lang);
  document.documentElement.lang = lang;
  document.title = t("appName") + " — " + t("settings");
  applyI18n(t);
  FONTS.forEach((f) => { const el = document.querySelector(`[data-font="${f.id}"]`); if (el) el.textContent = f.name || t("fontSystem"); });
  document.querySelectorAll(".swatch").forEach((b) => {
    const name = t("color_" + b.dataset.value);
    b.title = name; b.setAttribute("aria-label", name);
  });
  const opts = $("conflictAction").options;
  ["uniquify", "overwrite", "prompt"].forEach((k, i) => { opts[i].textContent = t(k); });
  $("previewText").textContent = t("previewText");
  $("aboutVersion").textContent = t("version", chrome.runtime.getManifest().version);
  updateFilenamePreview();
}

// ── Syncing UI ← settings ────────────────────────────────────
function syncAll() {
  document.querySelectorAll("[data-setting]").forEach(syncControl);
  updateSubfolderVisibility();
  updateFilenamePreview();
}

function syncControl(el) {
  const key = el.dataset.setting, v = settings[key];
  if (el.getAttribute("role") === "radiogroup") {
    el.querySelectorAll("[data-value]").forEach((b) => b.setAttribute("aria-checked", String(String(v) === b.dataset.value)));
  } else if (el.type === "checkbox") {
    el.checked = !!v;
  } else if (el.type === "range") {
    el.value = v;
    paintRange(el);
  } else if (el.value !== String(v == null ? "" : v)) {
    el.value = v == null ? "" : v;
  }
}

function paintRange(el) {
  const min = +el.min, max = +el.max;
  el.style.setProperty("--p", ((el.value - min) / (max - min)) * 100 + "%");
  const out = $(el.dataset.out || el.id + "Out");
  if (out) out.textContent = el.value + (el.dataset.unit != null ? el.dataset.unit : el.dataset.setting === "fontSize" ? " px" : "");
}

const updateSubfolderVisibility = () => $("subfolderWrap").classList.toggle("open", settings.saveMode === "subfolder");

function updateFilenamePreview() {
  const mock = { ...settings, filenameTemplate: $("filenameTemplate").value || "{original}" };
  const path = buildDownloadPath("https://example.com/images/photo_sunset.png", mock, "jpg", { index: 1 });
  $("previewValue").textContent = settings.saveMode === "ask" ? "[Save As] → " + path.split("/").pop() : "Downloads/" + path;
}

// ── Saving ───────────────────────────────────────────────────
let _savedTimer;
function flashSaved() {
  const el = $("savedStatus");
  el.classList.add("show");
  clearTimeout(_savedTimer);
  _savedTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function commit(key, value, persist = true) {
  settings[key] = value;
  const el = document.querySelector(`[data-setting="${key}"]`);
  if (el) syncControl(el);

  if (APPEARANCE_KEYS.includes(key)) setAppearance({ [key]: value });
  if (key === "language") localize();
  if (key === "saveMode") { updateSubfolderVisibility(); updateFilenamePreview(); }
  if (key === "saveSubfolder" || key === "filenameTemplate") updateFilenamePreview();

  if (persist) {
    chrome.storage.sync.set({ [key]: value }).then(flashSaved).catch(() => showSnackbar(t("saveFailed"), null, true));
  }
}

// ── Events ───────────────────────────────────────────────────
function bind() {
  document.querySelectorAll("[data-setting]").forEach((el) => {
    const key = el.dataset.setting;
    if (el.getAttribute("role") === "radiogroup") {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-value]");
        if (b && el.contains(b)) commit(key, b.dataset.value);
      });
    } else if (el.type === "checkbox") {
      el.addEventListener("change", () => commit(key, el.checked));
    } else if (el.type === "range") {
      el.addEventListener("input", () => {
        paintRange(el);
        if (key === "fontSize") setAppearance({ fontSize: +el.value }); // live preview while dragging
      });
      el.addEventListener("change", () => commit(key, +el.value));
    } else if (el.tagName === "SELECT") {
      el.addEventListener("change", () => commit(key, el.value));
    } else {
      const save = debounce(() => commit(key, el.value.trim()), 350);
      el.addEventListener("input", () => {
        if (key === "saveSubfolder") {
          const bad = INVALID_FOLDER_CHARS.test(el.value);
          el.classList.toggle("invalid", bad);
          $("subfolderError").classList.toggle("show", bad);
          if (bad) return;
        }
        if (key === "filenameTemplate") settings.filenameTemplate = el.value, updateFilenamePreview();
        save();
      });
    }
  });

  $("varChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-var]");
    if (!b) return;
    const input = $("filenameTemplate");
    const s = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + b.dataset.var + input.value.slice(en);
    input.selectionStart = input.selectionEnd = s + b.dataset.var.length;
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Embedded mode: back button / Escape return to the popup
  $("btnBack").addEventListener("click", closeEmbedded);
  document.addEventListener("keydown", (e) => {
    if (EMBEDDED && e.key === "Escape" && !$("resetDialog").open) closeEmbedded();
  });

  // Reset to defaults
  const dlg = $("resetDialog");
  $("btnReset").addEventListener("click", () => dlg.showModal());
  $("resetCancel").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // click on backdrop
  $("resetConfirm").addEventListener("click", async () => {
    dlg.close();
    await chrome.storage.sync.clear();
    settings = await getSettings();
    setAppearance(pickAppearance(settings));
    localize();
    syncAll();
    flashSaved();
    showSnackbar(t("savedStatus"));
  });

  // Keep in sync when the popup changes a setting (e.g. grid/list toggle).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const k in changes) {
      if (changes[k].newValue === undefined || settings[k] === changes[k].newValue) continue;
      settings[k] = changes[k].newValue;
      const el = document.querySelector(`[data-setting="${k}"]`);
      if (el) syncControl(el);
    }
  });
}

init();
