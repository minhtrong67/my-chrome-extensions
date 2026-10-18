// Runs synchronously in <head> so the page paints with the user's theme straight away
// (no light/dark or colour flash). themeManager mirrors the settings into localStorage.
(function () {
  try {
    var b = JSON.parse(localStorage.getItem("smartshot_boot") || "{}");
    var root = document.documentElement;
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = b.theme === "light" || b.theme === "dark" ? b.theme : (dark ? "dark" : "light");
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    root.setAttribute("data-accent", b.accent || "purple");
    root.setAttribute("data-fontsize", b.fontSize || "medium");
    if (b.fontStack) root.style.setProperty("--app-font", b.fontStack);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.setAttribute("data-accent", "purple");
  }
})();
