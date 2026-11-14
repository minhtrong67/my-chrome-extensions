/**
 * options.js — the settings page (own tab, or embedded in the popup).
 * state -> render() -> DOM. Handlers only call update(), which merges a
 * partial change into storage; render() is the single place that paints.
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

const TAB_TITLES = { layout: "navLayout", general: "navGeneral", about: "navAbout" };
const TABS = Object.keys(TAB_TITLES);

/* ---------- Helpers ---------- */

let pendingWrites = 0; // saves in flight; their storage echoes are ignored
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
  UI.renderPreview($("preview"), settings.perPageColumns ? settings.columnsHome : settings.columns);
}

function renderTitle() {
  $("pageTitle").textContent = i18n.t(TAB_TITLES[currentTab] || "navLayout");
}

function render() {
  Appearance.apply(settings);
  i18n.setLang(settings.language);
  i18n.apply();
  renderTitle();

  for (const [id, key] of Object.entries(TOGGLES)) $(id).checked = settings[key];

  // Layout
  $("defaultNote").hidden = settings.useCustomColumns;
  $("columnsCollapse").classList.toggle("open", settings.useCustomColumns);
  $("columnsCollapse").firstElementChild.inert = !settings.useCustomColumns;
  $("simpleBlock").hidden = settings.perPageColumns;
  $("perPageBlock").hidden = !settings.perPageColumns;
  $("previewWrap").hidden = !settings.showPreview;
  if (!dragging) renderColumns();
  $("content").classList.toggle("is-off", !settings.enabled);

  // General: "auto" shows the language actually in use
  syncRadioGroup($("modeGroup"), settings.theme);
  syncRadioGroup($("langGroup"), i18n.lang);
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
    if (on && replay) { p.classList.remove("replay"); void p.offsetWidth; p.classList.add("replay"); }
  });
  renderTitle();
  try {
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  } catch (e) { /* history unavailable: the tab just isn't remembered */ }
  window.scrollTo({ top: 0 });
}

$("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (btn) showTab(btn.dataset.tab);
});
$("nav").addEventListener("keydown", (e) => {
  const horizontal = document.documentElement.classList.contains("compact");
  const keys = horizontal
    ? { ArrowRight: 1, ArrowLeft: -1 }
    : { ArrowDown: 1, ArrowUp: -1 };
  const step = keys[e.key];
  if (!step) return;
  e.preventDefault();
  showTab(TABS[(TABS.indexOf(currentTab) + step + TABS.length) % TABS.length], { focus: true });
});
window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

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
radioGroup($("langGroup"), () => i18n.lang, (v) => { update({ language: v }); render(); });

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
  // Chrome closes a popup when a file picker opens, which would lose the
  // import. Inside the popup, hand off to the full settings tab instead.
  if (EMBEDDED) chrome.tabs.create({ url: chrome.runtime.getURL("options.html#general") });
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

$("shortcutsBtn").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

/* Stay in sync with the popup / keyboard shortcut. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY] || pendingWrites > 0) return;
  settings = sanitize(changes[SETTINGS_KEY].newValue);
  render();
});

/* ---------- Init ---------- */
(async function init() {
  for (const el of ["columnsSlider", "sliderHome", "sliderSubs", "sliderChannel"]) {
    $(el).min = COLUMN_MIN;
    $(el).max = COLUMN_MAX;
  }
  $("ticks").innerHTML = Array.from({ length: COLUMN_MAX - COLUMN_MIN + 1 }, (_, i) => `<span>${COLUMN_MIN + i}</span>`).join("");
  $("versionLabel").textContent = chrome.runtime.getManifest().version;
  Appearance.watchSystem();
  Icons.hydrate();

  settings = await store.load();
  render();
  showTab(location.hash.slice(1), { replay: false });
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove("no-anim")));
})();
