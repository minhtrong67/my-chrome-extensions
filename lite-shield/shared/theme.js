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
export function buildScheme(hue, dark) {
  const P = (t) => tone(hue, 0.17, t); // primary — rực rỡ hơn (expressive)
  const S = (t) => tone(hue + 18, 0.07, t);
  const T = (t) => tone(hue + 65, 0.12, t);
  const N = (t) => tone(hue, 0.008, t);
  const NV = (t) => tone(hue, 0.017, t);
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

export const DEFAULT_THEME = { hue: 150, mode: 'auto' };

export function applyTheme(theme = DEFAULT_THEME, root = document.documentElement) {
  const { hue, mode } = { ...DEFAULT_THEME, ...theme };
  const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const scheme = buildScheme(hue, dark);
  for (const [k, v] of Object.entries(scheme)) root.style.setProperty(`--md-sys-color-${kebab(k)}`, v);
  root.dataset.scheme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/** Áp dụng ngay theme mặc định, rồi đồng bộ theo cài đặt đã lưu và theo hệ thống. */
export function initTheme() {
  let current = DEFAULT_THEME;
  applyTheme(current);
  chrome.storage.local.get('settings').then(({ settings }) => {
    if (settings?.theme) applyTheme((current = settings.theme));
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings?.newValue?.theme) applyTheme((current = changes.settings.newValue.theme));
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(current));
}
