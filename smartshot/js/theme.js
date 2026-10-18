// SmartShot — theme module: light/dark/system, Material accent colour, font family, font size.
// Requires accents.js + fonts.js (loaded before this file).

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
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", resolved);
  },

  applyAccent(name) {
    document.documentElement.setAttribute("data-accent", ACCENT_COLORS[name] ? name : "purple");
  },

  applyFont(key) {
    const opt = FONT_OPTIONS[key] || FONT_OPTIONS.system;
    document.documentElement.style.setProperty("--app-font", opt.stack);
  },

  applyFontSize(size) {
    document.documentElement.setAttribute("data-fontsize", size);
  },

  /** Apply everything from a settings object in one go. */
  applyAll(s) {
    this.apply(s.theme);
    this.applyAccent(s.accent);
    this.applyFont(s.font);
    this.applyFontSize(s.fontSize);
    this.mirror(s);
  },

  /** Mirror the look-and-feel settings to localStorage so boot.js can paint them before async storage loads. */
  mirror(s) {
    try {
      localStorage.setItem("smartshot_boot", JSON.stringify({
        theme: s.theme, accent: s.accent, fontSize: s.fontSize,
        fontStack: (FONT_OPTIONS[s.font] || FONT_OPTIONS.system).stack
      }));
    } catch (e) { /* storage unavailable */ }
  },

  watchSystemChanges(onChange) {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => {
      if (this.current === "system") {
        this.apply("system");
        if (onChange) onChange();
      }
    });
  },

  cycle() {
    const order = ["light", "dark", "system"];
    const next = order[(order.indexOf(this.current) + 1) % order.length];
    this.apply(next);
    return next;
  }
};
