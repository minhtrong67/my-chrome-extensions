import http from 'http';
const PAGE = (title, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b5cff"><title>${title}</title>
<style>body{margin:0;font:16px system-ui;background:#fff}header{background:#0b5cff;color:#fff;padding:16px;position:sticky;top:0}.grid{display:grid;gap:12px;padding:12px;grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}.card{background:#eef3ff;border-radius:12px;padding:16px;height:120px}
.bp::after{content:"base";font-weight:700}@media(min-width:640px){.bp::after{content:"sm"}}@media(min-width:768px){.bp::after{content:"md"}}@media(min-width:1024px){.bp::after{content:"lg"}}@media(min-width:1280px){.bp::after{content:"xl"}}</style></head>
<body><header><b>${title}</b> · <span class="bp"></span> · <span id="vp"></span> · <span id="ua"></span></header>
<div class="grid">${Array.from({ length: 60 }, (_, i) => `<div class="card">Card ${i + 1}</div>`).join('')}</div>
<script>const f=()=>{vp.textContent=innerWidth+'x'+innerHeight+' dpr'+devicePixelRatio;ua.textContent=/iPhone|Android/.test(navigator.userAgent)?'mobile-ua':'desktop-ua'};f();addEventListener('resize',f);${extra}</script></body></html>`;
export function start(port = 8765) {
  const s = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (u === '/host') return res.end(PAGE('Host page'));
    if (u === '/buster') return res.end(PAGE('Frame buster', 'if (top !== self) { try { top.location.href = "/busted"; } catch (e) {} }'));
    if (u === '/busted') return res.end('<h1>BUSTED - host navigated</h1>');
    if (u === '/slow') { setTimeout(() => res.end(PAGE('Slow page')), 4000); return; }
    if (u === '/media') return res.end(PAGE('Media', '').replace('</style>', '@media (hover: none){body{background:rgb(1,2,3)!important}}@media (hover: hover){body{outline:5px solid red}}</style>'));
    if (u === '/touch') return res.end(PAGE('Touch', 'window.__ev=[];["touchstart","touchmove","touchend","contextmenu"].forEach(n=>addEventListener(n,e=>__ev.push(n+(e.touches&&e.touches.length?":"+e.touches.length:"")),true));'));
    if (u === '/noviewport') return res.end(PAGE('No viewport meta').replace(/<meta name="viewport"[^>]*>/, ''));
    return res.end(PAGE('Test page ' + u));
  });
  return new Promise((r) => s.listen(port, () => r(s)));
}
