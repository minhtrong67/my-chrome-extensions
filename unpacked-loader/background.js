const URL_APP = chrome.runtime.getURL('app.html');
chrome.action.onClicked.addListener(async () => {
  const [c] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [URL_APP] });
  if (c) {
    await chrome.tabs.update(c.tabId, { active: true });
    await chrome.windows.update(c.windowId, { focused: true });
  } else chrome.tabs.create({ url: 'app.html' });
});

let creating;
async function copyText(text) {
  if (!(await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length) {
    creating ??= chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['CLIPBOARD'], justification: 'Copy the next extension path to the clipboard' });
    await creating; creating = null;
  }
  chrome.runtime.sendMessage({ target: 'offscreen', text });
}
chrome.runtime.onMessage.addListener(m => { if (m.target === 'bg' && m.type === 'copy') copyText(m.text); });
chrome.management.onInstalled.addListener(async e => {
  if (e.installType !== 'development') return;
  const { queue = [] } = await chrome.storage.session.get('queue');
  const q = queue.filter(i => i.name !== e.name);
  if (q.length === queue.length) return;
  await chrome.storage.session.set({ queue: q });
  if (q.length) copyText(q[0].path);
});
