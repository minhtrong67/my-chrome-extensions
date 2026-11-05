import { setLang, applyI18n } from './i18n.js';
// Màu động kiểu Material 3: sinh bảng tông (tonal palette) từ một màu hạt (hue) bằng OKLCH.
// Tone M3 (CIE L*) được ánh xạ sang độ sáng OKLab nên các cặp tương phản gần giống HCT.

const toneToL = (t) => Math.cbrt(t > 8 ? ((t + 16) / 116) ** 3 : t / 903.3);

function linearRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (v) => v.every((x) => x >= -1e-4 && x <= 1 + 1e-4);
const gamma = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

export function tone(hue, chroma, t) {
  const L = toneToL(t);
  let c = chroma;
  let v = linearRgb(L, c, hue);
  while (!inGamut(v) && c > 0) {
    c = Math.max(0, c - 0.004);
    v = linearRgb(L, c, hue);
  }
  return (
    '#' +
    v
      .map((x) => Math.round(gamma(Math.min(1, Math.max(0, x))) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Trả về token màu (camelCase) cho sáng/tối. */
export function buildScheme(hue, dark, scale = 1) {
  const k = Math.max(0, Math.min(1, scale)); // độ bão hòa tương đối của màu hạt (xám/nâu thấp hơn)
  const kn = Math.max(k, 0.3); // bề mặt luôn giữ một chút sắc
  const P = (t) => tone(hue, 0.17 * k, t); // primary — rực rỡ hơn (expressive)
  const S = (t) => tone(hue + 18, 0.07 * k, t);
  const T = (t) => tone(hue + 65, 0.12 * k, t);
  const N = (t) => tone(hue, 0.008 * kn, t);
  const NV = (t) => tone(hue, 0.017 * kn, t);
  const E = (t) => tone(27, 0.19, t);
  const pick = (light, dk) => (dark ? dk : light);

  return {
    primary: P(pick(40, 80)),
    onPrimary: P(pick(100, 20)),
    primaryContainer: P(pick(90, 30)),
    onPrimaryContainer: P(pick(10, 90)),
    inversePrimary: P(pick(80, 40)),
    secondary: S(pick(40, 80)),
    onSecondary: S(pick(100, 20)),
    secondaryContainer: S(pick(90, 30)),
    onSecondaryContainer: S(pick(10, 90)),
    tertiary: T(pick(40, 80)),
    onTertiary: T(pick(100, 20)),
    tertiaryContainer: T(pick(90, 30)),
    onTertiaryContainer: T(pick(10, 90)),
    error: E(pick(40, 80)),
    onError: E(pick(100, 20)),
    errorContainer: E(pick(90, 30)),
    onErrorContainer: E(pick(10, 90)),
    surface: N(pick(98, 6)),
    surfaceDim: N(pick(87, 6)),
    surfaceBright: N(pick(98, 24)),
    surfaceContainerLowest: N(pick(100, 4)),
    surfaceContainerLow: N(pick(96, 10)),
    surfaceContainer: N(pick(94, 12)),
    surfaceContainerHigh: N(pick(92, 17)),
    surfaceContainerHighest: N(pick(90, 22)),
    onSurface: N(pick(10, 90)),
    onSurfaceVariant: NV(pick(30, 80)),
    outline: NV(pick(50, 60)),
    outlineVariant: NV(pick(80, 30)),
    inverseSurface: N(pick(20, 90)),
    inverseOnSurface: N(pick(95, 20)),
    scrim: '#000000',
  };
}

const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

// ---------- 19 màu chủ đề Material (sắc 500) ----------
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** '#rrggbb' → { L, C, h } trong OKLCH. */
export function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

const HEX = {
  red: '#F44336', pink: '#E91E63', purple: '#9C27B0', 'deep-purple': '#673AB7', indigo: '#3F51B5', blue: '#2196F3', 'light-blue': '#03A9F4',
  cyan: '#00BCD4', teal: '#009688', green: '#4CAF50', 'light-green': '#8BC34A', lime: '#CDDC39', yellow: '#FFEB3B', amber: '#FFC107',
  orange: '#FF9800', 'deep-orange': '#FF5722', brown: '#795548', grey: '#9E9E9E', 'blue-grey': '#607D8B',
};
export const COLORS = Object.entries(HEX).map(([key, hex]) => {
  const { C, h } = hexToOklch(hex);
  // Xám hầu như không có sắc: giữ chút xanh lạnh để bảng màu không "chết".
  const chromatic = key !== 'grey';
  return { key, hex, hue: chromatic ? Math.round(h) : 260, scale: chromatic ? Math.min(1, C / 0.15) : 0.03 };
});
const byKey = Object.fromEntries(COLORS.map((c) => [c.key, c]));

export const DEFAULT_THEME = { color: 'green', mode: 'auto' };

/** Màu cũ lưu theo hue → màu Material gần nhất (bỏ qua nhóm xám/nâu). */
export function nearestColorKey(hue) {
  let best = 'green';
  let d = 1e9;
  for (const c of COLORS) {
    if (c.scale < 0.5) continue;
    const dd = Math.min(Math.abs(c.hue - hue), 360 - Math.abs(c.hue - hue));
    if (dd < d) ((d = dd), (best = c.key));
  }
  return best;
}
export const colorOf = (theme = {}) => byKey[theme.color] ?? byKey[theme.hue != null ? nearestColorKey(theme.hue) : 'green'];
export const schemeFor = (theme, dark) => {
  const c = colorOf(theme);
  return buildScheme(c.hue, dark, c.scale);
};

// ---------- cỡ chữ & font chữ ----------
export const FONT_SIZES = { small: 0.9, medium: 1, large: 1.12 };
export const FONTS = {
  system: { label: null, stack: 'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif' },
  'google-sans-flex': { label: 'Google Sans Flex', stack: '"Google Sans Flex", system-ui, sans-serif' },
  'roboto-flex': { label: 'Roboto Flex', stack: '"Roboto Flex", system-ui, sans-serif' },
  roboto: { label: 'Roboto', stack: 'Roboto, system-ui, sans-serif' },
  arial: { label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", Arimo, sans-serif' },
  inter: { label: 'Inter', stack: 'Inter, system-ui, sans-serif' },
  'be-vietnam-pro': { label: 'Be Vietnam Pro', stack: '"Be Vietnam Pro", system-ui, sans-serif' },
};
export const DEFAULT_LOOK = { fontSize: 'medium', fontFamily: 'system', language: 'vi' };

export function applyTypography({ fontSize, fontFamily } = DEFAULT_LOOK, root = document.documentElement) {
  const popup = typeof location !== 'undefined' && location.pathname.includes('/popup/');
  let scale = FONT_SIZES[fontSize] ?? 1;
  if (popup) scale = Math.min(scale, 1.06); // popup tối đa ~600px chiều cao
  root.style.zoom = scale === 1 ? '' : String(scale);
  root.style.setProperty('--font', (FONTS[fontFamily] ?? FONTS.system).stack);
}

export function applyTheme(theme = DEFAULT_THEME, root = document.documentElement) {
  const mode = theme?.mode ?? DEFAULT_THEME.mode;
  const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const scheme = schemeFor(theme, dark);
  for (const [k, v] of Object.entries(scheme)) root.style.setProperty(`--md-sys-color-${kebab(k)}`, v);
  root.dataset.scheme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/**
 * Áp dụng giao diện đã lưu (màu, cỡ chữ, font, ngôn ngữ) và theo dõi thay đổi.
 * Trả về Promise hoàn tất sau lần áp dụng đầu tiên; onChange(settings) được gọi mỗi khi cài đặt đổi.
 */
export function initTheme(onChange) {
  let current = DEFAULT_THEME;
  let lastLang;
  const apply = (settings) => {
    if (settings?.theme) current = settings.theme;
    applyTheme(current);
    applyTypography({ ...DEFAULT_LOOK, ...settings });
    const lang = settings?.language ?? DEFAULT_LOOK.language;
    setLang(lang);
    if (lang !== lastLang) applyI18n();
    lastLang = lang;
    document.documentElement.dataset.ready = '';
    onChange?.(settings ?? {}, current);
  };
  applyTheme(current);
  const ready = chrome.storage.local.get('settings').then(({ settings }) => apply(settings));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings?.newValue) apply(changes.settings.newValue);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(current));
  return ready;
}
