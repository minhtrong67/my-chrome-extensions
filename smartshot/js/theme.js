// SmartShot — theme module: light / dark / system.

const themeManager = {
  current: "system",
  mql: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,

  resolve(mode) {
    return mode === "system" ? (this.mql && this.mql.matches ? "dark" : "light") : mode;
  },

  apply(mode) {
    this.current = mode;
    const resolved = this.resolve(mode);
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
  },

  /** Apply everything from a settings object in one go. */
  applyAll(s) {
    this.apply(s.theme);
    this.mirror(s);
  },

  /** Mirror the theme to localStorage so boot.js can paint it before async storage loads. */
  mirror(s) {
    try { localStorage.setItem("smartshot_boot", JSON.stringify({ theme: s.theme })); }
    catch (e) { /* storage unavailable */ }
  },

  watchSystemChanges() {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => {
      if (this.current === "system") this.apply("system");
    });
  }
};
