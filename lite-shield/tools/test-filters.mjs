#!/usr/bin/env node
// Kiểm thử nhanh bộ phân tích bộ lọc:  node tools/test-filters.mjs
import assert from 'node:assert/strict';
import { compile, parseLine, resolveCosmetic, hostChain } from '../shared/filters.js';
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
assert.equal(parseLine('||x.com^$redirect=noop.js').kind, 'error');
assert.equal(parseLine('example.com##+js(abort-on-property-read, foo)').kind, 'error');
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
