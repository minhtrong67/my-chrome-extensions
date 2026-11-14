// Runs synchronously in <head> so the page paints with the user's theme straight away
// (no light/dark flash). themeManager mirrors the setting into localStorage.
(function () {
  var root = document.documentElement;
  try {
    var b = JSON.parse(localStorage.getItem("smartshot_boot") || "{}");
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = b.theme === "light" || b.theme === "dark" ? b.theme : (dark ? "dark" : "light");
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  } catch (e) {
    root.setAttribute("data-theme", "light");
  }
})();
