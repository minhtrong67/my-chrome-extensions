// yt-screenshot - theme module
// Light / dark palettes live in css/popup.css under [data-theme]. This module only flips the attribute
// and follows the operating system when the mode is "system".

const themeManager = {
  mode: "system",
  mql: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,

  resolve(mode) {
    if (mode === "system") return this.mql && this.mql.matches ? "dark" : "light";
    return mode === "dark" ? "dark" : "light";
  },

  apply(mode) {
    this.mode = mode;
    document.documentElement.setAttribute("data-theme", this.resolve(mode));
  },

  watchSystem() {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => {
      if (this.mode === "system") this.apply("system");
    });
  }
};
