/**
 * ripple.js — positions the CSS-driven ".m3-ripple" state layer at the
 * pointer's coordinates so the ink effect grows from where the user actually
 * clicked/tapped, matching the Material 3 touch-feedback spec. The actual
 * grow/fade animation lives entirely in components.css (see .m3-ripple);
 * this script only sets the two custom properties it reads.
 */
(() => {
  function positionRipple(e) {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    target.style.setProperty("--ripple-x", `${x}%`);
    target.style.setProperty("--ripple-y", `${y}%`);
  }

  function wireRipples(root = document) {
    root.querySelectorAll(".m3-ripple").forEach((elx) => {
      if (elx.__ripplesWired) return;
      elx.__ripplesWired = true;
      elx.addEventListener("pointerdown", positionRipple);
    });
  }

  document.addEventListener("DOMContentLoaded", () => wireRipples());
  // Re-wire whenever new nodes are swapped in (e.g. settings tab switches).
  window.__ycaWireRipples = wireRipples;
})();
