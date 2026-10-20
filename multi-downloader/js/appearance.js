// appearance.js — loaded in <head> (after themes.js) so the page paints in the right
// colours / font from the very first frame. Reads a tiny localStorage cache synchronously;
// chrome.storage.sync remains the source of truth and refreshes the cache afterwards.

const FONTS = [
  { id: "system",    name: null, stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' },
  { id: "roboto",    name: "Roboto",           stack: '"Roboto", system-ui, sans-serif' },
  { id: "inter",     name: "Inter",            stack: '"Inter Variable", system-ui, sans-serif' },
  { id: "openSans",  name: "Open Sans",        stack: '"Open Sans Variable", system-ui, sans-serif' },
  { id: "nunito",    name: "Nunito",           stack: '"Nunito Variable", system-ui, sans-serif' },
  { id: "segoe",     name: "Segoe UI",         stack: '"Segoe UI", system-ui, sans-serif' },
  { id: "arial",     name: "Arial",            stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { id: "verdana",   name: "Verdana",          stack: 'Verdana, Geneva, sans-serif' },
  { id: "tahoma",    name: "Tahoma",           stack: 'Tahoma, Geneva, sans-serif' },
  { id: "trebuchet", name: "Trebuchet MS",     stack: '"Trebuchet MS", Helvetica, sans-serif' },
  { id: "georgia",   name: "Georgia",          stack: 'Georgia, "Times New Roman", serif' },
  { id: "times",     name: "Times New Roman",  stack: '"Times New Roman", Times, serif' },
  { id: "mono",      name: "Courier New",      stack: '"Courier New", ui-monospace, Consolas, monospace' }
];

const APPEARANCE_KEYS = ["themeMode", "themeColor", "fontFamily", "fontSize", "language"];
const APPEARANCE_DEFAULTS = { themeMode: "system", themeColor: "deepPurple", fontFamily: "system", fontSize: 14, language: "system" };

function resolveScheme(mode) {
  if (mode === "dark" || mode === "light") return mode;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyAppearance(p) {
  const root = document.documentElement;
  const scheme = resolveScheme(p.themeMode);
  const theme = MD_THEMES[p.themeColor] || MD_THEMES.deepPurple;
  const tokens = theme[scheme];
  for (const k in tokens) root.style.setProperty("--md-" + k, tokens[k]);
  root.style.setProperty("--md-seed", theme.seed);
  root.dataset.scheme = scheme;
  root.style.colorScheme = scheme;
  const font = FONTS.find((f) => f.id === p.fontFamily) || FONTS[0];
  root.style.setProperty("--font", font.stack);
  root.style.fontSize = (Number(p.fontSize) || 14) + "px";
}

/** Merge a partial update, apply it, and refresh the boot cache. */
function setAppearance(partial) {
  window.__appearance = { ...window.__appearance, ...partial };
  applyAppearance(window.__appearance);
  try { localStorage.setItem("md.appearance", JSON.stringify(window.__appearance)); } catch (_) {}
}

(function boot() {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem("md.appearance")); } catch (_) {}
  window.__appearance = { ...APPEARANCE_DEFAULTS, ...(cached || {}) };
  applyAppearance(window.__appearance);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (window.__appearance.themeMode === "system") applyAppearance(window.__appearance);
  });
  // Enable colour transitions only after first paint (no flash-fade on open).
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("ready")));
})();
