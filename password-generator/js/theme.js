// LockSmith — theme module

const themeManager = {
  current: "system",
  mql: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,

  apply(mode) {
    this.current = mode;
    const resolved = mode === "system" ? (this.mql && this.mql.matches ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-theme", resolved);

    const icon = document.getElementById("themeIcon");
    if (icon) {
      // swap icon path lightly based on resolved theme (sun vs moon feel via same glyph is fine,
      // but we tweak stroke intensity through currentColor + class for clarity)
      icon.parentElement.classList.toggle("is-dark", resolved === "dark");
    }
  },

  applyColor(color) {
    document.documentElement.setAttribute("data-color", color || "teal");
  },

  applyFontSize(size) {
    document.body.setAttribute("data-fontsize", size);
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
    // Explicit mapping (not array-index rotation) so the very first click
    // from "system" always produces a visible change. If we rotated through
    // ["light","dark","system"] by index, starting at "system" the first
    // click would land on "light" — which, whenever the OS theme already
    // resolves to light, looks exactly like nothing happened.
    const next = { system: "dark", dark: "light", light: "system" }[this.current] || "system";
    this.apply(next);
    return next;
  }
};
