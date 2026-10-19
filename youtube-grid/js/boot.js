/**
 * boot.js — runs synchronously in <head>, before first paint.
 *
 * Extension pages load their settings asynchronously, which would flash the
 * default theme for a frame. theme.js caches the resolved appearance in
 * localStorage; this tiny script re-applies it immediately so the page opens
 * already in the right mode, colour, font and size. (MV3 forbids inline
 * scripts, hence a separate file.)
 */
(() => {
  const root = document.documentElement;
  let c = {};
  try { c = JSON.parse(localStorage.getItem("yg_appearance") || "{}"); } catch (e) { /* ignore */ }
  const dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  const mode = c.mode === "light" || c.mode === "dark" ? c.mode : dark ? "dark" : "light";
  // Transitions are muted until the first render has run, so toggles, sliders and
  // panels start in their final state instead of visibly sliding into it.
  root.classList.add("no-anim");
  root.dataset.theme = mode;
  root.dataset.color = c.color || "red";
  root.dataset.font = c.font || "system";
  root.dataset.fontsize = c.size || "medium";
  // options.html?embed=1 is the settings view shown inside the popup.
  if (/[?&]embed\b/.test(location.search)) root.classList.add("embed");
})();
