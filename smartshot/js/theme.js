// SmartShot — theme module: light / dark / system and the Material accent colour.
// Requires accents.js (loaded before this file).

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

  applyAccent(name) {
    document.documentElement.setAttribute("data-accent", ACCENT_COLORS[name] ? name : "lightBlue");
  },

  /** Apply everything from a settings object in one go. */
  applyAll(s) {
    this.apply(s.theme);
    this.applyAccent(s.accent);
    this.mirror(s);
  },

  /** Mirror the look-and-feel settings to localStorage so boot.js can paint them before async storage loads. */
  mirror(s) {
    try { localStorage.setItem("smartshot_boot", JSON.stringify({ theme: s.theme, accent: s.accent })); }
    catch (e) { /* storage unavailable */ }
  },

  watchSystemChanges(onChange) {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => {
      if (this.current === "system") {
        this.apply("system");
        if (onChange) onChange();
      }
    });
  }
};
