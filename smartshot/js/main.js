// SmartShot — popup logic
// Author: minhtrong67 (with AI support from Claude)

let settings = { ...DEFAULT_SETTINGS };
let historyCache = [];
let currentTab = null;

const $ = (id) => document.getElementById(id);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const TYPE_KEY = { visible: "typeVisible", fullpage: "typeFullPage", area: "typeArea" };
const META_KEY = { editor: "metaEditor", download: "metaDownload", clipboard: "metaClipboard" };
const THEME_ICON = { light: "sun", dark: "moon", system: "monitor" };

const ACCENT_NAMES = {
  en: { red: "Red", pink: "Pink", purple: "Purple", deepPurple: "Deep Purple", indigo: "Indigo", blue: "Blue", lightBlue: "Light Blue", cyan: "Cyan", teal: "Teal", green: "Green", lightGreen: "Light Green", lime: "Lime", yellow: "Yellow", amber: "Amber", orange: "Orange", deepOrange: "Deep Orange", brown: "Brown", grey: "Grey", blueGrey: "Blue Grey" },
  vi: { red: "Đỏ", pink: "Hồng", purple: "Tím", deepPurple: "Tím đậm", indigo: "Chàm", blue: "Xanh dương", lightBlue: "Xanh da trời", cyan: "Xanh lơ", teal: "Xanh mòng két", green: "Xanh lá", lightGreen: "Xanh lá nhạt", lime: "Vàng chanh", yellow: "Vàng", amber: "Hổ phách", orange: "Cam", deepOrange: "Cam đậm", brown: "Nâu", grey: "Xám", blueGrey: "Xám xanh" }
};

/* ---------- helpers ---------- */

let toastTimer = null;
function showToast(key) {
  const t = $("toast");
  t.textContent = i18n.t(key);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

let saveTimer = null;
function persist() {
  // Debounced so dragging a slider or rapid toggling doesn't hammer chrome.storage.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.saveSettings(settings), 150);
}

function setSlider(input) {
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty("--fill", pct + "%");
}

function isRestricted(url) {
  if (!url) return false; // unknown (no access to the URL) — let the capture try and report errors itself
  return /^(chrome|edge|brave|about|chrome-extension|chrome-search|chrome-untrusted|devtools|view-source|moz-extension):/i.test(url) ||
    /^https?:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com|microsoftedge\.microsoft\.com\/addons)/i.test(url);
}

/* ---------- capture ---------- */

function triggerCapture(captureType) {
  if (!currentTab) return;
  document.querySelectorAll(".capture-card").forEach((b) => (b.disabled = true));
  chrome.runtime.sendMessage({ type: "capture", captureType, tabId: currentTab.id }, () => {
    void chrome.runtime.lastError;
    window.close(); // get out of the way of the area overlay / scrolling capture
  });
}

/* ---------- history ---------- */

function renderHistory(history) {
  const list = $("historyList");
  list.innerHTML = "";
  $("clearHistoryBtn").hidden = !history.length;

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.innerHTML = lucide.svg("image", 32) + '<p class="t-label-lg"></p><p class="t-body-sm"></p>';
    li.children[1].textContent = i18n.t("historyEmpty");
    li.children[2].textContent = i18n.t("historyEmptySub");
    list.appendChild(li);
    return;
  }

  history.forEach((item, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = Math.min(i, 8) * 30 + "ms";

    const img = document.createElement("img");
    img.className = "history-thumb";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    if (item.thumbnail) img.src = item.thumbnail;

    const info = document.createElement("div");
    info.className = "history-info";
    const name = document.createElement("span");
    name.className = "history-name";
    name.textContent = item.filename || i18n.t(TYPE_KEY[item.captureType] || "typeVisible");
    const meta = document.createElement("span");
    meta.className = "history-meta";
    const when = item.ts ? new Date(item.ts).toLocaleTimeString(i18n.current, { hour: "2-digit", minute: "2-digit" }) : "";
    meta.textContent = [i18n.t(TYPE_KEY[item.captureType] || "typeVisible"), i18n.t(META_KEY[item.action] || "metaDownload"), when].filter(Boolean).join(" · ");

    info.append(name, meta);
    li.append(img, info);
    list.appendChild(li);
  });
}

/* ---------- settings <-> UI ---------- */

function setRadio(name, value) {
  $$(`input[name="${name}"]`).forEach((r) => (r.checked = r.value === String(value)));
}

function buildSwatches() {
  const box = $("swatches");
  box.innerHTML = "";
  Object.entries(ACCENT_COLORS).forEach(([key, hex]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch sl";
    b.dataset.accent = key;
    b.style.setProperty("--c", hex);
    b.setAttribute("role", "radio");
    // light swatches (lime, yellow, amber…) need dark ink for the check mark
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    if ((r * 299 + g * 587 + bl * 114) / 1000 > 160) b.classList.add("dark-ink");
    b.innerHTML = lucide.svg("check", 18);
    b.addEventListener("click", () => {
      settings.accent = key;
      themeManager.applyAccent(key);
      themeManager.mirror(settings);
      refreshSwatches();
      persist();
    });
    box.appendChild(b);
  });
  refreshSwatchNames();
}

function refreshSwatchNames() {
  $$(".swatch").forEach((b) => {
    const name = (ACCENT_NAMES[i18n.current] || ACCENT_NAMES.en)[b.dataset.accent];
    b.title = name;
    b.setAttribute("aria-label", name);
  });
}

function refreshSwatches() {
  $$(".swatch").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.accent === settings.accent)));
}

function buildFontSelect() {
  const sel = $("fontSelect");
  sel.innerHTML = "";
  Object.entries(FONT_OPTIONS).forEach(([key, f]) => {
    const o = document.createElement("option");
    o.value = key;
    o.textContent = key === "system" ? `${f.label}` : f.label;
    sel.appendChild(o);
  });
}

function updateFontPreview() {
  $("fontPreview").style.setProperty("--preview-font", (FONT_OPTIONS[settings.font] || FONT_OPTIONS.system).stack);
}

function syncThemeButton() {
  const b = $("themeToggleBtn");
  b.innerHTML = lucide.svg(THEME_ICON[settings.theme] || "monitor", 22);
}

function updateConditionalRows() {
  $("qualityItem").classList.toggle("is-collapsed", settings.format !== "jpeg");
  $("quickActionItem").classList.toggle("is-collapsed", settings.openEditorAfterCapture);
  $("historyCard").classList.toggle("hidden", !settings.showHistory);
}

function applySettingsToUI() {
  setRadio("theme", settings.theme);
  setRadio("fontSize", settings.fontSize);
  setRadio("format", settings.format);
  setRadio("historyLimit", settings.historyLimit);
  $("fontSelect").value = settings.font;
  $("languageSelect").value = settings.language;
  $("optShowHistory").checked = settings.showHistory;
  $("optOpenEditor").checked = settings.openEditorAfterCapture;
  $("afterCaptureSelect").value = settings.afterCapture;

  $("qualitySlider").value = settings.quality;
  $("qualityValue").textContent = settings.quality + "%";
  $("delaySlider").value = settings.fullPageDelay;
  $("delayValue").textContent = settings.fullPageDelay + " ms";
  setSlider($("qualitySlider"));
  setSlider($("delaySlider"));

  refreshSwatches();
  updateFontPreview();
  syncThemeButton();
  updateConditionalRows();
}

function relocalize() {
  i18n.setLang(settings.language);
  refreshSwatchNames();
  renderHistory(historyCache);
  $("fontPreview").textContent = i18n.t("fontPreview");
}

/* ---------- view switching ---------- */

function openSettings(open) {
  $("viewMain").classList.toggle("is-hidden", open);
  $("viewSettings").classList.toggle("is-hidden", !open);
  // keep keyboard focus inside the visible view
  (open ? $("backBtn") : $("settingsBtn")).focus({ preventScroll: true });
}

/* ---------- confirm dialog ---------- */

function confirmReset() {
  return new Promise((resolve) => {
    const dlg = $("confirmDialog");
    const done = (v) => { dlg.close(); resolve(v); };
    $("dlgCancel").onclick = () => done(false);
    $("dlgOk").onclick = () => done(true);
    dlg.oncancel = () => resolve(false);
    dlg.showModal();
  });
}

/* ---------- wiring ---------- */

function wire() {
  $("captureVisibleBtn").addEventListener("click", () => triggerCapture("visible"));
  $("captureFullPageBtn").addEventListener("click", () => triggerCapture("fullpage"));
  $("captureAreaBtn").addEventListener("click", () => triggerCapture("area"));

  $("settingsBtn").addEventListener("click", () => openSettings(true));
  $("backBtn").addEventListener("click", () => openSettings(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("viewSettings").classList.contains("is-hidden") && !$("confirmDialog").open) {
      e.preventDefault();
      openSettings(false);
    }
  });

  $("themeToggleBtn").addEventListener("click", () => {
    settings.theme = themeManager.cycle();
    themeManager.mirror(settings);
    setRadio("theme", settings.theme);
    syncThemeButton();
    persist();
  });

  $("clearHistoryBtn").addEventListener("click", async () => {
    await store.clearHistory();
    historyCache = [];
    renderHistory([]);
    showToast("toastCleared");
  });

  // Theme / font size / format / history limit (segmented radio groups)
  $$('input[name="theme"]').forEach((r) => r.addEventListener("change", () => {
    settings.theme = r.value;
    themeManager.apply(r.value);
    themeManager.mirror(settings);
    syncThemeButton();
    persist();
  }));
  $$('input[name="fontSize"]').forEach((r) => r.addEventListener("change", () => {
    settings.fontSize = r.value;
    themeManager.applyFontSize(r.value);
    themeManager.mirror(settings);
    persist();
  }));
  $$('input[name="format"]').forEach((r) => r.addEventListener("change", () => {
    settings.format = r.value;
    updateConditionalRows();
    persist();
  }));
  $$('input[name="historyLimit"]').forEach((r) => r.addEventListener("change", async () => {
    settings.historyLimit = parseInt(r.value, 10);
    persist();
    historyCache = historyCache.slice(0, settings.historyLimit);
    await store.saveHistory(historyCache);
    renderHistory(historyCache);
  }));

  $("fontSelect").addEventListener("change", (e) => {
    settings.font = e.target.value;
    themeManager.applyFont(settings.font);
    themeManager.mirror(settings);
    updateFontPreview();
    persist();
  });
  $("languageSelect").addEventListener("change", (e) => {
    settings.language = e.target.value;
    relocalize();
    persist();
  });

  $("optShowHistory").addEventListener("change", (e) => { settings.showHistory = e.target.checked; updateConditionalRows(); persist(); });
  $("optOpenEditor").addEventListener("change", (e) => { settings.openEditorAfterCapture = e.target.checked; updateConditionalRows(); persist(); });
  $("afterCaptureSelect").addEventListener("change", (e) => { settings.afterCapture = e.target.value; persist(); });

  const quality = $("qualitySlider");
  quality.addEventListener("input", () => { $("qualityValue").textContent = quality.value + "%"; setSlider(quality); });
  quality.addEventListener("change", () => { settings.quality = parseInt(quality.value, 10); persist(); });
  const delay = $("delaySlider");
  delay.addEventListener("input", () => { $("delayValue").textContent = delay.value + " ms"; setSlider(delay); });
  delay.addEventListener("change", () => { settings.fullPageDelay = parseInt(delay.value, 10); persist(); });

  // Export / import / reset
  $("exportSettingsBtn").addEventListener("click", async () => {
    const data = await store.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `smartshot-settings-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast("toastExported");
  });
  $("importSettingsBtn").addEventListener("click", () => $("importSettingsFile").click());
  $("importSettingsFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("too big");
      settings = await store.importAll(JSON.parse(await file.text()));
      themeManager.applyAll(settings);
      historyCache = await store.loadHistory();
      applySettingsToUI();
      relocalize();
      showToast("toastImported");
    } catch (err) {
      showToast("toastImportFailed");
    } finally {
      e.target.value = "";
    }
  });
  $("resetBtn").addEventListener("click", async () => {
    if (!(await confirmReset())) return;
    settings = await store.resetSettings();
    themeManager.applyAll(settings);
    applySettingsToUI();
    relocalize();
    showToast("toastReset");
  });
}

/* ---------- init ---------- */

(async function init() {
  lucide.render();
  buildSwatches();
  buildFontSelect();
  wire();

  settings = await store.loadSettings();
  i18n.setLang(settings.language);          // "auto" → device language, applied immediately
  themeManager.applyAll(settings);
  themeManager.watchSystemChanges();
  applySettingsToUI();
  relocalize();

  $("versionChip").textContent = "v" + chrome.runtime.getManifest().version;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab || null;
  const blocked = !tab || isRestricted(tab.url);
  $("restrictedBanner").hidden = !blocked;
  document.querySelectorAll(".capture-card").forEach((b) => (b.disabled = blocked));

  historyCache = await store.loadHistory();
  renderHistory(historyCache);
})();
