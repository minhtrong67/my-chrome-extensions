/* Password Generator — popup controller */

const $ = (id) => document.getElementById(id);
const LANDING_PATH = "index.html"; // bundled landing page (opened from inside the extension package)

let settings = { ...DEFAULT_SETTINGS };
let current = "";

/* ---------- helpers ---------- */
let toastTimer;
function toast(key) {
  const el = $("snackbar");
  el.textContent = i18n.t(key);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.saveSettings(settings), 120);
}

function setPct(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty("--pct", pct + "%");
}

function schedule(fn) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  };
}

/* ---------- rendering ---------- */
function renderValue(value, animate) {
  const out = $("result");
  out.textContent = "";
  if (!value) {
    out.classList.add("is-empty");
    out.dataset.size = "l";
    out.textContent = "—";
    return;
  }
  out.classList.remove("is-empty");
  out.dataset.size = value.length <= 18 ? "l" : value.length <= 30 ? "m" : "s";
  const wrap = document.createElement("span");
  for (const ch of value) {
    const s = document.createElement("span");
    s.textContent = ch;
    if (/[0-9]/.test(ch)) s.className = "d";
    else if (!/[\p{L}]/u.test(ch) && ch !== " ") s.className = "s";
    wrap.appendChild(s);
  }
  out.appendChild(wrap);
  if (animate) {
    out.classList.remove("pop");
    void out.offsetWidth;
    out.classList.add("pop");
  }
}

function formatCrack(bits) {
  const sec = generator.crackSeconds(bits);
  const YEAR = 31557600;
  const c = (k, n) => i18n.t("crack." + k, n);
  if (sec < 1) return c("instant");
  if (sec < 60) return c("seconds", Math.round(sec));
  if (sec < 3600) return c("minutes", Math.round(sec / 60));
  if (sec < 86400) return c("hours", Math.round(sec / 3600));
  if (sec < YEAR) return c("days", Math.round(sec / 86400));
  const y = sec / YEAR;
  if (y < 1000) return c("years", Math.round(y));
  if (y < 1e6) return c("thousandYears", Math.round(y / 1e3));
  if (y < 1e9) return c("millionYears", Math.round(y / 1e6));
  return c("billionYears");
}

let lastBits = 0;
function renderStrength(bits) {
  lastBits = bits;
  const lvl = generator.score(bits);
  const fill = $("meterFill");
  if (lvl < 0) {
    fill.style.width = "0%";
    $("strengthLabel").textContent = "—";
    $("crackTime").textContent = "—";
    $("meter").setAttribute("aria-valuenow", 0);
    return;
  }
  const meter = $("meter");
  meter.style.setProperty("--c", `var(--lv${lvl})`);
  meter.parentElement.style.setProperty("--c", `var(--lv${lvl})`);
  fill.style.width = (lvl + 1) * 20 + "%";
  meter.setAttribute("aria-valuenow", lvl);
  $("strengthLabel").textContent = i18n.t("strength")[lvl];
  $("crackTime").textContent = formatCrack(bits);
}

function generate({ save = false, animate = false } = {}) {
  const s = settings;
  const out = s.mode === "passphrase" ? generator.generatePassphrase(s)
            : s.mode === "pin" ? generator.generatePin(s)
            : generator.generatePassword(s);
  if (out.error) {
    current = "";
    renderValue("", false);
    renderStrength(0);
    toast(out.error);
    return;
  }
  current = out.value;
  renderValue(out.value, animate);
  renderStrength(out.bits);
  if (out.warning) toast(out.warning);
  if (save) remember(out.value);
}

const liveGenerate = schedule(() => generate({ animate: false }));

/* ---------- history ---------- */
async function remember(value) {
  renderHistory(await store.addToHistory(value), true);
}

function renderHistory(list, animateFirst = false) {
  const ul = $("historyList");
  ul.textContent = "";
  $("clearHistory").hidden = list.length === 0;
  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = i18n.t("historyEmpty");
    ul.appendChild(li);
    return;
  }
  list.forEach((value, i) => {
    const li = document.createElement("li");
    if (animateFirst && i === 0) li.className = "new";
    const b = document.createElement("button");
    b.type = "button";
    b.title = i18n.t("copy");
    const code = document.createElement("code");
    code.textContent = value;
    b.appendChild(code);
    b.insertAdjacentHTML("beforeend", icons.svg("copy"));
    b.addEventListener("click", () => copy(value, false));
    li.appendChild(b);
    ul.appendChild(li);
  });
}

/* ---------- clipboard ---------- */
async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove();
    return ok;
  }
}

let copiedTimer;
async function copy(value, fromMain = true) {
  if (!value) return;
  if (!(await writeClipboard(value))) { toast("toastCopyFailed"); return; }
  toast("toastCopied");
  if (fromMain) {
    const btn = $("copyBtn");
    btn.classList.add("is-copied");
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => btn.classList.remove("is-copied"), 1400);
    remember(value); // anything the user copied should be recoverable
  }
}

/* ---------- applying settings to the UI ---------- */
const SLIDERS = [["length", "lengthOut"], ["wordCount", "wordCountOut"], ["pinLength", "pinLengthOut"]];
const TOGGLES = ["upper", "lower", "numbers", "symbols", "excludeAmbiguous", "noDuplicate", "capitalize", "addNumber"];

function applyMode() {
  const m = settings.mode;
  document.querySelectorAll("#modeTabs .seg").forEach((b) => {
    const on = b.dataset.mode === m;
    b.classList.toggle("is-selected", on);
    b.setAttribute("aria-selected", on);
  });
  $("optsPassword").hidden = m !== "password";
  $("optsPassphrase").hidden = m !== "passphrase";
  $("optsPin").hidden = m !== "pin";
  $("generateLabel").textContent = i18n.t(m === "passphrase" ? "generatePassphrase" : m === "pin" ? "generatePin" : "generatePassword");
}

function applySettingsToUI() {
  SLIDERS.forEach(([key, outId]) => {
    const el = $(key);
    el.value = settings[key];
    $(outId).textContent = settings[key];
    setPct(el);
  });
  TOGGLES.forEach((k) => { $(k).checked = settings[k]; });
  $("customExclude").value = settings.customExclude;
  document.querySelectorAll('input[name="sep"]').forEach((r) => { r.checked = r.value === settings.separator; });
  applyMode();
  syncSettingsView();
}

function syncSettingsView() {
  document.querySelectorAll("#themeSeg .seg").forEach((b) => {
    const on = b.dataset.value === settings.theme;
    b.classList.toggle("is-selected", on);
    b.setAttribute("aria-checked", on);
  });
  document.querySelectorAll("#langSeg .seg").forEach((b) => {
    const on = b.dataset.value === settings.language;
    b.classList.toggle("is-selected", on);
    b.setAttribute("aria-checked", on);
  });
  document.querySelectorAll("#swatches .swatch").forEach((b) => b.setAttribute("aria-checked", b.dataset.color === settings.color));
  $("colorName").textContent = i18n.t("colorNames." + settings.color);
}

function buildSwatches() {
  const wrap = $("swatches");
  MD_COLORS.forEach((name) => {
    const hex = MD_SEEDS[name];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.color = name;
    b.setAttribute("role", "radio");
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
    const light = 0.299 * r + 0.587 * g + 0.114 * bl > 160; // pick a legible check-mark colour
    b.style.setProperty("--sw", hex);
    b.style.setProperty("--sw-on", light ? "#1b1b1b" : "#ffffff");
    b.innerHTML = icons.svg("check");
    b.addEventListener("click", () => {
      settings.color = name;
      themeManager.applyColor(name);
      syncSettingsView();
      persist();
    });
    wrap.appendChild(b);
  });
}

function refreshTexts() {
  i18n.apply();
  document.querySelectorAll("#swatches .swatch").forEach((b) => {
    const n = i18n.t("colorNames." + b.dataset.color);
    b.title = n;
    b.setAttribute("aria-label", n);
  });
  applyMode();
  syncSettingsView();
  renderStrength(lastBits);
  store.loadHistory().then((l) => renderHistory(l));
}

/* ---------- navigation ---------- */
function showSettings(open) {
  const main = $("viewMain"), set = $("viewSettings");
  main.classList.toggle("is-left", open);
  main.inert = open;
  set.classList.toggle("is-right", !open);
  set.inert = !open;
  set.setAttribute("aria-hidden", String(!open));
  (open ? $("backBtn") : $("settingsBtn")).focus({ preventScroll: true });
}

function openLanding() {
  const q = new URLSearchParams({ theme: settings.theme, color: settings.color, lang: settings.language });
  const url = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL(LANDING_PATH) : LANDING_PATH;
  const full = `${url}#${q}`;
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: full });
  else window.open(full, "_blank", "noopener");
}

/* ---------- events ---------- */
function bind() {
  $("settingsBtn").addEventListener("click", () => showSettings(true));
  $("backBtn").addEventListener("click", () => showSettings(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("viewMain").inert) { e.preventDefault(); showSettings(false); }
  });

  document.querySelectorAll("#modeTabs .seg").forEach((b) => b.addEventListener("click", () => {
    if (settings.mode === b.dataset.mode) return;
    settings.mode = b.dataset.mode;
    applyMode();
    persist();
    generate({ animate: true });
  }));

  SLIDERS.forEach(([key, outId]) => {
    const el = $(key);
    el.addEventListener("input", () => {
      settings[key] = parseInt(el.value, 10);
      $(outId).textContent = el.value;
      setPct(el);
      liveGenerate();
    });
    el.addEventListener("change", persist);
  });

  TOGGLES.forEach((k) => $(k).addEventListener("change", () => {
    settings[k] = $(k).checked;
    persist();
    generate();
  }));

  let exTimer;
  $("customExclude").addEventListener("input", (e) => {
    settings.customExclude = e.target.value;
    clearTimeout(exTimer);
    exTimer = setTimeout(() => { persist(); generate(); }, 200);
  });

  document.querySelectorAll('input[name="sep"]').forEach((r) => r.addEventListener("change", () => {
    settings.separator = r.value;
    persist();
    generate();
  }));

  $("advToggle").addEventListener("click", () => {
    const open = $("advToggle").getAttribute("aria-expanded") !== "true";
    $("advToggle").setAttribute("aria-expanded", open);
    $("advPanel").classList.toggle("open", open);
    if (open) setTimeout(() => $("advPanel").scrollIntoView({ block: "nearest", behavior: "smooth" }), 330);
  });

  const spin = (btn) => { btn.classList.remove("spin"); void btn.offsetWidth; btn.classList.add("spin"); };
  const explicit = () => { generate({ save: true, animate: true }); spin($("regenBtn")); spin($("generateBtn")); };
  $("generateBtn").addEventListener("click", explicit);
  $("regenBtn").addEventListener("click", explicit);
  $("copyBtn").addEventListener("click", () => copy(current));
  $("clearHistory").addEventListener("click", async () => {
    await store.clearHistory();
    renderHistory([]);
    toast("toastCleared");
  });

  $("themeSeg").addEventListener("click", (e) => {
    const b = e.target.closest(".seg");
    if (!b) return;
    settings.theme = b.dataset.value;
    themeManager.apply(settings.theme);
    syncSettingsView();
    persist();
  });
  $("langSeg").addEventListener("click", (e) => {
    const b = e.target.closest(".seg");
    if (!b) return;
    settings.language = b.dataset.value;
    i18n.set(settings.language);
    refreshTexts();
    persist();
  });
  $("landingBtn").addEventListener("click", openLanding);
}

/* ---------- init ---------- */
(async function init() {
  icons.hydrate();
  settings = await store.loadSettings();
  themeManager.apply(settings.theme);
  themeManager.applyColor(settings.color);
  themeManager.watch();
  i18n.set(settings.language);
  try { $("version").textContent = chrome.runtime.getManifest().version; } catch (_) { $("version").textContent = "3.0.0"; }
  buildSwatches();
  applySettingsToUI();
  refreshTexts();
  bind();
  generate();
  store.saveSettings(settings); // refresh the synchronous theme mirror used by boot.js
})();
