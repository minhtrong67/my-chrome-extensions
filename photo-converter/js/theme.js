// Photo Converter — theme module
// Builds a Material Design colour scheme (light/dark) from a seed colour and
// applies it as CSS custom properties.

const MD_COLORS = [
  { hex: "#F44336", en: "Red", vi: "Đỏ" },
  { hex: "#E91E63", en: "Pink", vi: "Hồng" },
  { hex: "#9C27B0", en: "Purple", vi: "Tím" },
  { hex: "#673AB7", en: "Deep Purple", vi: "Tím đậm" },
  { hex: "#3F51B5", en: "Indigo", vi: "Chàm" },
  { hex: "#2196F3", en: "Blue", vi: "Xanh dương" },
  { hex: "#03A9F4", en: "Light Blue", vi: "Xanh da trời" },
  { hex: "#00BCD4", en: "Cyan", vi: "Lục lam" },
  { hex: "#009688", en: "Teal", vi: "Xanh mòng két" },
  { hex: "#4CAF50", en: "Green", vi: "Xanh lá" },
  { hex: "#8BC34A", en: "Light Green", vi: "Xanh lá nhạt" },
  { hex: "#CDDC39", en: "Lime", vi: "Xanh chanh" },
  { hex: "#FFEB3B", en: "Yellow", vi: "Vàng" },
  { hex: "#FFC107", en: "Amber", vi: "Hổ phách" },
  { hex: "#FF9800", en: "Orange", vi: "Cam" },
  { hex: "#FF5722", en: "Deep Orange", vi: "Cam đậm" },
  { hex: "#795548", en: "Brown", vi: "Nâu" },
  { hex: "#607D8B", en: "Blue Grey", vi: "Xám xanh" }
];

const _hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const _rgb2hex = (c) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mixColor = (a, b, t) => { const x = _hex2rgb(a), y = _hex2rgb(b); return _rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
const _lum = (h) => {
  const [r, g, b] = _hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const _contrast = (a, b) => { const l1 = _lum(a), l2 = _lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const _onColor = (h) => (_contrast(h, "#ffffff") >= 3 ? "#ffffff" : "#1b1b1f");
function _ensure(c, bg, min, toward) {
  let i = 0;
  while (_contrast(c, bg) < min && i++ < 24) c = mixColor(c, toward, 0.08);
  return c;
}

/** Returns a map of CSS variables for the given seed + brightness. */
function buildScheme(seed, dark) {
  if (!dark) {
    const surface = mixColor("#ffffff", seed, 0.035);
    const primary = seed;
    return {
      "--primary": primary,
      "--on-primary": _onColor(primary),
      "--primary-container": mixColor("#ffffff", seed, 0.26),
      "--on-primary-container": _ensure(mixColor(seed, "#000000", 0.6), mixColor("#ffffff", seed, 0.26), 7, "#000000"),
      "--primary-text": _ensure(seed, surface, 4.5, "#000000"),
      "--surface": surface,
      "--surface-1": mixColor("#ffffff", seed, 0.07),
      "--surface-2": mixColor("#ffffff", seed, 0.11),
      "--surface-3": mixColor("#ffffff", seed, 0.15),
      "--on-surface": mixColor("#1c1b1f", seed, 0.06),
      "--on-surface-variant": mixColor("#49454f", seed, 0.12),
      "--outline": mixColor("#79747e", seed, 0.15),
      "--outline-variant": mixColor("#cac4d0", seed, 0.2),
      "--error": "#B3261E",
      "--shadow": "rgba(0,0,0,.18)"
    };
  }
  const surface = mixColor("#141316", seed, 0.06);
  const primary = _ensure(seed, surface, 3.2, "#ffffff");
  const container = mixColor("#141316", seed, 0.42);
  return {
    "--primary": primary,
    "--on-primary": _onColor(primary),
    "--primary-container": container,
    "--on-primary-container": _ensure(mixColor(seed, "#ffffff", 0.8), container, 7, "#ffffff"),
    "--primary-text": _ensure(seed, surface, 4.5, "#ffffff"),
    "--surface": surface,
    "--surface-1": mixColor("#141316", seed, 0.1),
    "--surface-2": mixColor("#141316", seed, 0.14),
    "--surface-3": mixColor("#141316", seed, 0.18),
    "--on-surface": mixColor("#e6e1e5", seed, 0.05),
    "--on-surface-variant": mixColor("#cac4d0", seed, 0.08),
    "--outline": mixColor("#938f99", seed, 0.12),
    "--outline-variant": mixColor("#49454f", seed, 0.15),
    "--error": "#F2B8B5",
    "--shadow": "rgba(0,0,0,.5)"
  };
}

const themeManager = {
  mode: "system",
  color: "#FF5722",
  mql: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,

  isDark() {
    return this.mode === "dark" || (this.mode === "system" && !!(this.mql && this.mql.matches));
  },

  apply(mode, color) {
    if (mode) this.mode = mode;
    if (color) this.color = color;
    const dark = this.isDark();
    const root = document.documentElement;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.style.colorScheme = dark ? "dark" : "light";
    const vars = buildScheme(this.color, dark);
    for (const k in vars) root.style.setProperty(k, vars[k]);
  },

  /** Re-applies automatically when the OS switches light/dark while mode === "system". */
  watchSystemChanges() {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => { if (this.mode === "system") this.apply(); });
  }
};
