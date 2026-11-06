// End-to-end checks against a real Chrome. The extension APIs are mocked, the overlay (app.js),
// the frame agent (agent.js) and a local test server are real. Run: CHROME_PATH=/path/to/chrome npm run test:e2e
import { boot } from './harness.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  (' + extra + ')' : '')); };
const Q = (page, code) => page.evaluate(`(()=>{const root=document.getElementById('responsive-tester-root').shadowRoot;const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];${code}})()`);
const frameProbe = async (h) => { const f = h.page.frames().find((x) => x !== h.page.mainFrame()); return f ? f.evaluate(() => ({ ua: navigator.userAgent, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, touch: navigator.maxTouchPoints })) : null; };
async function session(url, storage, fn) {
  const h = await boot({ url, storage: { rt_seen: 1, ...storage } });
  try { await h.inject(); await sleep(2300); await fn(h); } finally { await h.close(); }
}

await session('/host', {}, async (h) => {
  const p = await frameProbe(h);
  check('overlay opens and the frame agent answers', p && /iPhone/.test(p.ua) && p.w === 393 && p.dpr === 3, JSON.stringify(p));
  check('buttons and list items keep their layout (CSS not broken)', await Q(h.page, "const b=getComputedStyle($('#btnSettings')), d=$('#devList .dev').getBoundingClientRect(), c=$('#filterChips .chip').getBoundingClientRect(), f=$$('#devList .dev').every(e=>e.getBoundingClientRect().height>30&&e.getBoundingClientRect().height<80); return b.position==='relative' && b.content!=='\"\"' && f && c.height>20 && c.height<50 && $$('.tbtn').every(e=>e.getBoundingClientRect().height>40)"));
  check('viewport readout', /393 × 764/.test(await Q(h.page, "return $('#vpInfo').textContent")));
  check('side buttons stay thin', (await Q(h.page, "return $$('.sbtn').every(b=>b.getBoundingClientRect().width<8)")));
  check('status bar takes the page theme colour', /rgb\(11, ?92, ?255\)/.test(await Q(h.page, "return getComputedStyle($('.sysbar.top')).backgroundColor")));
  await Q(h.page, "$$('#devList .dev').find(d=>d.textContent.includes('Desktop Full HD')).click()"); await sleep(2500);
  const d = await frameProbe(h);
  check('switching to desktop restores the real User-Agent', d && !/iPhone|Android/.test(d.ua) && d.w === 1920 && d.touch === 0, JSON.stringify(d));
  await Q(h.page, "$$('#devList .dev').find(d=>d.textContent.includes('Pixel 9')&&!d.textContent.includes('XL')).click()"); await sleep(2500);
  const a = await frameProbe(h);
  check('switching to Android applies the Android User-Agent', a && /Android/.test(a.ua) && a.touch === 5, JSON.stringify(a));
  await Q(h.page, "$('#btnGrid').click()"); await sleep(150);
  check('grid overlay toggles', await Q(h.page, "return $('.screen').classList.contains('grid')"));
  await Q(h.page, "$('#btnQr').click()"); await sleep(250);
  check('QR code renders', await Q(h.page, "return !!$('#qrBox svg path')"));
  await Q(h.page, "$('#dlgQr [data-close]').click()");
  await Q(h.page, "$$('.favb')[2].click()"); await sleep(150);
  await Q(h.page, "$$('#filterChips .chip').find(c=>c.textContent==='Favorites').click()"); await sleep(250);
  check('favourites filter', (await Q(h.page, "return $$('#devList .dev').length")) === 1);
  await Q(h.page, "$('[data-mode=compare]').click()"); await sleep(1500);
  check('compare mode shows several devices', (await Q(h.page, "return $$('.slot').length")) >= 2);
  await Q(h.page, "$('#btnSettings').click()"); await sleep(400);
  await Q(h.page, "$$('.acc-h')[0].click()"); await sleep(300);
  const before = await Q(h.page, "return document.getElementById('responsive-tester-root').style.getPropertyValue('--md-primary')");
  await Q(h.page, "$$('.pal-i').find(n=>n.dataset.hex==='#009688').click()");
  const after = await Q(h.page, "return document.getElementById('responsive-tester-root').style.getPropertyValue('--md-primary')");
  check('theme colour changes the palette', before !== after, before + ' -> ' + after);
  await Q(h.page, "$$('.acc-h')[1].click()"); await sleep(300);
  await Q(h.page, "$('#settingsBody .select .sel-btn').click()"); await sleep(200);
  check('custom select opens with all fonts', (await Q(h.page, "return $$('.sel-opt').length")) === 7);
});

await session('/host', {}, async (h) => {
  await Q(h.page, "$('#btnShotFull').click()"); await sleep(12000);
  const dl = await h.page.evaluate('window.__dl.map(d=>({name:d.name,len:d.data.length}))');
  check('full-page screenshot is produced', dl.length === 1 && /fullpage/.test(dl[0].name), JSON.stringify(dl));
  if (dl.length) {
    const dims = await h.page.evaluate(async () => { const i = new Image(); i.src = window.__dl[0].data; await i.decode(); return { w: i.naturalWidth, h: i.naturalHeight }; });
    check('full-page image covers the whole document', dims.w >= 390 && dims.h > 2500, JSON.stringify(dims));
  }
  await Q(h.page, "$('#btnShot').click()"); await sleep(1500);
  check('visible screenshot is produced', (await h.page.evaluate('window.__dl.length')) === 2);
});
await session('/media', {}, async (h) => {
  const f = h.page.frames().find((x) => x !== h.page.mainFrame());
  const bg = await f.evaluate(() => getComputedStyle(document.body).backgroundColor), hov = await f.evaluate(() => matchMedia('(hover: hover)').matches);
  check('touch emulation rewrites hover / pointer media rules', bg === 'rgb(1, 2, 3)' && hov === false, bg + ' hover=' + hov);
});
await session('/touch', {}, async (h) => {
  const box = await Q(h.page, "const r=$('iframe').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}");
  await h.page.mouse.move(box.x, box.y); await h.page.mouse.down(); await sleep(750); await h.page.mouse.up(); await sleep(100);
  const f = h.page.frames().find((x) => x !== h.page.mainFrame());
  let ev = await f.evaluate(() => window.__ev.join(','));
  check('long press fires contextmenu', /contextmenu/.test(ev), ev);
  await f.evaluate(() => { window.__ev.length = 0; });
  await h.page.keyboard.down('Shift'); await h.page.mouse.move(box.x, box.y); await h.page.mouse.down(); await h.page.mouse.move(box.x + 40, box.y + 5, { steps: 4 }); await h.page.mouse.up(); await h.page.keyboard.up('Shift'); await sleep(100);
  ev = await f.evaluate(() => window.__ev.join(','));
  check('Shift + drag emulates a two-finger pinch', /touchstart:2/.test(ev) && /touchmove:2/.test(ev), ev);
});
await session('/noviewport', {}, async (h) => {
  const t = await Q(h.page, "return $('#vpInfo').textContent"), k = await Q(h.page, "return $('iframe').style.transform");
  check('page without viewport meta renders at 980px', /Layout 980/.test(t) && /scale\(0\.40/.test(k), t + ' ' + k);
});
await session('/buster', {}, async (h) => { await sleep(1500); check('frame-busting page cannot navigate the tab', (await h.page.evaluate('location.pathname')) === '/buster'); });
{
  const h = await boot({ url: '/host', storage: {} });
  try { await h.inject(); await sleep(3000); check('first-run tour opens', await Q(h.page, "return $('#dlgTour').hasAttribute('open')")); } finally { await h.close(); }
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
