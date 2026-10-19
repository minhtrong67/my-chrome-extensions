/**
 * options.js — the full settings page (opens in its own tab).
 * Structure: state -> render() -> DOM. Handlers only call update(), which
 * merges a partial change into storage; render() is the single place that
 * paints the UI, so the page can never drift out of sync with saved state.
 */
const $ = (id) => document.getElementById(id);

let settings = { ...DEFAULT_SETTINGS };
let dragging = false;
let currentTab = null;

const TOGGLES = {
  optEnabled: "enabled",
  optUseCustom: "useCustomColumns",
  optPerPage: "perPageColumns",
  optShowPreview: "showPreview",
  optHideShorts: "hideShorts",
  optCompactCards: "compactCards",
  optHideComments: "hideComments",
  optHideEndCards: "hideEndCards",
  optFocusMode: "focusMode"
};

const PER_PAGE = [
  { slider: "sliderHome", value: "valueHome", key: "columnsHome" },
  { slider: "sliderSubs", value: "valueSubs", key: "columnsSubscriptions" },
  { slider: "sliderChannel", value: "valueChannel", key: "columnsChannel" }
];

const TABS = ["layout", "appearance", "backup", "about"];

/* ---------- Helpers ---------- */

let pendingWrites = 0; // saves in flight; storage echoes of them are ignored
function update(partial) {
  settings = { ...settings, ...partial };
  pendingWrites++;
  store.patch(partial).finally(() => { pendingWrites--; });
}

/** Make a container of [role=radio] buttons behave like a native radio group. */
function radioGroup(container, getValue, onSelect) {
  const items = () => [...container.querySelectorAll('[role="radio"]')];
  container.addEventListener("click", (e) => {
    const btn = e.target.closest('[role="radio"]');
    if (btn && container.contains(btn)) onSelect(btn.dataset.value);
  });
  container.addEventListener("keydown", (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const list = items();
    const i = list.findIndex((b) => b.dataset.value === getValue());
    const next = list[(i + keys[e.key] + list.length) % list.length];
    next.focus();
    onSelect(next.dataset.value);
  });
}

function syncRadioGroup(container, value) {
  container.querySelectorAll('[role="radio"]').forEach((btn) => {
    const on = btn.dataset.value === value;
    btn.setAttribute("aria-checked", String(on));
    btn.tabIndex = on ? 0 : -1; // roving tabindex
  });
}

/* ---------- Static pieces built once ---------- */

function buildSliders() {
  for (const el of ["columnsSlider", "sliderHome", "sliderSubs", "sliderChannel"]) {
    $(el).min = COLUMN_MIN;
    $(el).max = COLUMN_MAX;
  }
  $("ticks").innerHTML = Array.from({ length: COLUMN_MAX - COLUMN_MIN + 1 }, (_, i) => `<span>${COLUMN_MIN + i}</span>`).join("");
}

function buildSwatches() {
  $("swatches").innerHTML = THEME_COLORS.map(
    (c) => `<button class="swatch" role="radio" data-value="${c.id}" data-ripple style="--sw:${c.hex}">${Icons.svg("check")}</button>`
  ).join("");
}

function buildFontChips() {
  $("fontChips").innerHTML = FONTS.map((f) => {
    const family = f.id === "system" ? "var(--yg-system-font)" : `'${f.label}', var(--yg-system-font)`;
    return `<button class="chip" role="radio" data-value="${f.id}" data-ripple style="font-family:${family}">${Icons.svg("check")}<span>${f.label || ""}</span></button>`;
  }).join("");
}

/* ---------- Render ---------- */

function renderColumns() {
  const el = $("columnsValue");
  if (el.textContent !== String(settings.columns)) {
    el.textContent = settings.columns;
    UI.bump(el);
  }
  $("columnsSlider").value = settings.columns;
  UI.sliderFill($("columnsSlider"));
  $("ticks").querySelectorAll("span").forEach((t) => t.classList.toggle("on", Number(t.textContent) === settings.columns));

  for (const { slider, value, key } of PER_PAGE) {
    $(slider).value = settings[key];
    $(value).textContent = settings[key];
    UI.sliderFill($(slider));
  }
  const shown = settings.perPageColumns ? settings.columnsHome : settings.columns;
  UI.renderPreview($("preview"), shown);
}

function render() {
  Appearance.apply(settings);
  i18n.setLang(settings.language);
  i18n.apply();

  for (const [id, key] of Object.entries(TOGGLES)) $(id).checked = settings[key];

  // Layout
  $("defaultNote").hidden = settings.useCustomColumns;
  $("columnsCollapse").classList.toggle("open", settings.useCustomColumns);
  $("columnsCollapse").firstElementChild.inert = !settings.useCustomColumns;
  $("simpleBlock").hidden = settings.perPageColumns;
  $("perPageBlock").hidden = !settings.perPageColumns;
  $("preview").hidden = !settings.showPreview;
  if (!dragging) renderColumns();
  $("content").classList.toggle("is-off", !settings.enabled);

  // Appearance
  syncRadioGroup($("modeGroup"), settings.theme);
  syncRadioGroup($("sizeGroup"), settings.fontSize);
  syncRadioGroup($("langGroup"), settings.language);
  syncRadioGroup($("swatches"), settings.themeColor);
  syncRadioGroup($("fontChips"), settings.font);
  $("swatches").querySelectorAll(".swatch").forEach((b) => {
    b.title = i18n.colorName(b.dataset.value);
    b.setAttribute("aria-label", i18n.colorName(b.dataset.value));
  });
  $("colorName").textContent = i18n.colorName(settings.themeColor);
  $("fontChips").querySelector('[data-value="system"] span').textContent = i18n.t("fontSystem");
}

/* ---------- Navigation ---------- */

function showTab(name, { focus = false, replay = true } = {}) {
  if (!TABS.includes(name)) name = "layout";
  if (name === currentTab) return;
  currentTab = name;
  document.querySelectorAll(".nav-item").forEach((b) => {
    const on = b.dataset.tab === name;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  document.querySelectorAll(".panel").forEach((p) => {
    const on = p.dataset.panel === name;
    p.hidden = !on;
    if (on && replay) { p.classList.remove("replay"); void p.offsetWidth; p.classList.add("replay"); } // entrance on user navigation only
  });
  try {
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  } catch (e) { /* history unavailable: tab simply isn't remembered */ }
  window.scrollTo({ top: 0 });
}

$("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (btn) showTab(btn.dataset.tab);
});
$("nav").addEventListener("keydown", (e) => {
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  showTab(TABS[(TABS.indexOf(currentTab) + step + TABS.length) % TABS.length], { focus: true });
});
window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
window.addEventListener("scroll", () => document.querySelector(".topbar").classList.toggle("scrolled", window.scrollY > 4), { passive: true });

/* ---------- Events ---------- */

for (const [id, key] of Object.entries(TOGGLES)) {
  $(id).addEventListener("change", (e) => {
    update({ [key]: e.target.checked });
    render();
    if (key === "enabled") UI.toast(i18n.t(settings.enabled ? "toastEnabled" : "toastDisabled"), 1600);
  });
}

function wireSlider(id, key) {
  const save = UI.debounce((n) => update({ [key]: n }), 90);
  $(id).addEventListener("input", (e) => {
    dragging = true;
    const n = Number(e.target.value);
    settings[key] = n;
    renderColumns();
    save(n);
  });
  $(id).addEventListener("change", (e) => {
    dragging = false;
    update({ [key]: Number(e.target.value) });
  });
}
wireSlider("columnsSlider", "columns");
PER_PAGE.forEach(({ slider, key }) => wireSlider(slider, key));

radioGroup($("modeGroup"), () => settings.theme, (v) => { update({ theme: v }); render(); });
radioGroup($("swatches"), () => settings.themeColor, (v) => { update({ themeColor: v }); render(); });
radioGroup($("fontChips"), () => settings.font, (v) => { update({ font: v }); render(); });
radioGroup($("sizeGroup"), () => settings.fontSize, (v) => { update({ fontSize: v }); render(); });
radioGroup($("langGroup"), () => settings.language, (v) => { update({ language: v }); render(); });

/* Backup */
$("exportBtn").addEventListener("click", async () => {
  const data = await store.exportAll();
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `youtube-grid-settings-${new Date().toISOString().slice(0, 10)}.json`
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  UI.toast(i18n.t("toastExported"));
});

const EMBEDDED = document.documentElement.classList.contains("embed");
$("importBtn").addEventListener("click", () => {
  // Chrome closes a popup the moment a file picker opens, which would lose the
  // import. Inside the popup, hand off to the full settings tab instead.
  if (EMBEDDED) chrome.tabs.create({ url: chrome.runtime.getURL("options.html#backup") });
  else $("importFile").click();
});
$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 256 * 1024) throw new Error("File too large");
    settings = await store.importAll(JSON.parse(await file.text()));
    render();
    UI.toast(i18n.t("toastImported"));
  } catch (err) {
    UI.toast(i18n.t("toastImportFailed"), 3200);
  } finally {
    e.target.value = ""; // allow importing the same file again
  }
});

$("resetBtn").addEventListener("click", async () => {
  const ok = await UI.confirm({
    title: i18n.t("resetDialogTitle"),
    body: i18n.t("resetDialogBody"),
    cancel: i18n.t("cancel"),
    confirm: i18n.t("confirmReset")
  });
  if (!ok) return;
  settings = await store.reset();
  render();
  UI.toast(i18n.t("toastReset"));
});

$("landingBtn").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }));
$("shortcutsBtn").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

/* Stay in sync with the popup / keyboard shortcut. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY] || pendingWrites > 0) return;
  settings = sanitize(changes[SETTINGS_KEY].newValue);
  render();
});

/* ---------- Init ---------- */
(async function init() {
  buildSliders();
  buildSwatches();
  buildFontChips();
  $("versionLabel").textContent = chrome.runtime.getManifest().version;
  Appearance.watchSystem();
  Icons.hydrate();

  settings = await store.load();
  render();
  showTab(location.hash.slice(1), { replay: false });
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove("no-anim")));
})();
