const { chromium } = require('playwright');
// Đo tỷ lệ chặn/chặn nhầm bằng chính DNR của Chrome (testMatchOutcome) trên bộ URL mẫu.
// Chạy: npm run test:corpus   (cần playwright + Chromium; KHÔNG dùng mạng)
// Các URL đã biết là không có quy tắc/không nên chặn (popads redirect=resource, mxpnl, hs-analytics, adtima-media, GTM noscript) được loại khỏi mẫu.
const EXT = process.env.EXT || require('path').resolve(__dirname, '..');
// [url, type, initiator]
const ADS = [
 ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js','script','https://www.nytimes.com'],
 ['https://securepubads.g.doubleclick.net/tag/js/gpt.js','script','https://www.cnn.com'],
 ['https://googleads.g.doubleclick.net/pagead/ads?client=ca-pub-1','sub_frame','https://example.org'],
 ['https://static.criteo.net/js/ld/publishertag.js','script','https://www.lemonde.fr'],
 ['https://cdn.taboola.com/libtrc/loader.js','script','https://www.msn.com'],
 ['https://widgets.outbrain.com/outbrain.js','script','https://www.cnn.com'],
 ['https://ads.pubmatic.com/AdServer/js/showad.js','script','https://example.org'],
 ['https://prebid.rubiconproject.com/x.js','script','https://example.org'],
 ['https://ib.adnxs.com/ut/v3/prebid','xmlhttprequest','https://example.org'],
 ['https://c.amazon-adsystem.com/aax2/apstag.js','script','https://example.org'],
 ['https://ad.doubleclick.net/ddm/trackimp/N1.1;sz=1x1','image','https://example.org'],
 ['https://adservice.google.com/adsid/google/ui','xmlhttprequest','https://example.org'],
 ['https://www.googletagservices.com/tag/js/gpt.js','script','https://example.org'],
 ['https://pixel.advertising.com/ups/1/sync','image','https://example.org'],
 ['https://a.exoclick.com/tag.js','script','https://example.org'],
 ['https://s.yimg.com/rq/darla/boot.js','script','https://www.yahoo.com'],
 ['https://cdn.adsafeprotected.com/iasPET.1.js','script','https://example.org'],
 ['https://js-sec.indexww.com/ht/p/1.js','script','https://example.org'],
 ['https://ads.yahoo.com/pixel','image','https://example.org'],
];
const TRACK = [
 ['https://www.google-analytics.com/analytics.js','script','https://example.org'],
 ['https://www.google-analytics.com/g/collect?v=2','xmlhttprequest','https://example.org'],
 ['https://www.googletagmanager.com/gtag/js?id=G-1','script','https://example.org'],
 ['https://connect.facebook.net/en_US/fbevents.js','script','https://example.org'],
 ['https://www.facebook.com/tr?id=1&ev=PageView','image','https://example.org'],
 ['https://static.hotjar.com/c/hotjar-1.js','script','https://example.org'],
 ['https://script.hotjar.com/modules.js','script','https://example.org'],
 ['https://bat.bing.com/bat.js','script','https://example.org'],
 ['https://analytics.tiktok.com/i18n/pixel/events.js','script','https://example.org'],
 ['https://cdn.segment.com/analytics.js/v1/x/analytics.min.js','script','https://example.org'],
 ['https://api.mixpanel.com/track','xmlhttprequest','https://example.org'],
 ['https://sb.scorecardresearch.com/beacon.js','script','https://example.org'],
 ['https://pixel.quantserve.com/pixel','image','https://example.org'],
 ['https://cdn.mouseflow.com/projects/x.js','script','https://example.org'],
 ['https://snap.licdn.com/li.lms-analytics/insight.min.js','script','https://example.org'],
 ['https://static.ads-twitter.com/uwt.js','script','https://example.org'],
 ['https://analytics.twitter.com/i/adsct','image','https://example.org'],
 ['https://www.clarity.ms/tag/x','script','https://example.org'],
];
const VN = [
 ['https://static.eclick.vn/eclick.js','script','https://example.vn'],
 ['https://media1.admicro.vn/core/adm_tracking.js','script','https://example.vn'],
 ['https://lg1.logging.admicro.vn/nr','image','https://example.vn'],
 ['https://ads.vnexpress.net/ads.js','script','https://vnexpress.net'],
];
const CLEAN = [
 ['https://www.nytimes.com/','main_frame',''],
 ['https://www.wikipedia.org/portal/wikipedia.org/assets/js/index.js','script','https://www.wikipedia.org'],
 ['https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg','image','https://en.wikipedia.org'],
 ['https://fonts.googleapis.com/css2?family=Inter','stylesheet','https://example.org'],
 ['https://fonts.gstatic.com/s/inter/v12/x.woff2','font','https://example.org'],
 ['https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js','script','https://example.org'],
 ['https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js','script','https://example.org'],
 ['https://unpkg.com/vue@3/dist/vue.global.js','script','https://example.org'],
 ['https://github.com/minhtrong67/my-chrome-extensions','main_frame',''],
 ['https://avatars.githubusercontent.com/u/1?v=4','image','https://github.com'],
 ['https://www.youtube.com/watch?v=dQw4w9WgXcQ','main_frame',''],
 ['https://i.ytimg.com/vi/x/hqdefault.jpg','image','https://www.youtube.com'],
 ['https://www.youtube.com/s/player/x/player_ias.vflset/en_US/base.js','script','https://www.youtube.com'],
 ['https://rr1---sn-x.googlevideo.com/videoplayback?id=1','media','https://www.youtube.com'],
 ['https://vnexpress.net/','main_frame',''],
 ['https://i1-vnexpress.vnecdn.net/2026/a.jpg','image','https://vnexpress.net'],
 ['https://s1.vnecdn.net/vnexpress/restruct/j/v1/index.js','script','https://vnexpress.net'],
 ['https://tuoitre.vn/','main_frame',''],
 ['https://static.mediacdn.vn/tuoitre/web_images/logo.png','image','https://tuoitre.vn'],
 ['https://dantri.com.vn/','main_frame',''],
 ['https://www.google.com/search?q=test','main_frame',''],
 ['https://www.gstatic.com/images/branding/googlelogo/1x/x.png','image','https://www.google.com'],
 ['https://maps.googleapis.com/maps/api/js?key=x','script','https://example.org'],
 ['https://www.recaptcha.net/recaptcha/api.js','script','https://example.org'],
 ['https://www.google.com/recaptcha/api.js','script','https://example.org'],
 ['https://challenges.cloudflare.com/turnstile/v0/api.js','script','https://example.org'],
 ['https://js.stripe.com/v3/','script','https://example.org'],
 ['https://www.paypal.com/sdk/js?client-id=x','script','https://example.org'],
 ['https://accounts.google.com/gsi/client','script','https://example.org'],
 ['https://platform.twitter.com/widgets.js','script','https://example.org'],
 ['https://www.facebook.com/','main_frame',''],
 ['https://static.xx.fbcdn.net/rsrc.php/v3/x.js','script','https://www.facebook.com'],
 ['https://shopee.vn/','main_frame',''],
 ['https://down-vn.img.susercontent.com/file/x','image','https://shopee.vn'],
 ['https://www.lazada.vn/','main_frame',''],
 ['https://stackoverflow.com/questions/1','main_frame',''],
 ['https://cdn.sstatic.net/Js/stub.en.js','script','https://stackoverflow.com'],
 ['https://www.reddit.com/r/all/','main_frame',''],
 ['https://www.redditstatic.com/desktop2x/img/x.png','image','https://www.reddit.com'],
 ['https://api.github.com/repos/a/b','xmlhttprequest','https://example.org'],
 ['https://www.zalo.me/','main_frame',''],
 ['https://stc-zaloid.zdn.vn/x.js','script','https://zalo.me'],
 ['https://www.netflix.com/','main_frame',''],
 ['https://assets.nflxext.com/x.js','script','https://www.netflix.com'],
 ['https://www.bbc.com/news','main_frame',''],
 ['https://static.files.bbci.co.uk/x.js','script','https://www.bbc.com'],
 ['https://cdn.shopify.com/s/files/x.js','script','https://example.myshopify.com'],
];
(async () => {
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  await new Promise(r => setTimeout(r, 2500));
  const run = (set, label, want) => sw.evaluate(async ({ set, label, want }) => {
    const cache = {}; const miss = []; let ok = 0;
    const act = async (m) => { const rs = cache[m.rulesetId] ??= await (await fetch(chrome.runtime.getURL(`rulesets/${m.rulesetId}.json`))).json(); const r = rs.find(x => x.id === m.ruleId); return r ? `${r.action.type}${r.priority ? '/' + r.priority : ''}` : '?'; };
    for (const [url, type, init] of set) {
      const r = await chrome.declarativeNetRequest.testMatchOutcome({ url, type, initiator: init || undefined });
      const acts = []; for (const m of r.matchedRules) acts.push(m.rulesetId + ':' + await act(m));
      // Kết quả cuối: chặn nếu có luật block/redirect/upgrade mà không bị luật allow ưu tiên cao hơn/ngang
      const prio = (a) => Number(a.split('/')[1] || 0);
      const allows = acts.filter(a => /:allow/.test(a)); const blocks = acts.filter(a => /:(block|redirect)/.test(a));
      const blocked = blocks.length > 0 && !allows.some(a => prio(a) >= Math.max(...blocks.map(prio)));
      if (blocked === want) ok++; else miss.push(url + '  ' + acts.join(' '));
    }
    return { label, ok, total: set.length, miss };
  }, { set, label, want });
  const out = [await run(ADS, 'ads', true), await run(TRACK, 'trackers', true), await run(VN, 'vn-ads', true), await run(CLEAN, 'clean(không được chặn)', false)];
  for (const o of out) console.log(o.label.padEnd(24), `${o.ok}/${o.total}`, o.miss.length ? '\n   ✗ ' + o.miss.join('\n   ✗ ') : '');
  await ctx.close();
})();

