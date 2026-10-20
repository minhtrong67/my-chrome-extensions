// Runs synchronously in <head> so the page paints with the user's theme straight away
// (no light/dark or colour flash). themeManager mirrors the settings into localStorage.
(function () {
  var root = document.documentElement;
  try {
    var b = JSON.parse(localStorage.getItem("smartshot_boot") || "{}");
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = b.theme === "light" || b.theme === "dark" ? b.theme : (dark ? "dark" : "light");
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    root.setAttribute("data-accent", b.accent || "lightBlue");
  } catch (e) {
    root.setAttribute("data-theme", "light");
    root.setAttribute("data-accent", "lightBlue");
  }
})();
