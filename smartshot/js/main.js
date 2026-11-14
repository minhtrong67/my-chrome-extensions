// SmartShot — popup logic
// Author: minhtrong67 (with AI support from Claude)

let settings = { ...DEFAULT_SETTINGS };
let historyCache = [];
let currentTab = null;

const $ = (id) => document.getElementById(id);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const TYPE_KEY = { visible: "typeVisible", fullpage: "typeFullPage", area: "typeArea" };

/* ---------- helpers ---------- */

let toastTimer = null;
/** Fluent toast; pass { label, onClick } to show an action button (e.g. Undo). */
function showToast(key, action) {
  const t = $("toast");
  const btn = $("toastAction");
  $("toastText").textContent = i18n.t(key);
  btn.hidden = !action;
  btn.onclick = null;
  if (action) {
    btn.textContent = i18n.t(action.labelKey);
    btn.onclick = () => { hideToast(); action.onClick(); };
  }
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 6000 : 2400);
}

function hideToast() {
  $("toast").classList.remove("show");
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

/** Show each command's real shortcut (the user may have changed it) on its card. */
async function loadShortcuts() {
  if (!chrome.commands || !chrome.commands.getAll) return;
  try {
    const commands = await chrome.commands.getAll();
    commands.forEach((c) => {
      const chip = document.querySelector(`[data-cmd="${c.name}"]`);
      if (!chip) return;
      chip.textContent = c.shortcut || "";
      chip.hidden = !c.shortcut;
    });
  } catch (e) { /* ignore */ }
}

/* ---------- history ---------- */

function formatWhen(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString(i18n.current, { hour: "2-digit", minute: "2-digit" });
  return sameDay ? time : `${d.toLocaleDateString(i18n.current, { day: "numeric", month: "short" })}, ${time}`;
}

async function revealInFolder(item) {
  try {
    const [d] = item.downloadId ? await chrome.downloads.search({ id: item.downloadId }) : [];
    if (!d || !d.exists) return showToast("toastFileMissing");
    chrome.downloads.show(d.id);
  } catch (e) {
    showToast("toastFileMissing");
  }
}

function renderHistory(history) {
  const list = $("historyList");
  const frag = document.createDocumentFragment();
  $("clearHistoryBtn").hidden = !history.length;

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.innerHTML = lucide.svg("image", 28) + '<p class="body-strong"></p><p class="caption"></p>';
    li.children[1].textContent = i18n.t("historyEmpty");
    li.children[2].textContent = i18n.t("historyEmptySub");
    frag.appendChild(li);
  }

  history.forEach((item) => {
    const li = document.createElement("li");
    const row = document.createElement("button");
    row.type = "button";
    row.className = "history-item";
    row.title = `${item.filename}\n${i18n.t("showInFolder")}`;
    row.setAttribute("aria-label", `${item.filename} — ${i18n.t("showInFolder")}`);

    const img = document.createElement("img");
    img.className = "history-thumb";
    img.alt = "";
    img.decoding = "async";
    if (item.thumbnail) img.src = item.thumbnail;

    const info = document.createElement("span");
    info.className = "history-info";
    const name = document.createElement("span");
    name.className = "history-name";
    name.textContent = i18n.t(TYPE_KEY[item.captureType] || "typeVisible");
    const meta = document.createElement("span");
    meta.className = "history-meta";
    meta.textContent = formatWhen(item.ts);
    info.append(name, meta);

    row.append(img, info);
    row.insertAdjacentHTML("beforeend", lucide.svg("folder-open", 18));
    row.addEventListener("click", () => revealInFolder(item));
    li.appendChild(row);
    frag.appendChild(li);
  });

  list.replaceChildren(frag);
}

/* ---------- settings <-> UI ---------- */

function setRadio(name, value) {
  $$(`input[name="${name}"]`).forEach((r) => (r.checked = r.value === String(value)));
}

function applySettingsToUI() {
  setRadio("theme", settings.theme);
  $("languageSelect").value = settings.language;
}

function relocalize() {
  i18n.setLang(settings.language);
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

/* ---------- wiring ---------- */

function wire() {
  $("captureVisibleBtn").addEventListener("click", () => triggerCapture("visible"));
  $("captureFullPageBtn").addEventListener("click", () => triggerCapture("fullpage"));
  $("captureAreaBtn").addEventListener("click", () => triggerCapture("area"));

  $("settingsBtn").addEventListener("click", () => openSettings(true));
  $("backBtn").addEventListener("click", () => openSettings(false));
  $("shortcutsBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    window.close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("viewSettings").classList.contains("is-hidden")) {
      e.preventDefault();
      openSettings(false);
    }
  });

  $("clearHistoryBtn").addEventListener("click", async () => {
    const snapshot = historyCache;
    await store.clearHistory();
    historyCache = [];
    renderHistory([]);
    showToast("toastCleared", {
      labelKey: "undo",
      onClick: async () => {
        await store.saveHistory(snapshot);
        historyCache = snapshot;
        renderHistory(snapshot);
      }
    });
  });

  $$('input[name="theme"]').forEach((r) => r.addEventListener("change", () => {
    settings.theme = r.value;
    themeManager.apply(r.value);
    themeManager.mirror(settings);
    persist();
  }));

  $("languageSelect").addEventListener("change", (e) => {
    settings.language = e.target.value;
    relocalize();
    persist();
  });

  // Keep the popup in sync when settings or history change elsewhere.
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
        const raw = changes[HISTORY_KEY].newValue;
        historyCache = Array.isArray(raw) ? raw.filter((h) => h && h.filename && Number.isInteger(h.downloadId)) : [];
        renderHistory(historyCache);
      }
    });
  }
}

/* ---------- init ---------- */

(async function init() {
  lucide.render();
  wire();
  $("viewSettings").inert = true;

  settings = await store.loadSettings();
  i18n.setLang(settings.language);          // "auto" → device language, applied immediately
  themeManager.applyAll(settings);
  themeManager.watchSystemChanges();
  applySettingsToUI();
  relocalize();
  $("versionChip").textContent = "v" + chrome.runtime.getManifest().version;
  loadShortcuts();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab || null;
  const blocked = !tab || isRestricted(tab.url);
  $("restrictedBanner").hidden = !blocked;
  $$(".capture-card").forEach((b) => (b.disabled = blocked));

  historyCache = await store.loadHistory();
  renderHistory(historyCache);
})();
