importScripts('presets.js');

const ALLOWED = /^(chrome|https?|about):/i;

async function openUrl(url) {
  if (!ALLOWED.test(url)) return;
  const { openIn = 'new' } = await chrome.storage.sync.get('openIn');
  if (openIn === 'current') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) { await chrome.tabs.update(tab.id, { url }); return; }
    } catch (e) { /* fall back to new tab */ }
  }
  await chrome.tabs.create({ url });
}

chrome.commands.onCommand.addListener((cmd) => {
  const p = PRESETS.find((x) => 'open_' + x.id === cmd);
  if (p) openUrl(p.url);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'open' && typeof msg.url === 'string') openUrl(msg.url);
});
