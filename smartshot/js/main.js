// SmartShot — popup logic
// Author: minhtrong67 (with AI support from Claude)

let settings = { ...DEFAULT_SETTINGS };
let historyCache = [];
let currentTab = null;

const $ = (id) => document.getElementById(id);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const TYPE_KEY = { visible: "typeVisible", fullpage: "typeFullPage", area: "typeArea" };
const META_KEY = { editor: "metaEditor", download: "metaDownload", clipboard: "metaClipboard" };

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
  // Debounced so rapid clicks don't hammer chrome.storage.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.saveSettings(settings), 120);
}

function isRestricted(url) {
  if (!url) return false; // unknown (no access to the URL) — let the capture try and report errors itself
  return /^(chrome|edge|brave|about|chrome-extension|chrome-search|chrome-untrusted|devtools|view-source|moz-extension):/i.test(url) ||
    /^https?:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com|microsoftedge\.microsoft\.com\/addons)/i.test(url);
}

/* ---------- capture ---------- */

function triggerCapture(captureType) {
  if (!currentTab) return;
  $$(".capture-card").forEach((b) => (b.disabled = true));
  chrome.runtime.sendMessage({ type: "capture", captureType, tabId: currentTab.id }, () => {
    void chrome.runtime.lastError;
    window.close(); // get out of the way of the area overlay / scrolling capture
  });
}

/* ---------- history ---------- */

function renderHistory(history) {
  const list = $("historyList");
  const frag = document.createDocumentFragment();
  $("clearHistoryBtn").hidden = !history.length;

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.innerHTML = lucide.svg("image", 32) + '<p class="t-label-lg"></p><p class="t-body-sm"></p>';
    li.children[1].textContent = i18n.t("historyEmpty");
    li.children[2].textContent = i18n.t("historyEmptySub");
    frag.appendChild(li);
  }

  history.forEach((item, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = Math.min(i, 8) * 30 + "ms";

    const img = document.createElement("img");
    img.className = "history-thumb";
    img.alt = "";
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
    meta.textContent = [i18n.t(TYPE_KEY[item.captureType] || "typeVisible"), i18n.t(META_KEY[item.action] || "metaEditor"), when].filter(Boolean).join(" · ");

    info.append(name, meta);
    li.append(img, info);
    frag.appendChild(li);
  });

  list.replaceChildren(frag);
}

/* ---------- settings <-> UI ---------- */

function setRadio(name, value) {
  $$(`input[name="${name}"]`).forEach((r) => (r.checked = r.value === String(value)));
}

function accentName(key) {
  return (ACCENT_NAMES[i18n.current] || ACCENT_NAMES.en)[key];
}

function buildSwatches() {
  const box = $("swatches");
  const frag = document.createDocumentFragment();
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
    b.innerHTML = lucide.svg("check", 16);
    frag.appendChild(b);
  });
  box.appendChild(frag);

  // One delegated listener instead of 19.
  box.addEventListener("click", (e) => {
    const b = e.target.closest(".swatch");
    if (!b) return;
    settings.accent = b.dataset.accent;
    themeManager.applyAccent(settings.accent);
    themeManager.mirror(settings);
    refreshSwatches();
    persist();
  });
}

function refreshSwatches() {
  $$(".swatch").forEach((b) => {
    const on = b.dataset.accent === settings.accent;
    b.setAttribute("aria-checked", String(on));
    const name = accentName(b.dataset.accent);
    b.title = name;
    b.setAttribute("aria-label", name);
  });
}

function applySettingsToUI() {
  setRadio("theme", settings.theme);
  setRadio("language", settings.language);
  $("langHint").hidden = settings.language !== "auto";
  $("openEditorToggle").checked = settings.openEditor;
  updateOpenEditorHint();
  refreshSwatches();
}

function updateOpenEditorHint() {
  $("openEditorHint").textContent = i18n.t(settings.openEditor ? "openEditorOn" : "openEditorOff");
}

function relocalize() {
  i18n.setLang(settings.language);
  updateOpenEditorHint();
  refreshSwatches();
  renderHistory(historyCache);
}

/* ---------- view switching ---------- */

function openSettings(open) {
  $("viewMain").classList.toggle("is-hidden", open);
  $("viewSettings").classList.toggle("is-hidden", !open);
  $("viewMain").inert = open;           // keep keyboard focus inside the visible view
  $("viewSettings").inert = !open;
  (open ? $("backBtn") : $("settingsBtn")).focus({ preventScroll: true });
}

/** Open the bundled landing page in a new tab (local file — no deployed URL needed).
 *  The current theme and language are passed in the hash so the page matches the extension. */
function openLanding() {
  const url = chrome.runtime.getURL("index.html") + `#theme=${settings.theme}&lang=${i18n.current}`;
  chrome.tabs.create({ url });
  window.close();
}

/* ---------- wiring ---------- */

function wire() {
  $("captureVisibleBtn").addEventListener("click", () => triggerCapture("visible"));
  $("captureFullPageBtn").addEventListener("click", () => triggerCapture("fullpage"));
  $("captureAreaBtn").addEventListener("click", () => triggerCapture("area"));

  $("settingsBtn").addEventListener("click", () => openSettings(true));
  $("backBtn").addEventListener("click", () => openSettings(false));
  $("landingBtn").addEventListener("click", openLanding);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("viewSettings").classList.contains("is-hidden")) {
      e.preventDefault();
      openSettings(false);
    }
  });

  $("clearHistoryBtn").addEventListener("click", async () => {
    await store.clearHistory();
    historyCache = [];
    renderHistory([]);
    showToast("toastCleared");
  });

  $$('input[name="theme"]').forEach((r) => r.addEventListener("change", () => {
    settings.theme = r.value;
    themeManager.apply(r.value);
    themeManager.mirror(settings);
    persist();
  }));

  $("openEditorToggle").addEventListener("change", (e) => {
    settings.openEditor = e.target.checked;
    updateOpenEditorHint();
    persist();
  });

  $$('input[name="language"]').forEach((r) => r.addEventListener("change", () => {
    settings.language = r.value;
    $("langHint").hidden = settings.language !== "auto";
    relocalize();
    persist();
  }));

  // Keep the popup in sync when settings change elsewhere (e.g. the editor tab).
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEY]) {
        const next = sanitizeSettings(changes[STORAGE_KEY].newValue);
        if (JSON.stringify(next) !== JSON.stringify(settings)) {
          settings = next;
          themeManager.applyAll(settings);
          applySettingsToUI();
          relocalize();
        }
      }
      if (changes[HISTORY_KEY]) {
        historyCache = Array.isArray(changes[HISTORY_KEY].newValue) ? changes[HISTORY_KEY].newValue : [];
        renderHistory(historyCache);
      }
    });
  }
}

/* ---------- init ---------- */

(async function init() {
  lucide.render();
  buildSwatches();
  wire();
  $("viewSettings").inert = true;

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
  $$(".capture-card").forEach((b) => (b.disabled = blocked));

  historyCache = await store.loadHistory();
  renderHistory(historyCache);
})();
