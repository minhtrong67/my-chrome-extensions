/**
 * Case Converter — content script
 * Applies case transformations directly to the focused editable element
 * (input, textarea, or contenteditable — including React/Draft.js/Lexical
 * powered composers such as Facebook and TikTok) so the final posted text
 * reflects the transformation, not just what is shown while typing.
 */

(() => {
  let settings = null;
  let toastEl = null;

  SettingsStore.load().then((s) => {
    settings = s;
  });
  SettingsStore.onChange((s) => {
    settings = s;
  });

  // ---------- native value setter trick (React/Vue controlled inputs) ----------
  function setNativeValue(element, value) {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(element, 'value');
    const protoDescriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    const setter = protoDescriptor && protoDescriptor.set;
    if (setter && (!descriptor || descriptor.set !== setter)) {
      setter.call(element, value);
    } else if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  function fireInputEvent(el) {
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function isTextInput(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'url', 'tel', 'email', ''].includes(type);
    }
    return false;
  }

  function transformInputElement(el, transformId) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const original = el.value;
    const hasSelection = typeof start === 'number' && typeof end === 'number' && start !== end;
    const target = hasSelection ? original.slice(start, end) : original;
    const transformed = CaseUtils.apply(transformId, target);
    const newValue = hasSelection
      ? original.slice(0, start) + transformed + original.slice(end)
      : transformed;

    setNativeValue(el, newValue);
    fireInputEvent(el);

    try {
      const caretEnd = hasSelection ? start + transformed.length : newValue.length;
      const caretStart = hasSelection ? start : 0;
      el.setSelectionRange(hasSelection ? caretStart : caretEnd, caretEnd);
    } catch (e) {
      // some input types don't support selection ranges — ignore
    }
  }

  function transformContentEditable(el, transformId) {
    const selection = window.getSelection();
    let hasSelection =
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      el.contains(selection.anchorNode);

    if (!hasSelection) {
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const original = selection.toString();
    const transformed = CaseUtils.apply(transformId, original);

    // execCommand keeps the host framework's editor state (Draft.js, Lexical,
    // ContentEditable-based composers on Facebook/TikTok/X, etc.) in sync,
    // because it is treated as real user typing rather than a DOM mutation.
    const applied = document.execCommand('insertText', false, transformed);

    if (!applied) {
      // Fallback for editors that block execCommand: manual DOM replace.
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(transformed));
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    }
  }

  function getEditableRoot(el) {
    if (!el) return null;
    if (isTextInput(el)) return el;
    let node = el;
    while (node && node !== document.body) {
      if (node.isContentEditable) return node;
      node = node.parentElement;
    }
    return null;
  }

  function showToast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'cc-toast';
      document.documentElement.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.remove('cc-toast--visible');
    // force reflow so the animation restarts on rapid repeats
    void toastEl.offsetWidth;
    toastEl.classList.add('cc-toast--visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toastEl.classList.remove('cc-toast--visible');
    }, 1200);
  }

  function siteIsExcluded() {
    if (!settings || !settings.excludedSites || !settings.excludedSites.length) return false;
    const host = location.hostname.replace(/^www\./, '');
    return settings.excludedSites.some((d) => {
      const domain = d.trim().replace(/^www\./, '');
      return domain && (host === domain || host.endsWith('.' + domain));
    });
  }

  function matchesShortcut(e, sc) {
    if (!sc) return false;
    return (
      !!sc.alt === e.altKey &&
      !!sc.ctrl === (e.ctrlKey) &&
      !!sc.shift === e.shiftKey &&
      !!sc.meta === e.metaKey &&
      (sc.key || '').toUpperCase() === (e.key || '').toUpperCase()
    );
  }

  document.addEventListener(
    'keydown',
    (e) => {
      if (!settings || !settings.shortcutsEnabled) return;
      if (siteIsExcluded()) return;

      const entry = Object.entries(settings.shortcuts || {}).find(([, sc]) =>
        matchesShortcut(e, sc)
      );
      if (!entry) return;
      const [transformId] = entry;

      const active = document.activeElement;
      const root = getEditableRoot(
        active && active.shadowRoot ? active.shadowRoot.activeElement || active : active
      );
      if (!root) return;

      e.preventDefault();
      e.stopPropagation();

      if (isTextInput(root)) {
        transformInputElement(root, transformId);
      } else if (root.isContentEditable) {
        transformContentEditable(root, transformId);
      }

      const label = (settings.language === 'vi' ? I18N_LABEL_VI : I18N_LABEL_FALLBACK)[transformId] || transformId;
      showToast(label);
    },
    true
  );

  // Minimal label fallback (content script doesn't load full i18n.js to stay light)
  const I18N_LABEL_VI = { uppercase: 'CHỮ HOA', lowercase: 'chữ thường', capitalize: 'Viết Hoa Từng Từ', sentenceCase: 'Viết hoa đầu câu', titleCase: 'Viết Hoa Tiêu Đề', alternatingCase: 'cHỮ xEN kẼ' };
  const I18N_LABEL_FALLBACK = {
    uppercase: 'UPPERCASE',
    lowercase: 'lowercase',
    capitalize: 'Capitalize Each Word',
    sentenceCase: 'Sentence case',
    titleCase: 'Title Case',
    alternatingCase: 'aLTERNATING cASE',
  };

  // ---------- respond to popup "apply to active element" requests ----------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'CC_APPLY_TO_ACTIVE') {
      const root = getEditableRoot(document.activeElement);
      if (root) {
        if (isTextInput(root)) transformInputElement(root, msg.transformId);
        else if (root.isContentEditable) transformContentEditable(root, msg.transformId);
        sendResponse({ ok: true });
        return;
      }
      sendResponse({ ok: false });
    }
    return true;
  });
})();
