// SmartShot — content script
// Injected on demand via chrome.scripting.executeScript (never declared statically),
// so it only ever runs on the tab the user actively captures from.

(() => {
  if (window.__smartshotContentLoaded) return;
  window.__smartshotContentLoaded = true;

  let hiddenFixed = [];
  let selecting = null; // cancel hook for an in-progress area selection

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.target !== "content") return false;

    switch (message.type) {
      case "prepare-fullpage": {
        // Hide the page scrollbar so it doesn't appear in every stitched segment.
        if (!document.getElementById("__smartshot_style")) {
          const st = document.createElement("style");
          st.id = "__smartshot_style";
          st.textContent = "html{scrollbar-width:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}";
          document.documentElement.appendChild(st);
        }
        requestAnimationFrame(() => requestAnimationFrame(() => sendResponse({ ok: true })));
        return true;
      }

      case "get-page-metrics": {
        const de = document.documentElement;
        const body = document.body;
        sendResponse({
          totalHeight: Math.max(de.scrollHeight, body ? body.scrollHeight : 0, de.offsetHeight),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          originalScrollY: window.scrollY,
          originalScrollX: window.scrollX
        });
        return false;
      }

      case "scroll-to":
        // behavior:"instant" beats `scroll-behavior: smooth` set by the page's CSS.
        window.scrollTo({ left: message.x || 0, top: message.y || 0, behavior: "instant" });
        requestAnimationFrame(() => requestAnimationFrame(() => sendResponse({ ok: true })));
        return true;

      case "hide-fixed":
        hideFixedElements();
        sendResponse({ ok: true });
        return false;

      case "restore": {
        const st = document.getElementById("__smartshot_style");
        if (st) st.remove();
      }
        showFixedElements();
        window.scrollTo({ left: message.x || 0, top: message.y || 0, behavior: "instant" });
        sendResponse({ ok: true });
        return false;

      case "start-area-selection":
        startAreaSelection(message.hint, sendResponse);
        return true;

      default:
        return false;
    }
  });

  /* Sticky headers / cookie bars / chat bubbles would repeat on every stitched
     segment, so after the first frame they are hidden and restored at the end. */
  function hideFixedElements() {
    if (hiddenFixed.length) return;
    const all = document.body ? document.body.querySelectorAll("*") : [];
    for (const node of all) {
      if (node.id === "__smartshot_host") continue;
      const pos = getComputedStyle(node).position;
      if (pos === "fixed" || pos === "sticky") {
        hiddenFixed.push({
          node,
          value: node.style.getPropertyValue("visibility"),
          priority: node.style.getPropertyPriority("visibility")
        });
        node.style.setProperty("visibility", "hidden", "important");
      }
    }
  }

  function showFixedElements() {
    for (const { node, value, priority } of hiddenFixed) {
      if (value) node.style.setProperty("visibility", value, priority);
      else node.style.removeProperty("visibility");
    }
    hiddenFixed = [];
  }

  function startAreaSelection(hintText, sendResponse) {
    if (selecting) selecting(); // replace any stale selection
    const old = document.getElementById("__smartshot_host");
    if (old) old.remove();

    // Shadow DOM keeps the page's CSS from touching the overlay (and vice-versa).
    const host = document.createElement("div");
    host.id = "__smartshot_host";
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .overlay { position: fixed; inset: 0; cursor: crosshair; background: rgba(0,0,0,.38); user-select: none; touch-action: none; }
        .box { position: fixed; display: none; border: 2px solid #CE93D8; border-radius: 2px; pointer-events: none;
               box-shadow: 0 0 0 100vmax rgba(0,0,0,.38); background: transparent; }
        .overlay.has-box { background: transparent; }
        .size { position: absolute; left: 0; top: -30px; padding: 3px 9px; border-radius: 12px; font: 600 12px system-ui, sans-serif;
                color: #fff; background: #9C27B0; white-space: nowrap; }
        .size.inside { top: 6px; left: 6px; }
        .hint { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 16px;
                font: 500 14px/1.3 system-ui, sans-serif; color: #F5EEF8; background: #322F35; pointer-events: none;
                box-shadow: 0 4px 14px rgba(0,0,0,.35); animation: in .22s cubic-bezier(.2,0,0,1); }
        @keyframes in { from { opacity: 0; transform: translate(-50%, -8px); } }
        @media (prefers-reduced-motion: reduce) { .hint { animation: none; } }
      </style>
      <div class="overlay"></div>
      <div class="box"><span class="size"></span></div>
      <div class="hint"></div>`;
    root.querySelector(".hint").textContent = hintText || "Drag to select an area — press Esc to cancel";
    document.documentElement.appendChild(host);

    const overlay = root.querySelector(".overlay");
    const box = root.querySelector(".box");
    const sizeLabel = root.querySelector(".size");
    const hint = root.querySelector(".hint");

    let sx = 0, sy = 0, dragging = false, pointerId = null;

    function finish(result) {
      selecting = null;
      window.removeEventListener("keydown", onKey, true);
      host.remove();
      // Wait for the overlay to actually disappear from the compositor — otherwise the
      // screenshot taken right after this response would still contain the dimming layer.
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => sendResponse(result), 60)));
    }
    selecting = () => finish({ ok: false, cancelled: true });

    function rectFrom(e) {
      const x = Math.max(0, Math.min(e.clientX, sx));
      const y = Math.max(0, Math.min(e.clientY, sy));
      const r = Math.min(window.innerWidth, Math.max(e.clientX, sx));
      const b = Math.min(window.innerHeight, Math.max(e.clientY, sy));
      return { x, y, width: r - x, height: b - y };
    }

    overlay.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      pointerId = e.pointerId;
      overlay.setPointerCapture(pointerId);
      sx = e.clientX; sy = e.clientY;
      overlay.classList.add("has-box");
      hint.style.display = "none";
      Object.assign(box.style, { display: "block", left: sx + "px", top: sy + "px", width: "0px", height: "0px" });
    });

    overlay.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const r = rectFrom(e);
      Object.assign(box.style, { left: r.x + "px", top: r.y + "px", width: r.width + "px", height: r.height + "px" });
      sizeLabel.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      sizeLabel.classList.toggle("inside", r.y < 34);
    });

    overlay.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      const r = rectFrom(e);
      if (r.width < 4 || r.height < 4) return finish({ ok: false, cancelled: true });
      finish({ ok: true, rect: r, viewportWidth: window.innerWidth });
    });

    overlay.addEventListener("pointercancel", () => finish({ ok: false, cancelled: true }));

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish({ ok: false, cancelled: true }); }
    }
    window.addEventListener("keydown", onKey, true);
  }
})();
