// ui.js — small DOM helpers shared by popup.js and options.js.

/** Applies translations to [data-i18n], [data-i18n-title], [data-i18n-ph]. */
function applyI18n(t, root) {
  const scope = root || document;
  scope.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const v = t(el.dataset.i18nTitle);
    el.title = v;
    el.setAttribute("aria-label", v);
  });
  scope.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
}

const escapeHtml = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function debounce(fn, ms) {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
}

// ── Snackbar (one shared element with #snackbar > #sbIcon + #sbMsg) ──
let _sbTimer;
function showSnackbar(msg, iconName, isError) {
  const sb = document.getElementById("snackbar");
  if (!sb) return;
  sb.querySelector(".sb-icon").innerHTML = lucideSvg(iconName || (isError ? "circle-alert" : "circle-check"), 20);
  sb.querySelector(".sb-msg").textContent = msg;
  sb.classList.toggle("error", !!isError);
  clearTimeout(_sbTimer);
  sb.classList.add("show");
  _sbTimer = setTimeout(() => sb.classList.remove("show"), 3000);
}

// ── Material ripple: any element with class "ripple" ──
document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  const el = e.target.closest(".ripple");
  if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const wave = document.createElement("span");
  wave.className = "ripple-wave";
  wave.style.width = wave.style.height = size + "px";
  wave.style.left = e.clientX - r.left - size / 2 + "px";
  wave.style.top = e.clientY - r.top - size / 2 + "px";
  el.appendChild(wave);
  wave.addEventListener("animationend", () => wave.remove(), { once: true });
}, { passive: true });
