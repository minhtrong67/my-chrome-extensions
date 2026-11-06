// Kiểm tra ẩn quảng cáo "theo nhu cầu": phần tử có sẵn, thêm động và đổi class đều bị ẩn; phần tử sạch giữ nguyên.
const { chromium } = require('playwright'); const http = require('http');
const EXT = process.env.EXT || require('path').resolve(__dirname, '..');
(async () => {
  const srv = http.createServer((q, r) => { r.setHeader('content-type','text/html'); r.end('<html><body><div id="a" class="adsbygoogle">AD1</div><div class="keep">KEEP</div><div id="top-ad-banner-x">X</div></body></html>'); }).listen(0);
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker'); await new Promise(r => setTimeout(r, 2000));
  const p = await ctx.newPage(); await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForTimeout(1000);
  const disp = (sel) => p.evaluate(s => getComputedStyle(document.querySelector(s)).display, sel);
  console.log('adsbygoogle (có sẵn):', await disp('.adsbygoogle'), '| keep:', await disp('.keep'));
  // phần tử thêm động
  await p.evaluate(() => { const d = document.createElement('div'); d.className = 'ad-banner'; d.textContent = 'dyn'; d.id = 'dyn'; document.body.append(d); const k = document.createElement('div'); k.className = 'keep2'; k.id='k2'; document.body.append(k); });
  await p.waitForTimeout(800);
  console.log('ad-banner động:', await disp('#dyn'), '| keep2:', await disp('#k2'));
  await p.evaluate(() => { document.querySelector('.keep').className = 'ad-slot'; }); await p.waitForTimeout(800);
  console.log('đổi class → ad-slot:', await disp('.ad-slot'));
  const n = await p.evaluate(() => document.adoptedStyleSheets.reduce((a, s) => a + s.cssRules.length, 0) + document.styleSheets.length);
  console.log('tổng luật CSS trong trang:', n);
  await ctx.close(); srv.close();
})();
