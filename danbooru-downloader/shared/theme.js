/* Material 3 color scheme generator (OKLCH tonal palettes) + theme/font/size application */
(function (g) {
  const DD = (g.DD = g.DD || {});

  DD.SEEDS = {
    Red: '#F44336', Pink: '#E91E63', Purple: '#9C27B0', 'Deep Purple': '#673AB7', Indigo: '#3F51B5',
    Blue: '#2196F3', 'Light Blue': '#03A9F4', Cyan: '#00BCD4', Teal: '#009688', Green: '#4CAF50',
    'Light Green': '#8BC34A', Lime: '#CDDC39', Yellow: '#FFEB3B', Amber: '#FFC107', Orange: '#FF9800',
    'Deep Orange': '#FF5722', Brown: '#795548', Grey: '#9E9E9E', 'Blue Grey': '#607D8B'
  };
  DD.COLORS = Object.keys(DD.SEEDS);

  DD.FONTS = [
    { id: 'system', name: 'System', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { id: 'google-sans-flex', name: 'Google Sans Flex', stack: '"Google Sans Flex", system-ui, sans-serif' },
    { id: 'roboto-flex', name: 'Roboto Flex', stack: '"Roboto Flex", system-ui, sans-serif' },
    { id: 'roboto', name: 'Roboto', stack: 'Roboto, system-ui, sans-serif' },
    { id: 'arial', name: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
    { id: 'inter', name: 'Inter', stack: 'Inter, system-ui, sans-serif' },
    { id: 'be-vietnam-pro', name: 'Be Vietnam Pro', stack: '"Be Vietnam Pro", system-ui, sans-serif' }
  ];

  /* ---- color math ---- */
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

  function hexToOk(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = lin(((n >> 16) & 255) / 255), gg = lin(((n >> 8) & 255) / 255), b = lin((n & 255) / 255);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * gg + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * gg + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * gg + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) };
  }

  function okToLinear(L, C, h) {
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  }
  const inGamut = (rgb) => rgb.every((v) => v >= -0.0004 && v <= 1.0004);
  const toHex = (rgb) =>
    '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('');

  // CIE L* tone -> Oklab L (exact for neutrals, so tone contrast matches M3 expectations)
  const toneToL = (t) => Math.cbrt(t > 8 ? Math.pow((t + 16) / 116, 3) : t / 903.3);

  function tone(h, chroma, t) {
    if (t >= 100) return '#ffffff';
    if (t <= 0) return '#000000';
    const L = toneToL(t);
    let c = chroma;
    if (!inGamut(okToLinear(L, c, h))) {
      let lo = 0, hi = chroma;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (inGamut(okToLinear(L, mid, h))) lo = mid; else hi = mid;
      }
      c = lo;
    }
    return toHex(okToLinear(L, c, h));
  }

  DD.scheme = (seedHex, dark) => {
    const { C, h } = hexToOk(seedHex);
    const pc = Math.min(0.13, C);
    const nc = Math.min(0.01, pc * 0.15);
    const P = (t) => tone(h, pc, t);
    const S = (t) => tone(h, pc * 0.35, t);
    const T = (t) => tone(h + 1.0, pc * 0.55, t);        // +~57°
    const N = (t) => tone(h, nc, t);
    const NV = (t) => tone(h, nc * 2, t);
    const E = (t) => tone(0.51, 0.19, t);               // error, hue ~29°
    const L = (a, b) => (dark ? b : a);
    return {
      primary: P(L(40, 80)), onPrimary: P(L(100, 20)), primaryContainer: P(L(90, 30)), onPrimaryContainer: P(L(10, 90)),
      secondary: S(L(40, 80)), onSecondary: S(L(100, 20)), secondaryContainer: S(L(90, 30)), onSecondaryContainer: S(L(10, 90)),
      tertiary: T(L(40, 80)), onTertiary: T(L(100, 20)), tertiaryContainer: T(L(90, 30)), onTertiaryContainer: T(L(10, 90)),
      error: E(L(40, 80)), onError: E(L(100, 20)), errorContainer: E(L(90, 30)), onErrorContainer: E(L(10, 90)),
      surface: N(L(98, 6)), onSurface: N(L(10, 90)), surfaceVariant: NV(L(90, 30)), onSurfaceVariant: NV(L(30, 80)),
      outline: NV(L(50, 60)), outlineVariant: NV(L(80, 30)),
      inverseSurface: N(L(20, 90)), inverseOnSurface: N(L(95, 20)), inversePrimary: P(L(80, 40)),
      surfaceDim: N(L(87, 6)), surfaceBright: N(L(98, 24)),
      surfaceContainerLowest: N(L(100, 4)), surfaceContainerLow: N(L(96, 10)), surfaceContainer: N(L(94, 12)),
      surfaceContainerHigh: N(L(92, 17)), surfaceContainerHighest: N(L(90, 22)),
      scrim: '#000000', shadow: '#000000'
    };
  };

  const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  const SCALE = { small: 0.9, medium: 1, large: 1.14 };

  DD.isDark = (s) => s.themeMode === 'dark' || (s.themeMode === 'system' && g.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  DD.seedOf = (s) => (s.themeColor === 'Custom' ? s.customColor : DD.SEEDS[s.themeColor] || DD.SEEDS.Indigo);

  DD.applyTheme = (s, root = document.documentElement) => {
    const dark = DD.isDark(s);
    const sc = DD.scheme(DD.seedOf(s), dark);
    for (const k in sc) root.style.setProperty('--' + kebab(k), sc[k]);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    root.style.setProperty('--fs', SCALE[s.fontSize] || 1);
    const f = DD.FONTS.find((x) => x.id === s.fontFamily) || DD.FONTS[1];
    root.style.setProperty('--font', f.stack);
    return sc;
  };

  // re-apply when the OS scheme changes (only matters for "system")
  DD.watchTheme = (getSettings) => {
    if (!g.matchMedia) return;
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const s = getSettings();
      if (s.themeMode === 'system') DD.applyTheme(s);
    });
  };

  /* Expressive scalloped "cookie" outline: n bumps, amplitude 0..0.15 (viewBox 0 0 100 100) */
  DD.scallop = (n = 8, amp = 0.07, pts = 120) => {
    let d = '';
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 46 * (1 + amp * Math.cos(n * a)) / (1 + amp);
      const x = 50 + r * Math.cos(a), y = 50 + r * Math.sin(a);
      d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d + 'Z';
  };
})(globalThis);
