// TubeShot - theme module
// Material Design 3 color schemes are pre-generated in css/palettes.css
// (one block per [data-color][data-theme] pair). This module only flips the attributes.

const MD_COLORS = [
  { key: "red", hex: "#F44336" },
  { key: "pink", hex: "#E91E63" },
  { key: "purple", hex: "#9C27B0" },
  { key: "deep-purple", hex: "#673AB7" },
  { key: "indigo", hex: "#3F51B5" },
  { key: "blue", hex: "#2196F3" },
  { key: "light-blue", hex: "#03A9F4" },
  { key: "cyan", hex: "#00BCD4" },
  { key: "teal", hex: "#009688" },
  { key: "green", hex: "#4CAF50" },
  { key: "light-green", hex: "#8BC34A" },
  { key: "lime", hex: "#CDDC39" },
  { key: "yellow", hex: "#FFEB3B" },
  { key: "amber", hex: "#FFC107" },
  { key: "orange", hex: "#FF9800" },
  { key: "deep-orange", hex: "#FF5722" },
  { key: "brown", hex: "#795548" },
  { key: "blue-grey", hex: "#607D8B" }
];

// Picks a readable check-mark color (black or white) for a given swatch.
function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? "#1d1b1e" : "#ffffff";
}

const themeManager = {
  mode: "system",
  mql: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,

  resolve(mode) {
    if (mode === "system") return this.mql && this.mql.matches ? "dark" : "light";
    return mode;
  },

  apply(mode, color) {
    this.mode = mode;
    const root = document.documentElement;
    root.setAttribute("data-theme", this.resolve(mode));
    root.setAttribute("data-color", color);
  },

  watchSystem() {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => {
      if (this.mode === "system") document.documentElement.setAttribute("data-theme", this.resolve("system"));
    });
  }
};
