#!/usr/bin/env node
// Kiểm thử nhanh bộ phân tích bộ lọc:  node tools/test-filters.mjs
import assert from 'node:assert/strict';
import { compile, parseLine, resolveCosmetic, resolveScriptlets, hostChain } from '../shared/filters.js';
import { isSimpleSelector, toSelectorChunks } from '../shared/selector.js';

const net = (line) => {
  const p = parseLine(line);
  assert.equal(p.kind, 'network', `${line} → ${JSON.stringify(p)}`);
  return p;
};

// --- mạng ---
assert.deepEqual(net('||ads.example.com^').condition, { urlFilter: '||ads.example.com^' });
assert.equal(net('||ads.example.com^').domainOnly, 'ads.example.com');
assert.equal(net('/banner/*').domainOnly, null);

let p = net('||cdn.example.com/x.js$script,third-party,domain=a.com|~b.com');
assert.deepEqual(p.condition, {
  urlFilter: '||cdn.example.com/x.js',
  domainType: 'thirdParty',
  resourceTypes: ['script'],
  initiatorDomains: ['a.com'],
  excludedInitiatorDomains: ['b.com'],
});

p = net('@@||example.com^$document');
assert.equal(p.action.type, 'allowAllRequests');
assert.deepEqual(p.condition.resourceTypes, ['main_frame', 'sub_frame']);

p = net('@@||good.example.com^');
assert.equal(p.action.type, 'allow');
assert.equal(p.priority, 2);

assert.equal(net('||x.com^$important').priority, 3);
assert.deepEqual(net('||x.com/a$~image,~font').condition.excludedResourceTypes, ['image', 'font']);
assert.equal(net('/ads\\d+\\.js/').condition.regexFilter, 'ads\\d+\\.js');
assert.equal(net('0.0.0.0 tracker.evil.net').domainOnly, 'tracker.evil.net');

// --- lỗi / không hỗ trợ ---
assert.equal(parseLine('||x.com^$redirect=google-ima.js').kind, 'error'); // tài nguyên không đóng gói
{
  const r = parseLine('||x.com/a.js$script,redirect=noopjs');
  assert.equal(r.kind, 'network');
  assert.equal(r.action.type, 'redirect');
  assert.equal(r.action.redirect.extensionPath, '/res/noop.js');
  assert.equal(r.priority, 2);
}
{
  const r = parseLine("example.com##+js(aopr, foo.bar, 'a\\, b')");
  assert.equal(r.kind, 'scriptlet');
  assert.deepEqual([r.name, ...r.args], ['aopr', 'foo.bar', 'a, b']);
  assert.equal(parseLine('example.com##+js(trusted-set-cookie, a, b)').kind, 'error');
}
assert.equal(parseLine('example.com##div:has-text(Quảng cáo)').kind, 'error');
assert.equal(parseLine('##.a{color:red}').kind, 'error');
assert.equal(parseLine('! bình luận').kind, 'empty');
assert.equal(parseLine('[Adblock Plus 2.0]').kind, 'empty');

// --- cosmetic ---
const res = compile(`
##.generic
a.com,b.com###hero-ad
~c.com##.not-on-c
a.com#@#.generic
||t1.com^
||t2.com^
@@||ok.t1.com^
`);
assert.equal(res.counts.cosmetic, 4);
assert.equal(res.rules.length, 2); // 1 gộp chặn (t1,t2) + 1 gộp cho phép
assert.deepEqual(res.rules.find((r) => r.action.type === 'block').condition.requestDomains, ['t1.com', 't2.com']);

assert.deepEqual(resolveCosmetic(res.cosmetic, 'a.com').sort(), ['#hero-ad', '.not-on-c'].sort());
assert.deepEqual(resolveCosmetic(res.cosmetic, 'www.b.com').sort(), ['#hero-ad', '.generic', '.not-on-c'].sort());
assert.deepEqual(resolveCosmetic(res.cosmetic, 'c.com'), ['.generic']);
assert.deepEqual(resolveCosmetic(res.cosmetic, 'x.org', { generic: false }), []);
assert.deepEqual(hostChain('a.b.example.com'), ['a.b.example.com', 'b.example.com', 'example.com']);

// ID duy nhất, bắt đầu từ startId
const r2 = compile('||a.com/x\n||b.com/y\n', { startId: 10000 });
assert.deepEqual(r2.rules.map((r) => r.id), [10000, 10001]);

// ---- selector.js ----
for (const ok of ['.ad', '#a-b', 'div.ad > a[href^="http://x"]', 'a:not(.x):first-child', 'li:has(> div.c:not(.d))', '*[data-ad-slot]', 'ul li:nth-child(2n+1)', '.a\\:b'])
  assert.ok(isSimpleSelector(ok), `phải hợp lệ: ${ok}`);
for (const bad of ['', 'a:has(b:has(c))', 'div::before', '.a >', ':bogus(1)', 'a[href', 'a{color:red}', 'a:contains(x)'])
  assert.ok(!isSimpleSelector(bad), `phải bị từ chối: ${bad}`);
const ch = toSelectorChunks(['.a', '.b', 'p:has-text(x)', 'a{}'], 100);
assert.deepEqual(ch, ['.a,.b', ':is(p:has-text(x))']);

console.log('✔ Tất cả kiểm thử bộ lọc đều đạt');

// ---- tuỳ chọn mới: all / to / denyallow / method / removeparam / csp / badfilter ----
{
  const all = parseLine('||bad.example^$all');
  assert.equal(all.kind, 'network');
  assert.ok(all.condition.resourceTypes.includes('main_frame') && all.condition.resourceTypes.includes('script'));
  const to = parseLine('/ads.js$to=a.com|~b.a.com');
  assert.deepEqual(to.condition.requestDomains, ['a.com']);
  assert.deepEqual(to.condition.excludedRequestDomains, ['b.a.com']);
  assert.deepEqual(parseLine('||x.com^$denyallow=y.com|z.com').condition.excludedRequestDomains, ['y.com', 'z.com']);
  assert.deepEqual(parseLine('||x.com^$method=post').condition.requestMethods, ['post']);
  assert.equal(parseLine('||x.com^$removeparam=/^utm/').kind, 'error');
  const csp = parseLine("||x.com^$csp=script-src 'none'");
  assert.equal(csp.action.type, 'modifyHeaders');
  assert.equal(csp.action.responseHeaders[0].value, "script-src 'none'");
  assert.equal(parseLine("@@||x.com^$csp=script-src 'none'").kind, 'error');

  const r = compile('$removeparam=fbclid\n$removeparam=gclid\n||c.com/x$removeparam=ref,domain=d.com');
  assert.equal(r.rules.length, 2); // hai tham số không điều kiện gộp thành một quy tắc
  const merged = r.rules.find((x) => x.action.redirect.transform.queryTransform.removeParams.length === 2);
  assert.ok(merged);

  const bf = compile('||ads.com/banner\n||ads.com/banner$badfilter\n||ok.com/x');
  assert.equal(bf.rules.length, 1);
  assert.equal(bf.rules[0].condition.urlFilter, '||ok.com/x');
}
{
  const c = compile("a.com##+js(aopr, x)\n##+js(set, y, true)\nb.com#@#+js()\nb.com##+js(nowoif)");
  // scriptlet không gắn tên miền bị từ chối (chạy mọi trang sẽ làm hỏng trang)
  assert.deepEqual(resolveScriptlets(c.scriptlets, 'www.a.com'), [['aopr', 'x']]);
  assert.deepEqual(resolveScriptlets(c.scriptlets, 'b.com'), []);
  assert.equal(c.errors.length, 1);
  assert.equal(parseLine('a.com##+js(aopr, x):matches-path(/p/)').kind, 'error');
  assert.equal(parseLine('~a.com##+js(aopr, x)').kind, 'error');
}
{
  // quy tắc không được âm thầm nới rộng khi gặp cú pháp chưa hỗ trợ
  assert.equal(parseLine('@@*$image,xhr,script,domain=japscan.*').kind, 'error');
  assert.equal(parseLine('@@*$image,script').kind, 'error');
  assert.equal(parseLine('||ads.com^$domain=~news.*').kind, 'error');
  assert.equal(parseLine('@@*$image,script,domain=a.com|b.com').kind, 'network');
  assert.equal(parseLine('site.*##center > div.x').kind, 'error'); // không được thành luật toàn cục
  assert.equal(parseLine('site.com,other.*##.x').kind, 'cosmetic');
}
console.log('✔ Tuỳ chọn mở rộng & scriptlet đạt');
