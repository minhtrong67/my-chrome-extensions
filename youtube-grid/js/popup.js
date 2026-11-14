/**
 * popup.js — quick controls in the toolbar popup. The full set of options
 * lives in options.html (shown inside the popup as an iframe, or in a tab).
 */
const $ = (id) => document.getElementById(id);

let settings = { ...DEFAULT_SETTINGS };
let dragging = false; // true while the slider is being dragged

const TOGGLES = {
  optHideShorts: "hideShorts",
  optCompactCards: "compactCards",
  optHideComments: "hideComments",
  optHideEndCards: "hideEndCards",
  optFocusMode: "focusMode"
};

/* ---------- Rendering (state -> DOM, never fires change events) ---------- */

function renderColumns(value) {
  const el = $("columnsValue");
  if (el.textContent !== String(value)) {
    el.textContent = value;
    UI.bump(el);
  }
  $("columnsSlider").value = value;
  UI.sliderFill($("columnsSlider"));
  UI.renderPreview($("preview"), value, 1);
  $("ticks").querySelectorAll("span").forEach((t) => t.classList.toggle("on", Number(t.textContent) === value));
}

function render() {
  Appearance.apply(settings);
  i18n.setLang(settings.language);
  i18n.apply();
  const inSettings = $("app").classList.contains("view-settings");
  $("viewTitle").textContent = i18n.t(inSettings ? "settings" : "appName");

  $("themeBtn").dataset.mode = settings.theme;

  $("optEnabled").checked = settings.enabled;
  $("app").classList.toggle("is-off", !settings.enabled);
  $("controls").inert = !settings.enabled;
  $("pausedHint").hidden = settings.enabled;

  $("optUseCustom").checked = settings.useCustomColumns;
  $("columnsCollapse").classList.toggle("open", settings.useCustomColumns);
  // Collapsed content must not be reachable with Tab or a screen reader.
  $("columnsCollapse").firstElementChild.inert = !settings.useCustomColumns;
  $("defaultNote").hidden = settings.useCustomColumns;
  $("simpleBlock").hidden = settings.perPageColumns;
  $("perPageNotice").hidden = !settings.perPageColumns;
  $("preview").hidden = !settings.showPreview;
  if (!dragging) renderColumns(settings.columns);

  for (const [id, key] of Object.entries(TOGGLES)) $(id).checked = settings[key];
}

/** Optimistic local update + persisted merge. */
let pendingWrites = 0; // saves in flight; their storage echoes are ignored
function update(partial) {
  settings = { ...settings, ...partial };
  pendingWrites++;
  store.patch(partial).finally(() => { pendingWrites--; });
}

/* ---------- Settings view (options.html in an iframe) ---------- */

function showSettings(open) {
  const frame = $("settingsFrame");
  if (open && !frame.getAttribute("src")) frame.src = "options.html?embed=1#layout"; // lazy
  $("app").classList.toggle("view-settings", open);
  frame.hidden = !open;
  $("backBtn").hidden = !open;
  $("fullBtn").hidden = !open;
  $("viewTitle").textContent = i18n.t(open ? "settings" : "appName");
  if (open) $("backBtn").focus();
  else $("settingsBtn").focus();
}

$("settingsBtn").addEventListener("click", () => showSettings(true));
$("noticeBtn").addEventListener("click", () => showSettings(true));
$("backBtn").addEventListener("click", () => showSettings(false));
$("fullBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("app").classList.contains("view-settings") && !e.defaultPrevented) showSettings(false);
});

/* ---------- Events ---------- */

$("themeBtn").addEventListener("click", () => {
  update({ theme: Appearance.nextMode(settings.theme) });
  render();
});

$("optEnabled").addEventListener("change", (e) => {
  update({ enabled: e.target.checked });
  render();
  UI.toast(i18n.t(settings.enabled ? "toastEnabled" : "toastDisabled"), 1600);
});

$("optUseCustom").addEventListener("change", (e) => {
  update({ useCustomColumns: e.target.checked });
  render();
});

const saveColumns = UI.debounce((n) => update({ columns: n }), 90);
$("columnsSlider").addEventListener("input", (e) => {
  dragging = true;
  const n = Number(e.target.value);
  settings.columns = n; // keep local state in step so render() never snaps back
  renderColumns(n);
  saveColumns(n); // live: YouTube updates while you drag
});
$("columnsSlider").addEventListener("change", (e) => {
  dragging = false;
  update({ columns: Number(e.target.value) });
});

for (const [id, key] of Object.entries(TOGGLES)) {
  $(id).addEventListener("change", (e) => update({ [key]: e.target.checked }));
}

/* Stay in sync when settings change elsewhere (options page, shortcut). */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY] || pendingWrites > 0) return;
  settings = sanitize(changes[SETTINGS_KEY].newValue);
  render();
});

/* ---------- Init ---------- */
(async function init() {
  $("columnsSlider").min = COLUMN_MIN;
  $("columnsSlider").max = COLUMN_MAX;
  $("ticks").innerHTML = Array.from({ length: COLUMN_MAX - COLUMN_MIN + 1 }, (_, i) => `<span>${COLUMN_MIN + i}</span>`).join("");

  Appearance.watchSystem();
  Icons.hydrate();

  settings = await store.load();
  render();

  // After the first paint: enable transitions, then preload the settings view
  // so opening it later is instant.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove("no-anim");
    setTimeout(() => {
      const frame = $("settingsFrame");
      if (!frame.getAttribute("src")) frame.src = "options.html?embed=1#layout";
    }, 200);
  }));
})();
