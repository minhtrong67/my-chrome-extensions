/* Runs before first paint: applies the saved theme and color so the popup never flashes the wrong palette. */
(function () {
  var theme = "system", color = "teal";
  try {
    var a = JSON.parse(localStorage.getItem("pg-appearance") || "{}");
    if (a.theme) theme = a.theme;
    if (a.color) color = a.color;
  } catch (e) {}
  var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.setAttribute("data-color", color);
})();
