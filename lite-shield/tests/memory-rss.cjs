const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
// Đo PSS của tiến trình extension (cần Linux + playwright). Dùng: node tests/memory-rss.cjs [đường-dẫn-extension]
const EXT = process.argv[2] || require('path').resolve(__dirname, '..'); const http = require('http');
(async () => {
  const srv = http.createServer((q, r) => { r.setHeader('content-type','text/html'); r.end('<html><body><div class="adsbygoogle"></div>hi</body></html>'); }).listen(0);
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const sample = (label) => {
    const out = execSync("ps -eo pid,args | grep -E 'chrom' | grep -v grep").toString().split('\n').filter(l => /--extension-process/.test(l));
    let tot = 0; for (const l of out) { const pid = l.trim().split(/\s+/)[0]; try { const m = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8'); tot += +/Pss:\s+(\d+)/.exec(m)[1]; } catch {} }
    console.log(label.padEnd(26), `${out.length} tiến trình extension, PSS ${(tot/1024).toFixed(0)} MB`);
  };
  await new Promise(r => setTimeout(r, 3000)); sample('khởi động');
  for (let i = 0; i < 6; i++) { const p = await ctx.newPage(); await p.goto(`http://localhost:${srv.address().port}/?i=${i}`); }
  await new Promise(r => setTimeout(r, 3000)); sample('sau 6 trang');
  await ctx.close(); srv.close();
})();
