/**
 * ui.js — small shared Material Design behaviours: ripple, snackbar,
 * confirm dialog, slider fill, debounce.
 */
const UI = {
  debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  reduceMotion: window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false },

  /** Paint the filled part of a range input (see .slider in components.css). */
  sliderFill(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const pct = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--pct", pct + "%");
  },

  /** Subtle pop when a number changes. */
  bump(el) {
    if (UI.reduceMotion.matches || !el.animate) return;
    el.animate(
      [{ transform: "translateY(35%)", opacity: 0.2 }, { transform: "none", opacity: 1 }],
      { duration: 220, easing: "cubic-bezier(.05,.7,.1,1)" }
    );
  },

  /** Snackbar. Needs <div id="snackbar" class="snackbar" role="status"></div>. */
  toast(message, ms = 2400) {
    const el = document.getElementById("snackbar");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  },

  /**
   * Material confirm dialog built on <dialog>. Resolves true when confirmed.
   * Needs <dialog id="confirmDialog"> with #dialogTitle, #dialogBody,
   * #dialogCancel and #dialogConfirm inside.
   */
  confirm({ title, body, cancel, confirm }) {
    const dlg = document.getElementById("confirmDialog");
    document.getElementById("dialogTitle").textContent = title;
    document.getElementById("dialogBody").textContent = body;
    document.getElementById("dialogCancel").textContent = cancel;
    document.getElementById("dialogConfirm").textContent = confirm;
    return new Promise((resolve) => {
      const done = () => resolve(dlg.returnValue === "confirm");
      dlg.addEventListener("close", done, { once: true });
      dlg.returnValue = "";
      dlg.showModal();
    });
  },

  /** Cheap mini-grid preview: reuses nodes instead of rebuilding them. */
  renderPreview(el, columns, rows = 2) {
    el.style.setProperty("--cols", columns);
    const want = columns * rows;
    while (el.children.length > want) el.lastElementChild.remove();
    for (let i = el.children.length; i < want; i++) {
      const cell = document.createElement("span");
      cell.className = "preview-cell";
      el.appendChild(cell);
    }
  }
};

/* Delegated ripple: one listener for the whole page, nothing to re-wire when
 * the DOM changes. Any element with [data-ripple] gets the ink effect. */
document.addEventListener("pointerdown", (e) => {
  const host = e.target.closest && e.target.closest("[data-ripple]");
  if (!host || UI.reduceMotion.matches || !host.animate) return;
  if (host.matches(":disabled, [aria-disabled='true']")) return;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const ink = document.createElement("span");
  ink.className = "ripple-ink";
  ink.style.width = ink.style.height = size + "px";
  ink.style.left = e.clientX - rect.left - size / 2 + "px";
  ink.style.top = e.clientY - rect.top - size / 2 + "px";
  host.appendChild(ink);
  const anim = ink.animate(
    [{ transform: "scale(0)", opacity: 0.18 }, { transform: "scale(1)", opacity: 0.12, offset: 0.6 }, { transform: "scale(1)", opacity: 0 }],
    { duration: 550, easing: "cubic-bezier(.2,0,0,1)" }
  );
  anim.onfinish = () => ink.remove();
});
