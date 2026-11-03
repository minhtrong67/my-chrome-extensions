'use strict';
const L = {
en: { folder:'Folders', loaded:'Loaded', settings:'Settings', heroT:'Load unpacked extensions in bulk', heroD:'Pick one parent folder, see every extension inside it, then launch or load the ones you choose together.',
 pick:'Choose folder', repick:'Change folder', reconnect:'Reconnect folder',
 note:'Chrome does not let extensions install other extensions. Two routes here: a launch script for Chromium or Chrome for Testing (loads all at once), or a guided queue for regular Chrome.',
 basePath:'Folder path', basePh:'C:\\dev\\extensions', search:'Search', selAll:'Select all', nSel:'{n} selected', guide:'Guided load', script:'Launch script', copyPaths:'Copy paths',
 empty:'No extension found. Choose a folder whose sub-folders contain manifest.json.', invalid:'Invalid', mv2:'Manifest V2', isLoaded:'Loaded',
 loadedT:'Loaded unpacked extensions', reloadAll:'Reload all enabled', enAll:'Enable all', disAll:'Disable all', noDev:'No unpacked extension is loaded yet.',
 lang:'Language', theme:'Theme', auto:'Auto', light:'Light', dark:'Dark', accent:'Accent colour', forget:'Forget folder',
 scriptT:'Launch script', scriptD:'Starts Chromium or Chrome for Testing with every selected extension. Chrome 137+ (official build) ignores --load-extension.',
 browser:'Browser executable', profile:'Profile folder (optional)', copy:'Copy', download:'Download', close:'Close',
 guideT:'Guided load', guideD:'Open chrome://extensions, then for each extension: click Load unpacked, press Ctrl+V, press Enter twice. The next path is copied for you automatically.',
 openExt:'Open chrome://extensions', copied:'Copied', noBase:'Enter the folder path first so full paths can be built.', reloaded:'Reloaded {n}' },
vi: { folder:'Thư mục', loaded:'Đã tải', settings:'Cài đặt', heroT:'Tải hàng loạt extension giải nén', heroD:'Chọn một thư mục cha, xem mọi extension bên trong, rồi khởi chạy hoặc tải cùng lúc những cái bạn chọn.',
 pick:'Chọn thư mục', repick:'Đổi thư mục', reconnect:'Kết nối lại thư mục',
 note:'Chrome không cho extension tự cài extension khác. Có hai cách: script khởi chạy cho Chromium hoặc Chrome for Testing (tải tất cả cùng lúc), hoặc hàng đợi hướng dẫn cho Chrome thường.',
 basePath:'Đường dẫn thư mục', search:'Tìm kiếm', selAll:'Chọn tất cả', nSel:'Đã chọn {n}', guide:'Tải từng bước', script:'Script khởi chạy', copyPaths:'Sao chép đường dẫn',
 empty:'Không tìm thấy extension. Hãy chọn thư mục có các thư mục con chứa manifest.json.', invalid:'Không hợp lệ', isLoaded:'Đã tải',
 loadedT:'Extension giải nén đã tải', reloadAll:'Tải lại tất cả đang bật', enAll:'Bật tất cả', disAll:'Tắt tất cả', noDev:'Chưa có extension giải nén nào được tải.',
 lang:'Ngôn ngữ', theme:'Giao diện', auto:'Tự động', light:'Sáng', dark:'Tối', accent:'Màu chủ đạo', forget:'Quên thư mục',
 scriptT:'Script khởi chạy', scriptD:'Mở Chromium hoặc Chrome for Testing kèm mọi extension đã chọn. Chrome chính thức 137+ bỏ qua --load-extension.',
 browser:'Đường dẫn trình duyệt', profile:'Thư mục profile (tuỳ chọn)', copy:'Sao chép', download:'Tải xuống', close:'Đóng',
 guideT:'Tải từng bước', guideD:'Mở chrome://extensions, rồi với mỗi extension: bấm Load unpacked, nhấn Ctrl+V, nhấn Enter hai lần. Đường dẫn của extension kế tiếp được tự động chép sẵn.',
 openExt:'Mở chrome://extensions', copied:'Đã sao chép', noBase:'Hãy nhập đường dẫn thư mục trước để tạo đường dẫn đầy đủ.', reloaded:'Đã tải lại {n}' }
};
const P = {
folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
sliders:'<path d="M4 6h7m6 0h3M4 12h3m6 0h7M4 18h9m6 0h1"/><circle cx="14" cy="6" r="2.5"/><circle cx="10" cy="12" r="2.5"/><circle cx="16" cy="18" r="2.5"/>',
check:'<path d="m5 12 5 5 9-10"/>', search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
puzzle:'<path d="M12 3a2 2 0 0 1 2 2v1h4a1 1 0 0 1 1 1v4h-1a2 2 0 1 0 0 4h1v4a1 1 0 0 1-1 1h-4v-1a2 2 0 1 0-4 0v1H6a1 1 0 0 1-1-1v-4h1a2 2 0 1 0 0-4H5V7a1 1 0 0 1 1-1h4V5a2 2 0 0 1 2-2z"/>',
terminal:'<path d="m4 7 5 5-5 5M12 18h8"/>', copy:'<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
x:'<path d="M6 6l12 12M18 6 6 18"/>', refresh:'<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>', list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1"/>',
download:'<path d="M12 4v11m-5-4 5 5 5-5M5 20h14"/>', all:'<path d="m3 12 4 4 8-9M12 16l1 1 8-9"/>'
};
const HUES = [270, 335, 15, 150, 200, 45];
const DEF = { win:'%LOCALAPPDATA%\\Chromium\\Application\\chrome.exe', mac:'/Applications/Chromium.app/Contents/MacOS/Chromium', lin:'chromium' };
const S = { page:'folder', lang:'en', mode:'auto', hue:270, base:'', root:null, perm:true, items:[], sel:new Set(), q:'', dev:[], done:new Set(), dlgFn:null,
  sc:{ os:/Win/.test(navigator.platform)?'win':/Mac/.test(navigator.platform)?'mac':'lin', browser:'', profile:'' } };
const $ = s => document.querySelector(s), dlg = $('#dlg');
const t = (k, v = {}) => (L[S.lang][k] ?? L.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x]);
const ic = n => `<svg viewBox="0 0 24 24">${P[n]}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hs = (h, s, l) => `hsl(${(h % 360 + 360) % 360} ${s}% ${l}%)`;
let tt; const toast = m => { const e = $('#toast'); e.textContent = m; e.hidden = false; clearTimeout(tt); tt = setTimeout(() => e.hidden = true, 2200); };

function theme() {
  const d = S.mode === 'dark' || (S.mode === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches), H = S.hue, T = H + 60;
  const c = d ? { p:hs(H,90,80), onp:hs(H,70,18), pc:hs(H,45,28), onpc:hs(H,90,90), tc:hs(T,38,26), ontc:hs(T,80,90), s:hs(H,18,8), c1:hs(H,16,11), c2:hs(H,15,14), c3:hs(H,14,18), c4:hs(H,13,22), ons:hs(H,15,90), onsv:hs(H,10,75), ol:hs(H,6,58), inv:hs(H,15,90), oninv:hs(H,20,15), errc:'#93000a', onerrc:'#ffdad6' }
    : { p:hs(H,55,40), onp:'#fff', pc:hs(H,85,90), onpc:hs(H,70,14), tc:hs(T,70,88), ontc:hs(T,60,15), s:hs(H,35,98), c1:hs(H,30,96), c2:hs(H,28,93), c3:hs(H,26,90), c4:hs(H,24,86), ons:hs(H,20,10), onsv:hs(H,12,30), ol:hs(H,8,48), inv:hs(H,20,18), oninv:hs(H,20,94), errc:'#ffdad6', onerrc:'#410002' };
  for (const [k, v] of Object.entries(c)) document.documentElement.style.setProperty('--' + k, v);
  document.documentElement.style.colorScheme = d ? 'dark' : 'light';
}

/* storage for the folder handle */
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('ul', 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbGet = async k => { const d = await idb(); return new Promise(r => { const q = d.transaction('k').objectStore('k').get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(); }); };
const idbSet = async (k, v) => { const d = await idb(); return new Promise(r => { const tx = d.transaction('k', 'readwrite'); v === undefined ? tx.objectStore('k').delete(k) : tx.objectStore('k').put(v, k); tx.oncomplete = r; }); };

/* folder scanning */
async function readBlob(dir, path) {
  try { let d = dir; const p = path.replace(/^\.?\//, '').split('/'), fn = p.pop(); for (const s of p) d = await d.getDirectoryHandle(s); return await (await d.getFileHandle(fn)).getFile(); } catch { return null; }
}
async function readJSON(d, p) { const f = await readBlob(d, p); if (!f) return null; try { return JSON.parse((await f.text()).replace(/^\uFEFF/, '')); } catch (e) { return { __err: e.message }; } }
async function msg(dir, m, s) {
  const k = /^__MSG_(.+)__$/.exec(s || ''); if (!k) return s;
  const j = await readJSON(dir, `_locales/${m.default_locale || 'en'}/messages.json`), e = j && Object.entries(j).find(([x]) => x.toLowerCase() === k[1].toLowerCase());
  return e?.[1]?.message || s;
}
async function info(dir, rel, m) {
  const it = { rel, label: rel || dir.name, name: dir.name, version: '', mv: m.manifest_version, err: '', icon: '' };
  if (m.__err) { it.err = m.__err; return it; }
  it.name = (await msg(dir, m, m.name)) || dir.name; it.version = m.version || '';
  if (!m.name || !m.version || ![2, 3].includes(m.manifest_version)) it.err = 'manifest';
  const ic0 = m.icons || (m.action && typeof m.action.default_icon === 'object' && m.action.default_icon) || (m.browser_action && m.browser_action.default_icon);
  const p = typeof ic0 === 'string' ? ic0 : ic0 && ic0[Object.keys(ic0).sort((a, b) => b - a)[0]];
  if (p) { const f = await readBlob(dir, p); if (f) it.icon = URL.createObjectURL(f); }
  return it;
}
async function walk(dir, rel, depth, out) {
  const m = await readJSON(dir, 'manifest.json');
  if (m) { out.push(await info(dir, rel, m)); return; }
  if (depth >= 2) return;
  for await (const [n, h] of dir.entries()) if (h.kind === 'directory' && !/^(\.|node_modules$)/.test(n)) await walk(h, rel ? rel + '/' + n : n, depth + 1, out);
}
async function doScan() {
  const out = []; await walk(S.root, '', 0, out); out.sort((a, b) => a.name.localeCompare(b.name));
  S.items = out; S.sel = new Set([...S.sel].filter(k => out.some(i => i.rel === k))); render();
}

/* helpers */
const chosen = () => S.items.filter(i => S.sel.has(i.rel));
const isLoaded = i => S.dev.some(e => e.name === i.name && e.version === i.version);
const sepOf = () => S.base ? (/\\|^[A-Za-z]:/.test(S.base) ? '\\' : '/') : (S.sc.os === 'win' ? '\\' : '/');
const abs = i => { const s = sepOf(), b = S.base.replace(/[\\/]+$/, '') || '<BASE_PATH>'; return i.rel ? b + s + i.rel.split('/').join(s) : b; };
const loadDev = async () => { S.dev = (await chrome.management.getAll()).filter(e => e.installType === 'development' && e.id !== chrome.runtime.id).sort((a, b) => a.name.localeCompare(b.name)); };
const reload = async id => { await chrome.management.setEnabled(id, false); await chrome.management.setEnabled(id, true); };
function mkScript() {
  const o = S.sc, p = chosen().map(abs).join(','), br = o.browser || DEF[o.os], pf = o.profile ? ` --user-data-dir="${o.profile}"` : '';
  return o.os === 'win' ? `@echo off\nstart "" "${br}" --load-extension="${p}"${pf}` : `#!/usr/bin/env bash\n"${br}" --load-extension="${p}"${pf} >/dev/null 2>&1 &`;
}

/* views */
const nav = () => [['folder','folder','folder'],['loaded','layers','loaded'],['settings','sliders','settings']].map(([p, i, k]) => `<button class="nb${S.page === p ? ' on' : ''}" data-act="nav" data-p="${p}"><span>${ic(i)}</span>${t(k)}</button>`).join('');
const card = i => { const on = S.sel.has(i.rel);
  return `<button class="card${on ? ' on' : ''}${i.err ? ' bad' : ''}" data-act="tog" data-k="${esc(i.rel)}" ${i.err ? 'disabled' : ''}><span class="ico">${ic('puzzle')}${i.icon ? `<img src="${i.icon}" alt="">` : ''}</span><span class="tx"><b>${esc(i.name)}</b><small>${esc(i.label)}</small><span class="chips">${i.err ? `<i class="e">${t('invalid')}</i>` : `<i>v${esc(i.version)}</i><i>MV${i.mv}</i>`}${i.mv === 2 && !i.err ? `<i class="e">${t('mv2')}</i>` : ''}${isLoaded(i) ? `<i class="g">${t('isLoaded')}</i>` : ''}</span></span><span class="chk">${ic('check')}</span></button>`; };
const gridHTML = () => { const l = S.items.filter(i => (i.name + i.label).toLowerCase().includes(S.q.toLowerCase()));
  return l.length ? `<div class="grid">${l.map(card).join('')}</div>` : (S.root && S.perm ? `<p class="empty">${t('empty')}</p>` : ''); };
const toolbar = () => `<div class="tb"><span>${t('nSel', { n: S.sel.size })}</span><button class="btn f" data-act="guide">${ic('list')}${t('guide')}</button><button class="btn t" data-act="script">${ic('terminal')}${t('script')}</button><button class="btn t ib" data-act="copy" title="${t('copyPaths')}">${ic('copy')}</button><button class="btn tx ib" data-act="clear">${ic('x')}</button></div>`;
const pFolder = () => `<section class="hero"><div><h1>${t('heroT')}</h1><p>${t('heroD')}</p><div class="row"><button class="btn f lg" data-act="pick">${ic('folder')}${t(S.root ? 'repick' : 'pick')}</button>${S.root && !S.perm ? `<button class="btn t lg" data-act="reconnect">${t('reconnect')}</button>` : ''}</div></div><div class="blob">${ic('layers')}</div></section>
<div class="note">${ic('info')}<span>${t('note')}</span></div>
${S.root ? `<div class="bar"><label class="fld"><span>${t('basePath')}</span><input id="base" value="${esc(S.base)}" placeholder="${esc(t('basePh'))}"></label><label class="search">${ic('search')}<input id="q" value="${esc(S.q)}" placeholder="${t('search')}"></label><button class="btn t" data-act="all">${ic('all')}${t('selAll')}</button></div>` : ''}
<div id="grid">${gridHTML()}</div>${S.sel.size ? toolbar() : ''}`;
const row = e => { const u = e.icons && e.icons.length ? e.icons[e.icons.length - 1].url : '';
  return `<div class="r2"><span class="ico">${ic('puzzle')}${u ? `<img src="${esc(u)}" alt="">` : ''}</span><span class="tx"><b>${esc(e.name)}</b><small>v${esc(e.version)}</small></span><button class="btn t ib" data-act="reload" data-id="${e.id}" title="Reload">${ic('refresh')}</button><button class="btn t ib" data-act="detail" data-id="${e.id}" title="${t('settings')}">${ic('ext')}</button><label class="sw"><input type="checkbox" data-en="${e.id}" ${e.enabled ? 'checked' : ''}><i></i></label></div>`; };
const pLoaded = () => `<h2 class="ph">${t('loadedT')}</h2><div class="row"><button class="btn f" data-act="reloadAll">${ic('refresh')}${t('reloadAll')}</button><button class="btn t" data-act="enAll">${t('enAll')}</button><button class="btn t" data-act="disAll">${t('disAll')}</button></div>${S.dev.length ? `<div class="list">${S.dev.map(row).join('')}</div>` : `<p class="empty">${t('noDev')}</p>`}`;
const seg = (k, o) => `<div class="seg">${o.map(([v, n]) => `<button data-act="${k}" data-v="${v}" class="${S[k] === v ? 'on' : ''}">${n}</button>`).join('')}</div>`;
const pSet = () => `<h2 class="ph">${t('settings')}</h2><div class="set"><section><h3>${t('lang')}</h3>${seg('lang', [['en','English'],['vi','Tiếng Việt']])}</section><section><h3>${t('theme')}</h3>${seg('mode', [['auto',t('auto')],['light',t('light')],['dark',t('dark')]])}</section><section><h3>${t('accent')}</h3><div class="sws">${HUES.map(h => `<button data-act="hue" data-v="${h}" class="${S.hue === h ? 'on' : ''}" style="background:${hs(h,65,45)}">${ic('check')}</button>`).join('')}</div></section><section><h3>${t('folder')}</h3><div class="row"><button class="btn t" data-act="forget">${t('forget')}</button></div></section></div>`;
function render() { document.documentElement.lang = S.lang; $('#nav').innerHTML = nav(); $('#main').innerHTML = { folder: pFolder, loaded: pLoaded, settings: pSet }[S.page](); }
function syncSel() {
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('on', S.sel.has(c.dataset.k)));
  const tb = $('.tb'); if (!S.sel.size) tb?.remove(); else if (tb) tb.firstElementChild.textContent = t('nSel', { n: S.sel.size }); else $('#main').insertAdjacentHTML('beforeend', toolbar());
}

/* dialogs */
const dlgShow = fn => { S.dlgFn = fn; dlg.innerHTML = fn(); if (!dlg.open) dlg.showModal(); };
dlg.addEventListener('close', () => { S.dlgFn = null; chrome.storage.session.set({ queue: [] }); });
const dScript = () => `<h3>${t('scriptT')}</h3><p class="sub">${t('scriptD')}</p><label class="inp">${t('basePath')}<input data-f="base" value="${esc(S.base)}" placeholder="${esc(t('basePh'))}"></label><div class="row"><div class="seg">${[['win','Windows'],['mac','macOS'],['lin','Linux']].map(([k, n]) => `<button data-act="os" data-k="${k}" class="${S.sc.os === k ? 'on' : ''}">${n}</button>`).join('')}</div></div><label class="inp">${t('browser')}<input data-f="browser" value="${esc(S.sc.browser)}" placeholder="${esc(DEF[S.sc.os])}"></label><label class="inp">${t('profile')}<input data-f="profile" value="${esc(S.sc.profile)}"></label><pre id="code">${esc(mkScript())}</pre><div class="row"><button class="btn f" data-act="cpcode">${ic('copy')}${t('copy')}</button><button class="btn t" data-act="dlcode">${ic('download')}${t('download')}</button><button class="btn tx" data-act="close">${t('close')}</button></div>`;
const dGuide = () => { const q = chosen(), cur = q.find(i => !S.done.has(i.rel));
  return `<h3>${t('guideT')}</h3><p class="sub">${t('guideD')}</p><div class="row"><button class="btn t" data-act="openext">${ic('ext')}${t('openExt')}</button><span class="sub">${q.filter(i => S.done.has(i.rel)).length}/${q.length}</span></div><label class="inp">${t('basePath')}<input data-f="base" value="${esc(S.base)}" placeholder="${esc(t('basePh'))}"></label><ol class="q">${q.map(i => { const d = S.done.has(i.rel);
  return `<li class="${d ? 'd' : ''}${i === cur ? ' c' : ''}"><span class="ico" style="width:44px;height:44px;border-radius:14px">${ic('puzzle')}${i.icon ? `<img src="${i.icon}" alt="">` : ''}</span><span class="tx"><b>${esc(i.name)}</b><small>${esc(abs(i))}</small></span>${d ? ic('check') : `<button class="btn t ib" data-act="cp" data-text="${esc(abs(i))}">${ic('copy')}</button>`}</li>`; }).join('')}</ol><div class="row"><button class="btn tx" data-act="close">${t('close')}</button></div>`; };

/* actions */
const clip = async s => { await navigator.clipboard.writeText(s); toast(t('copied')); };
const armQueue = async () => { const q = chosen().filter(i => !S.done.has(i.rel)).map(i => ({ name: i.name, path: abs(i) })); await chrome.storage.session.set({ queue: q }); if (q.length) chrome.runtime.sendMessage({ target: 'bg', type: 'copy', text: q[0].path }); };
const A = {
  nav: b => { S.page = b.dataset.p; render(); },
  pick: async () => { S.root = await showDirectoryPicker({ mode: 'read' }); await idbSet('root', S.root); S.perm = true; S.sel.clear(); await doScan(); },
  reconnect: async () => { S.perm = (await S.root.requestPermission({ mode: 'read' })) === 'granted'; S.perm ? await doScan() : render(); },
  tog: b => { const k = b.dataset.k; S.sel.has(k) ? S.sel.delete(k) : S.sel.add(k); syncSel(); },
  all: () => { const v = S.items.filter(i => !i.err); S.sel = new Set(S.sel.size === v.length ? [] : v.map(i => i.rel)); syncSel(); },
  clear: () => { S.sel.clear(); syncSel(); },
  copy: () => clip(chosen().map(abs).join('\n')),
  cp: b => clip(b.dataset.text),
  guide: () => { S.done = new Set(chosen().filter(isLoaded).map(i => i.rel)); dlgShow(dGuide); armQueue(); },
  script: () => dlgShow(dScript),
  os: b => { S.sc.os = b.dataset.k; dlgShow(dScript); },
  cpcode: () => clip(mkScript()),
  dlcode: () => { const w = S.sc.os === 'win', a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([w ? mkScript().replace(/\n/g, '\r\n') : mkScript()])); a.download = w ? 'load-extensions.bat' : 'load-extensions.sh'; a.click(); },
  close: () => dlg.close(),
  openext: () => chrome.tabs.create({ url: 'chrome://extensions' }),
  reload: async b => { await reload(b.dataset.id); toast(t('reloaded', { n: 1 })); },
  detail: b => chrome.tabs.create({ url: 'chrome://extensions/?id=' + b.dataset.id }),
  reloadAll: async () => { const l = S.dev.filter(e => e.enabled); for (const e of l) await reload(e.id); toast(t('reloaded', { n: l.length })); },
  enAll: async () => { for (const e of S.dev) await chrome.management.setEnabled(e.id, true); },
  disAll: async () => { for (const e of S.dev) await chrome.management.setEnabled(e.id, false); },
  lang: b => { S.lang = b.dataset.v; chrome.storage.local.set({ lang: S.lang }); render(); },
  mode: b => { S.mode = b.dataset.v; chrome.storage.local.set({ mode: S.mode }); theme(); render(); },
  hue: b => { S.hue = +b.dataset.v; chrome.storage.local.set({ hue: S.hue }); theme(); render(); },
  forget: async () => { S.root = null; S.items = []; S.sel.clear(); await idbSet('root'); S.perm = true; S.page = 'folder'; render(); }
};
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  try { await A[b.dataset.act](b); } catch (err) { if (err.name !== 'AbortError') toast(err.message); }
});
document.addEventListener('change', async e => { const id = e.target.dataset.en; if (id) try { await chrome.management.setEnabled(id, e.target.checked); } catch (err) { toast(err.message); } });
document.addEventListener('input', e => {
  const x = e.target;
  if (x.id === 'base') { S.base = x.value.trim(); chrome.storage.local.set({ base: S.base }); }
  else if (x.id === 'q') { S.q = x.value; $('#grid').innerHTML = gridHTML(); syncSel(); }
  else if (x.dataset.f === 'base') { S.base = x.value.trim(); chrome.storage.local.set({ base: S.base }); if ($('#code')) $('#code').textContent = mkScript(); else { armQueue(); chosen().forEach((i, n) => { const li = dlg.querySelectorAll('ol.q li')[n], b = li.querySelector('[data-text]'); li.querySelector('small').textContent = abs(i); if (b) b.dataset.text = abs(i); }); } }
  else if (x.dataset.f) { S.sc[x.dataset.f] = x.value; $('#code').textContent = mkScript(); }
});
document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);

async function refresh() {
  await loadDev();
  if (S.dlgFn === dGuide) chosen().filter(isLoaded).forEach(i => S.done.add(i.rel));
  if (S.page !== 'settings') { const y = scrollY; render(); scrollTo(0, y); }
  if (dlg.open && S.dlgFn) dlg.innerHTML = S.dlgFn();
}
['onInstalled', 'onUninstalled', 'onEnabled', 'onDisabled'].forEach(n => chrome.management[n].addListener(refresh));
matchMedia('(prefers-color-scheme:dark)').onchange = theme;

(async () => {
  Object.assign(S, await chrome.storage.local.get({ lang: navigator.language.startsWith('vi') ? 'vi' : 'en', mode: 'auto', hue: 270, base: '' }));
  theme(); await loadDev(); S.root = (await idbGet('root')) || null;
  if (S.root) { S.perm = (await S.root.queryPermission({ mode: 'read' })) === 'granted'; if (S.perm) { await doScan(); return; } }
  render();
})();
