/**
 * landing.js — the marketing page reads the user's saved language/theme
 * preference (if the extension is already installed) so it feels like part
 * of the same product, but works standalone too since every value falls
 * back to sane defaults.
 */

(async function init() {
  let settings = { language: "en", theme: "system", fontSize: "medium" };
  try {
    settings = await store.loadSettings();
  } catch (_) {
    /* store/chrome.storage may be unavailable if this file is ever opened
       outside the extension context (e.g. a static preview) — fall back
       to defaults silently. */
  }

  i18n.setLang(settings.language);
  themeManager.apply(settings.theme);
  themeManager.applyFontSize(settings.fontSize);
  themeManager.watchSystemChanges();
  i18n.apply();
  window.__ycaWireRipples();

  document.getElementById("langToggleBtn").addEventListener("click", () => {
    const next = i18n.current === "en" ? "vi" : "en";
    i18n.setLang(next);
    store.patchSettings({ language: next }).catch(() => {});
  });
  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    const next = themeManager.cycle();
    store.patchSettings({ theme: next }).catch(() => {});
  });
  const scrollBtn = document.getElementById("scrollToMockBtn");
  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      document.getElementById("mockAnchor").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
})();
