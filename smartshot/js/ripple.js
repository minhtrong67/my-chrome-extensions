// Material ripple: any element with class "sl" (state layer) gets a pointer-origin ripple.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.addEventListener("pointerdown", function (e) {
    var host = e.target.closest && e.target.closest(".sl");
    if (!host || host.disabled || e.button > 0) return;
    var rect = host.getBoundingClientRect();
    var size = Math.hypot(Math.max(e.clientX - rect.left, rect.right - e.clientX), Math.max(e.clientY - rect.top, rect.bottom - e.clientY)) * 2;
    var dot = document.createElement("span");
    dot.className = "ripple-dot";
    dot.style.width = dot.style.height = size + "px";
    dot.style.left = e.clientX - rect.left - size / 2 + "px";
    dot.style.top = e.clientY - rect.top - size / 2 + "px";
    host.appendChild(dot);
    dot.addEventListener("animationend", function () { dot.remove(); });
  }, { passive: true });
})();
