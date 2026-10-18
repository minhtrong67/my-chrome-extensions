/* ================================================================
   QUICKNOTE — shared/ripple.js
   ------------------------------------------------------------------
   Adds a small, dependency-free Material Design "ripple" state-layer
   to buttons. This is purely a visual affordance (M3 calls it the
   "pressed" state layer) — it never changes click behaviour, so it
   is safe to attach to every button on every page.

   Usage:
     <button class="md-ripple-host">...</button>
     QNRipple.attach(document); // wires up every .md-ripple-host once

   Author: gnort67 · built with the help of Claude (Anthropic)
   ================================================================ */

(function (global) {
  'use strict';

  /**
   * Spawns a single ripple circle centred on the pointer position
   * inside `el`, sized so it always covers the whole element.
   */
  function spawnRipple(el, x, y) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'md-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x - rect.left - size / 2 + 'px';
    ripple.style.top = y - rect.top - size / 2 + 'px';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  /**
   * Finds every element with the `.md-ripple-host` class inside `root`
   * (defaults to the whole document) and binds a pointerdown listener
   * that spawns a ripple. Uses a data-attribute guard so calling
   * attach() more than once never double-binds the same element.
   */
  function attach(root) {
    const scope = root || document;
    scope.querySelectorAll('.md-ripple-host').forEach((el) => {
      if (el.dataset.rippleBound) return;
      el.dataset.rippleBound = '1';
      el.addEventListener('pointerdown', (e) => {
        if (el.disabled) return;
        spawnRipple(el, e.clientX, e.clientY);
      });
    });
  }

  global.QNRipple = { attach };
})(window);
