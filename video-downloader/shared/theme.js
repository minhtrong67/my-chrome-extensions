/* Material 3 style color roles generated from a seed color (HSL-based tonal approximation) */
const SEEDS = ['#6750A4', '#3F51B5', '#0B57D0', '#00838F', '#00796B', '#2E7D32', '#9E9D24', '#F9A825', '#E65100', '#B3261E', '#C2185B', '#546E7A'];

function hexToHue(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}
const hsl = (h, s, l) => `hsl(${(h % 360 + 360) % 360} ${s}% ${l}%)`;

function buildScheme(seed, dark) {
  const h = hexToHue(seed), t = h + 60;
  if (!dark) return {
    primary: hsl(h, 50, 40), onPrimary: '#fff', primaryContainer: hsl(h, 75, 90), onPrimaryContainer: hsl(h, 65, 12),
    secondaryContainer: hsl(h, 32, 89), onSecondaryContainer: hsl(h, 35, 12),
    tertiary: hsl(t, 38, 40), tertiaryContainer: hsl(t, 45, 89), onTertiaryContainer: hsl(t, 45, 12),
    surface: hsl(h, 30, 98), surfaceContainerLow: hsl(h, 26, 96), surfaceContainer: hsl(h, 24, 94),
    surfaceContainerHigh: hsl(h, 22, 92), surfaceContainerHighest: hsl(h, 20, 90),
    onSurface: hsl(h, 15, 10), onSurfaceVariant: hsl(h, 10, 30), outline: hsl(h, 8, 46), outlineVariant: hsl(h, 14, 80),
    error: '#B3261E', errorContainer: '#F9DEDC', onErrorContainer: '#410E0B'
  };
  return {
    primary: hsl(h, 62, 80), onPrimary: hsl(h, 60, 20), primaryContainer: hsl(h, 45, 30), onPrimaryContainer: hsl(h, 75, 90),
    secondaryContainer: hsl(h, 20, 28), onSecondaryContainer: hsl(h, 32, 90),
    tertiary: hsl(t, 45, 80), tertiaryContainer: hsl(t, 28, 28), onTertiaryContainer: hsl(t, 45, 90),
    surface: hsl(h, 14, 8), surfaceContainerLow: hsl(h, 12, 10), surfaceContainer: hsl(h, 12, 12),
    surfaceContainerHigh: hsl(h, 10, 16), surfaceContainerHighest: hsl(h, 9, 20),
    onSurface: hsl(h, 12, 90), onSurfaceVariant: hsl(h, 10, 76), outline: hsl(h, 6, 58), outlineVariant: hsl(h, 8, 30),
    error: '#F2B8B5', errorContainer: '#8C1D18', onErrorContainer: '#F9DEDC'
  };
}
function isDark(S) {
  return S.theme === 'dark' || (S.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyTheme(el, S) {
  const dark = isDark(S), sc = buildScheme(S.seed, dark);
  for (const [k, v] of Object.entries(sc)) el.style.setProperty('--' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), v);
  el.style.setProperty('--font', fontCss(S.font));
  el.style.setProperty('--fs', OVERLAY_PX[S.fontSize] + 'px');
  el.style.colorScheme = dark ? 'dark' : 'light';
}
