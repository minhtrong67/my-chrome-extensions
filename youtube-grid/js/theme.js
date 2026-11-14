/**
 * theme.js — applies the theme mode (system / light / dark) to <html> via
 * data-theme. All styling lives in CSS tokens, so a switch is one attribute.
 */
const Appearance = {
  mql: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,
  mode: "system",

  resolve(mode) {
    if (mode === "light" || mode === "dark") return mode;
    return this.mql && this.mql.matches ? "dark" : "light";
  },

  apply(settings) {
    this.mode = settings.theme;
    document.documentElement.dataset.theme = this.resolve(settings.theme);
    try {
      localStorage.setItem("yg_appearance", JSON.stringify({ mode: settings.theme }));
    } catch (e) { /* storage unavailable: boot.js falls back to the system mode */ }
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
