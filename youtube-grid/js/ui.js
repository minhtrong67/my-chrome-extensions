/** ui.js — small shared helpers: debounce, slider fill, toast, confirm dialog, preview. */
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
    input.style.setProperty("--p", (Number(input.value) - min) / (max - min));
  },

  /** Subtle pop when a number changes. */
  bump(el) {
    if (UI.reduceMotion.matches || !el.animate) return;
    el.animate(
      [{ transform: "translateY(30%)", opacity: 0.2 }, { transform: "none", opacity: 1 }],
      { duration: 200, easing: "cubic-bezier(0.1, 0.9, 0.2, 1)" }
    );
  },

  /** Toast. Needs <div id="snackbar" class="snackbar" role="status">. */
  toast(message, ms = 2400) {
    const el = document.getElementById("snackbar");
    if (!el) return;
    el.innerHTML = Icons.svg("circle-check");
    el.appendChild(Object.assign(document.createElement("span"), { textContent: message }));
    el.classList.add("show");
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  },

  /**
   * Confirm dialog on <dialog id="confirmDialog"> (#dialogTitle, #dialogBody,
   * #dialogCancel, #dialogConfirm). Resolves true when confirmed.
   */
  confirm({ title, body, cancel, confirm }) {
    const dlg = document.getElementById("confirmDialog");
    document.getElementById("dialogTitle").textContent = title;
    document.getElementById("dialogBody").textContent = body;
    document.getElementById("dialogCancel").textContent = cancel;
    document.getElementById("dialogConfirm").textContent = confirm;
    return new Promise((resolve) => {
      dlg.addEventListener("close", () => resolve(dlg.returnValue === "confirm"), { once: true });
      dlg.returnValue = "";
      dlg.showModal();
    });
  },

  /** Mini-grid preview; reuses nodes instead of rebuilding them. */
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
