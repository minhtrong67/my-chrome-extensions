// Áp dụng theme Material 3 (cần src/mcu.js và src/shared.js nạp trước)
(() => {
  const X = globalThis.XMD;
  const KEYS = ['primary', 'primaryContainer', 'onPrimaryContainer', 'secondaryContainer', 'onSecondaryContainer', 'surfaceContainerHigh', 'onSurface', 'outlineVariant', 'inverseSurface', 'inverseOnSurface', 'inversePrimary'];
  const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

  X.buildCache = (hex) => {
    const pick = (sc) => Object.fromEntries(KEYS.map((k) => [k, sc[k]]));
    return { light: pick(MCU.scheme(hex, false)), dark: pick(MCU.scheme(hex, true)) };
  };
  X.hasFullCache = (S) => !!(S.themeCache && S.themeCache.light && S.themeCache.light.surfaceContainerHigh);
  X.applyTheme = (S, root = document.documentElement) => {
    const dark = X.isDarkMode(S);
    const vars = MCU.scheme(S.themeColor, dark);
    for (const k in vars) root.style.setProperty('--md-' + kebab(k), vars[k]);
    root.style.colorScheme = dark ? 'dark' : 'light';
    const f = X.FONTS.find((x) => x.id === S.font) || X.FONTS[0];
    root.style.setProperty('--font', f.stack);
    root.style.setProperty('--fs', X.SIZES[S.fontSize] || X.SIZES.medium);
    root.lang = S.language;
    return dark;
  };
})();
