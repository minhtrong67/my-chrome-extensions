/**
 * boot.js — runs synchronously in <head>, before first paint.
 * Re-applies the cached theme so the page opens in the right mode instead of
 * flashing the default one. MV3 forbids inline scripts, hence a separate file.
 */
(() => {
  const root = document.documentElement;
  let c = {};
  try { c = JSON.parse(localStorage.getItem("yg_appearance") || "{}"); } catch (e) { /* ignore */ }
  const dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = c.mode === "light" || c.mode === "dark" ? c.mode : dark ? "dark" : "light";

  // Mute transitions until the first render has run.
  root.classList.add("no-anim");

  // options.html?embed=1 is the settings view shown inside the popup.
  const embed = /[?&]embed\b/.test(location.search);
  if (embed) root.classList.add("embed");

  // Compact layout (top tabs) when embedded or on a narrow window.
  const narrow = window.matchMedia ? matchMedia("(max-width: 720px)") : { matches: false };
  const sync = () => root.classList.toggle("compact", embed || narrow.matches);
  sync();
  if (narrow.addEventListener) narrow.addEventListener("change", sync);
})();
