import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { start } from './server.mjs';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..') + path.sep;
// Point CHROME_PATH at any Chrome / Chromium binary (for example /usr/bin/google-chrome).
const CHROME = process.env.CHROME_PATH;
export async function boot({ width = 1500, height = 900, url = '/host', storage = {} } = {}) {
  const server = await start();
  if (!CHROME) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary');
  const browser = await puppeteer.launch({ args: ['--no-sandbox'], executablePath: CHROME, headless: true, defaultViewport: { width, height } });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push('[console.' + m.type() + '] ' + m.text()));
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
  const agent = fs.readFileSync(R + 'agent.js', 'utf8');
  const mock = `
    (() => { if (window !== window.top) return;
      const store = ${JSON.stringify(storage)};
      const calls = []; window.__calls = calls;
      const oa = Element.prototype.attachShadow; Element.prototype.attachShadow = function (o) { return oa.call(this, { mode: 'open' }); };
      window.chrome = { runtime: { getURL: (p) => '/__ext/' + p, sendMessage: async (m) => { calls.push(m); if (m.type === 'capture') { try { return { ok: true, url: await window.__capture() }; } catch (e) { return { ok: false, error: String(e) }; } } return { ok: true }; }, onMessage: { addListener() {} } },
        i18n: { getUILanguage: () => 'en', getMessage: (k) => k }, storage: { local: { get: async (k) => { const o = {}; (Array.isArray(k) ? k : [k]).forEach((x) => { if (x in store) o[x] = store[x]; }); return o; }, set: async (o) => { Object.assign(store, o); } } } };
      window.__store = store; window.__dl = [];
      HTMLAnchorElement.prototype.click = function () { if (this.download) { const n = this.download; fetch(this.href).then((r) => r.blob()).then((b) => new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); })).then((d) => window.__dl.push({ name: n, data: d })); } };
    })();`;
  await page.exposeFunction('__capture', async () => 'data:image/png;base64,' + (await page.screenshot({ encoding: 'base64' })));
  await page.evaluateOnNewDocument(mock);
  await page.evaluateOnNewDocument(agent);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.pathname.startsWith('/__ext/')) {
      const f = R + u.pathname.slice(7);
      if (fs.existsSync(f)) return req.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: f.endsWith('.css') ? 'text/css' : 'application/octet-stream', body: fs.readFileSync(f) });
      return req.respond({ status: 404, body: '' });
    }
    req.continue();
  });
  await page.goto('http://localhost:8765' + url, { waitUntil: 'load' });
  const inject = async () => { for (const f of ['js/icons.js', 'lib/theme.js', 'js/i18n.js', 'js/devices.js', 'js/template.js', 'js/gif.js', 'js/qr.js', 'js/app.js']) { if (fs.existsSync(R + f)) await page.addScriptTag({ content: fs.readFileSync(R + f, 'utf8') }); } };
  return { page, browser, server, logs, inject, close: async () => { await browser.close(); server.close(); } };
}
export const $ = (page, fn, ...a) => page.evaluate(fn, ...a);
