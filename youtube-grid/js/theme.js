/**
 * theme.js — applies the appearance settings (mode, Material colour, font,
 * font size) to <html> through data-* attributes. All actual styling lives in
 * CSS (palettes.css, tokens.css), so this file stays tiny and a theme switch
 * is a single attribute change with no style recalculation of inline values.
 */
const Appearance = {
  mql: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,
  mode: "system",

  resolve(mode) {
    if (mode === "light" || mode === "dark") return mode;
    return this.mql && this.mql.matches ? "dark" : "light";
  },

  apply(settings) {
    const root = document.documentElement;
    this.mode = settings.theme;
    root.dataset.theme = this.resolve(settings.theme);
    root.dataset.color = settings.themeColor;
    root.dataset.font = settings.font;
    root.dataset.fontsize = settings.fontSize;
    try {
      localStorage.setItem("yg_appearance", JSON.stringify({
        mode: settings.theme, color: settings.themeColor, font: settings.font, size: settings.fontSize
      }));
    } catch (e) { /* storage unavailable: boot.js falls back to defaults */ }
  },

  /** Follow the OS light/dark setting live while the mode is "system". */
  watchSystem() {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => {
      if (this.mode === "system") document.documentElement.dataset.theme = this.resolve("system");
    });
  },

  /** system -> light -> dark -> system. */
  nextMode(mode) {
    return { system: "light", light: "dark", dark: "system" }[mode] || "system";
  }
};
