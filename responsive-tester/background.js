'use strict';
const FILES = ['js/icons.js', 'lib/theme.js', 'js/i18n.js', 'js/devices.js', 'js/template.js', 'js/gif.js', 'js/app.js'];
const ALL_TYPES = ['sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'];

async function toggle(tab) {
  if (!tab || tab.id == null) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: 'rt-toggle' }); return; } catch (e) { /* not injected yet */ }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: FILES });
  } catch (e) {
    chrome.action.setBadgeBackgroundColor({ color: '#BA1A1A', tabId: tab.id });
    chrome.action.setBadgeText({ text: '!', tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2500);
  }
}

chrome.action.onClicked.addListener((tab) => toggle(tab));
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'open-simulator') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  toggle(tab);
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'rt-page', title: 'Open page in Responsive Tester', contexts: ['page'] });
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => toggle(tab));

/* ---- per-tab header rules (mobile User-Agent + allow embedding) ---- */
const ids = (tabId) => [tabId * 2, tabId * 2 + 1];
async function clearRules(tabId) {
  try { await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids(tabId) }); } catch (e) {}
}
async function setRules(tabId, m) {
  const [a, b] = ids(tabId), prof = m.prof;
  const build = (withCH) => {
    const rules = [];
    if (prof && prof.ua) {
      const rh = [{ header: 'user-agent', operation: 'set', value: prof.ua }];
      if (withCH) {
        if (prof.os === 'ios') ['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'].forEach((h) => rh.push({ header: h, operation: 'remove' }));
        else if (prof.os === 'android') rh.push({ header: 'sec-ch-ua-mobile', operation: 'set', value: prof.mobile ? '?1' : '?0' }, { header: 'sec-ch-ua-platform', operation: 'set', value: '"Android"' });
      }
      rules.push({ id: a, priority: 1, action: { type: 'modifyHeaders', requestHeaders: rh }, condition: { tabIds: [tabId], resourceTypes: ALL_TYPES } });
    }
    if (m.bypass) {
      rules.push({ id: b, priority: 1, action: { type: 'modifyHeaders', responseHeaders: [{ header: 'x-frame-options', operation: 'remove' }, { header: 'content-security-policy', operation: 'remove' }] }, condition: { tabIds: [tabId], resourceTypes: ['sub_frame'] } });
    }
    return rules;
  };
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [a, b], addRules: build(true) });
    return { ok: true };
  } catch (e1) {
    try { await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [a, b], addRules: build(false) }); return { ok: true }; }
    catch (e2) { return { ok: false, error: String(e2 && e2.message || e2) }; }
  }
}

chrome.runtime.onMessage.addListener((m, sender, send) => {
  const tab = sender.tab;
  if (!tab || !m) return;
  if (m.type === 'rules') { setRules(tab.id, m).then(send); return true; }
  if (m.type === 'clearRules') { clearRules(tab.id).then(() => send({ ok: true })); return true; }
  if (m.type === 'capture') {
    chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }).then((url) => send({ ok: true, url })).catch((e) => send({ ok: false, error: String(e) }));
    return true;
  }
});

// A real navigation of the tab ends the simulation: drop its header rules.
chrome.tabs.onUpdated.addListener((tabId, info) => { if (info.status === 'loading' && info.url) clearRules(tabId); });
chrome.tabs.onRemoved.addListener((tabId) => clearRules(tabId));
