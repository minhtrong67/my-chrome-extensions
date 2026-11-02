/* Isolated-world bridge: forwards links found by pagehook.js to the extension */
addEventListener('message', ev => {
  if (ev.source !== window || !ev.data || ev.data.vdl !== 'pagesrc') return;
  try { chrome.runtime.sendMessage({ type: 'pagesrc', items: ev.data.items }).catch(() => {}); } catch {}
});
