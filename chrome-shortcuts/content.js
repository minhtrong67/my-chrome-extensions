// Custom in-page shortcuts (cannot run on chrome:// pages or the New Tab page)
(() => {
  let customs = [];
  const load = () => chrome.storage.sync.get({ customs: [] }, (s) => { customs = s.customs || []; });
  load();
  chrome.storage.onChanged.addListener((c) => { if (c.customs) customs = c.customs.newValue || []; });

  function combo(e) {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
    const p = [];
    if (e.ctrlKey) p.push('Ctrl');
    if (e.altKey) p.push('Alt');
    if (e.shiftKey) p.push('Shift');
    if (e.metaKey) p.push('Meta');
    let k = e.code || '';
    if (/^Key[A-Z]$/.test(k)) k = k.slice(3);
    else if (/^Digit\d$/.test(k)) k = k.slice(5);
    else k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    p.push(k);
    return p.join('+');
  }

  window.addEventListener('keydown', (e) => {
    if (!e.isTrusted || !customs.length) return;
    const c = combo(e);
    if (!c) return;
    const hit = customs.find((x) => x.combo === c);
    if (hit) {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'open', url: hit.url });
    }
  }, true);
})();
