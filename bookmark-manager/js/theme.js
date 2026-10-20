/**
 * theme.js — Material Design 3 colour engine.
 *
 * Takes one seed colour (any of the 18 Material palette colours) and derives
 * a full light/dark scheme from it by picking tones with a target relative
 * luminance (the same idea as Material's HCT tones), so every hue keeps
 * accessible contrast: on-primary text, containers, surfaces and outlines.
 * Works in pages and in the service worker (no DOM access at load time).
 */

const MD_COLORS = [
  { id: "red",        hex: "#F44336", en: "Red",         vi: "Đỏ" },
  { id: "pink",       hex: "#E91E63", en: "Pink",        vi: "Hồng" },
  { id: "purple",     hex: "#9C27B0", en: "Purple",      vi: "Tím" },
  { id: "deepPurple", hex: "#673AB7", en: "Deep Purple", vi: "Tím đậm" },
  { id: "indigo",     hex: "#3F51B5", en: "Indigo",      vi: "Chàm" },
  { id: "blue",       hex: "#2196F3", en: "Blue",        vi: "Xanh dương" },
  { id: "lightBlue",  hex: "#03A9F4", en: "Light Blue",  vi: "Xanh da trời" },
  { id: "cyan",       hex: "#00BCD4", en: "Cyan",        vi: "Xanh lơ" },
  { id: "teal",       hex: "#009688", en: "Teal",        vi: "Xanh ngọc" },
  { id: "green",      hex: "#4CAF50", en: "Green",       vi: "Xanh lá" },
  { id: "lightGreen", hex: "#8BC34A", en: "Light Green", vi: "Xanh lá nhạt" },
  { id: "lime",       hex: "#CDDC39", en: "Lime",        vi: "Xanh chanh" },
  { id: "yellow",     hex: "#FFEB3B", en: "Yellow",      vi: "Vàng" },
  { id: "amber",      hex: "#FFC107", en: "Amber",       vi: "Hổ phách" },
  { id: "orange",     hex: "#FF9800", en: "Orange",      vi: "Cam" },
  { id: "deepOrange", hex: "#FF5722", en: "Deep Orange", vi: "Cam đậm" },
  { id: "brown",      hex: "#795548", en: "Brown",       vi: "Nâu" },
  { id: "blueGrey",   hex: "#607D8B", en: "Blue Grey",   vi: "Xám xanh" }
];
const DEFAULT_COLOR_ID = "teal";

const colorUtil = {
  hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h, s, l };
  },
  hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return rgb.map((v) => v + m);
  },
  luminance([r, g, b]) {
    const f = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  },
  toHex(rgb) {
    return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
  },
  /** Colour of hue `h` / saturation `s` whose perceptual tone (CIE L*) is `tone` (0–100). */
  tone(h, s, tone) {
    if (tone >= 100) return "#ffffff";
    if (tone <= 0) return "#000000";
    const y = tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3; // tone → relative luminance
    let lo = 0, hi = 1, rgb = [0, 0, 0];
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      rgb = this.hslToRgb(h, s, mid);
      if (this.luminance(rgb) < y) lo = mid; else hi = mid;
    }
    return this.toHex(rgb);
  }
};

/** Build the CSS custom properties for a seed colour in light or dark mode. */
function buildScheme(seedHex, dark) {
  const { h, s } = colorUtil.hexToHsl(seedHex);
  const sa = Math.min(0.9, Math.max(0.45, s));          // accent saturation
  const ss = Math.min(0.28, sa * 0.4);                  // secondary (muted)
  const sn = Math.min(0.12, Math.max(0.04, s * 0.12));  // neutral tint
  const th = (h + 60) % 360;                            // tertiary hue
  const T = (hh, sat, tone) => colorUtil.tone(hh, sat, tone);
  if (!dark) {
    return {
      "--md-primary": T(h, sa, 40), "--md-on-primary": "#ffffff",
      "--md-primary-container": T(h, sa * 0.8, 90), "--md-on-primary-container": T(h, sa, 10),
      "--md-secondary": T(h, ss, 40), "--md-on-secondary": "#ffffff",
      "--md-secondary-container": T(h, ss, 90), "--md-on-secondary-container": T(h, ss, 10),
      "--md-tertiary": T(th, ss + 0.1, 40), "--md-tertiary-container": T(th, ss + 0.1, 90),
      "--md-on-tertiary-container": T(th, ss + 0.1, 10),
      "--md-error": "#BA1A1A", "--md-on-error": "#ffffff",
      "--md-error-container": "#FFDAD6", "--md-on-error-container": "#410002",
      "--md-surface": T(h, sn, 98), "--md-on-surface": T(h, sn, 10),
      "--md-on-surface-variant": T(h, sn * 1.2, 30),
      "--md-surface-container-lowest": "#ffffff", "--md-surface-container-low": T(h, sn, 96),
      "--md-surface-container": T(h, sn, 94), "--md-surface-container-high": T(h, sn, 92),
      "--md-surface-container-highest": T(h, sn, 90),
      "--md-outline": T(h, sn * 1.2, 50), "--md-outline-variant": T(h, sn * 1.2, 80),
      "--md-scrim": "rgba(0,0,0,.32)", "--md-shadow": "rgba(0,0,0,.18)"
    };
  }
  const sd = sa * 0.72; // softer accents in dark mode
  return {
    "--md-primary": T(h, sd, 80), "--md-on-primary": T(h, sd, 20),
    "--md-primary-container": T(h, sd, 30), "--md-on-primary-container": T(h, sd, 90),
    "--md-secondary": T(h, ss, 80), "--md-on-secondary": T(h, ss, 20),
    "--md-secondary-container": T(h, ss, 30), "--md-on-secondary-container": T(h, ss, 90),
    "--md-tertiary": T(th, ss + 0.1, 80), "--md-tertiary-container": T(th, ss + 0.1, 30),
    "--md-on-tertiary-container": T(th, ss + 0.1, 90),
    "--md-error": "#FFB4AB", "--md-on-error": "#690005",
    "--md-error-container": "#93000A", "--md-on-error-container": "#FFDAD6",
    "--md-surface": T(h, sn, 6), "--md-on-surface": T(h, sn, 90),
    "--md-on-surface-variant": T(h, sn * 1.2, 80),
    "--md-surface-container-lowest": T(h, sn, 4), "--md-surface-container-low": T(h, sn, 10),
    "--md-surface-container": T(h, sn, 12), "--md-surface-container-high": T(h, sn, 17),
    "--md-surface-container-highest": T(h, sn, 22),
    "--md-outline": T(h, sn * 1.2, 60), "--md-outline-variant": T(h, sn * 1.2, 30),
    "--md-scrim": "rgba(0,0,0,.5)", "--md-shadow": "rgba(0,0,0,.5)"
  };
}

function colorById(id) {
  return MD_COLORS.find((c) => c.id === id) || MD_COLORS.find((c) => c.id === DEFAULT_COLOR_ID);
}

/** Applies theme mode ("system" | "light" | "dark") + colour id to the document. */
const themeManager = {
  mode: "system",
  colorId: DEFAULT_COLOR_ID,
  mql: typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,

  isDark() {
    return this.mode === "dark" || (this.mode === "system" && !!(this.mql && this.mql.matches));
  },

  apply(mode, colorId) {
    this.mode = mode || this.mode;
    this.colorId = colorId || this.colorId;
    const dark = this.isDark();
    const root = document.documentElement;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    const vars = buildScheme(colorById(this.colorId).hex, dark);
    for (const k in vars) root.style.setProperty(k, vars[k]);
  },

  watchSystemChanges() {
    if (!this.mql) return;
    this.mql.addEventListener("change", () => { if (this.mode === "system") this.apply(); });
  }
};
