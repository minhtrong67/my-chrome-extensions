// Bộ chạy scriptlet (MAIN world, document_start). Mỗi "shard" gọi __lsRun(dữ liệu) với danh sách theo tên miền.
// Các scriptlet viết lại gọn theo ngữ nghĩa của uBlock Origin: aopr, aopw, set, acs, nostif, nosiif, aeld, nowoif, ra, nowebrtc, json-prune, noeval.
(() => {
  if (self.__lsRun) return;
  const MSG = 'ReferenceError: ' + Math.random().toString(36).slice(2, 10);
  const ESC = /[.*+?^${}()|[\]\\]/g;
  const noop = () => {};
  const thisScript = document.currentScript;

  // 'chuỗi' → khớp chuỗi con; '/regex/flags' → regex; '!…' → phủ định.
  function matcher(raw) {
    if (raw === undefined || raw === '') return () => true;
    let neg = false;
    let s = String(raw);
    if (s[0] === '!') { neg = true; s = s.slice(1); }
    let re;
    const i = s.lastIndexOf('/');
    if (s.length > 2 && s[0] === '/' && i > 0) {
      try { re = new RegExp(s.slice(1, i), s.slice(i + 1)); } catch { re = null; }
    }
    if (!re) re = new RegExp(s.replace(ESC, '\\$&'));
    return (x) => re.test(String(x)) !== neg;
  }

  const CONST = {
    undefined: undefined, false: false, true: true, null: null, '': '', yes: 'yes', no: 'no', emptyArr: [], emptyObj: {},
    noopFunc: noop, trueFunc: () => true, falseFunc: () => false, throwFunc: () => { throw new ReferenceError(MSG); },
  };
  const constant = (raw) => {
    if (raw in CONST) return { ok: true, v: CONST[raw] };
    if (/^-?\d+(\.\d+)?$/.test(raw) && Math.abs(+raw) <= 32767) return { ok: true, v: +raw };
    return { ok: false };
  };

  // Đặt "bẫy" tại thuộc tính theo đường dẫn a.b.c, kể cả khi đối tượng trung gian chưa tồn tại.
  function onProp(path, leaf, root = self) {
    const parts = path.split('.');
    const step = (obj, i) => {
      const k = parts[i];
      if (i === parts.length - 1) return leaf(obj, k);
      const cur = obj[k];
      if (cur && (typeof cur === 'object' || typeof cur === 'function')) return step(cur, i + 1);
      const d = Object.getOwnPropertyDescriptor(obj, k);
      if (d && !d.configurable) return;
      let val = cur;
      try {
        Object.defineProperty(obj, k, {
          configurable: true, enumerable: d ? d.enumerable : true,
          get: () => val,
          set(nv) { val = nv; if (nv && (typeof nv === 'object' || typeof nv === 'function')) step(nv, i + 1); },
        });
      } catch { /* bỏ qua */ }
    };
    try { step(root, 0); } catch { /* bỏ qua */ }
  }

  const S = {
    aopr(prop) {
      if (!prop) return;
      onProp(prop, (o, k) => {
        let v = o[k];
        const d = Object.getOwnPropertyDescriptor(o, k);
        if (d && !d.configurable) return;
        try { Object.defineProperty(o, k, { configurable: true, get() { throw new ReferenceError(MSG); }, set(nv) { v = nv; } }); } catch { /* */ }
      });
    },
    aopw(prop) {
      if (!prop) return;
      onProp(prop, (o, k) => {
        let v = o[k];
        const d = Object.getOwnPropertyDescriptor(o, k);
        if (d && !d.configurable) return;
        try { Object.defineProperty(o, k, { configurable: true, get: () => v, set() { throw new ReferenceError(MSG); } }); } catch { /* */ }
      });
    },
    set(prop, raw) {
      const c = constant(String(raw ?? ''));
      if (!prop || !c.ok) return;
      onProp(prop, (o, k) => {
        const d = Object.getOwnPropertyDescriptor(o, k);
        if (d && !d.configurable) return;
        try { Object.defineProperty(o, k, { configurable: true, enumerable: true, get: () => c.v, set: noop }); } catch { /* */ }
      });
    },
    acs(prop, needle) {
      if (!prop) return;
      const ok = needle ? matcher(needle) : null;
      const check = () => {
        const s = document.currentScript;
        if (!s || s === thisScript) return;
        if (ok && !ok(`${s.src || ''}\n${s.textContent}`)) return;
        throw new ReferenceError(MSG);
      };
      onProp(prop, (o, k) => {
        let v = o[k];
        const d = Object.getOwnPropertyDescriptor(o, k);
        if (d && !d.configurable) return;
        try { Object.defineProperty(o, k, { configurable: true, get() { check(); return v; }, set(nv) { check(); v = nv; } }); } catch { /* */ }
      });
    },
    timer(name, needle, delay) {
      const orig = self[name];
      const mText = matcher(needle);
      const dd = delay === undefined || delay === '' ? null : matcher(delay);
      self[name] = new Proxy(orig, {
        apply(t, th, a) {
          if (mText(typeof a[0] === 'function' ? a[0].toString() : String(a[0])) && (!dd || dd(a[1] === undefined ? 0 : a[1]))) return 0;
          return Reflect.apply(t, th, a);
        },
      });
    },
    nostif: (n, d) => S.timer('setTimeout', n, d),
    nosiif: (n, d) => S.timer('setInterval', n, d),
    aeld(type, pattern) {
      const mType = matcher(type);
      const mFn = matcher(pattern);
      const proto = EventTarget.prototype;
      proto.addEventListener = new Proxy(proto.addEventListener, {
        apply(t, th, a) {
          let src = '';
          try { src = typeof a[1] === 'function' ? a[1].toString() : String(a[1]?.handleEvent ?? a[1]); } catch { /* */ }
          if (mType(a[0]) && mFn(src)) return;
          return Reflect.apply(t, th, a);
        },
      });
    },
    nowoif(pattern) {
      const m = matcher(pattern);
      self.open = new Proxy(self.open, {
        apply(t, th, a) { return m(a[0]) ? null : Reflect.apply(t, th, a); },
      });
    },
    ra(attr, selector) {
      const names = String(attr || '').split('|').filter(Boolean);
      if (!names.length) return;
      const sel = selector || names.map((n) => `[${CSS.escape(n)}]`).join(',');
      let queued = false;
      const run = () => {
        queued = false;
        try { for (const el of document.querySelectorAll(sel)) for (const n of names) el.removeAttribute(n); } catch { /* */ }
      };
      const queue = () => { if (!queued) { queued = true; setTimeout(run, 30); } };
      new MutationObserver(queue).observe(document, { childList: true, subtree: true, attributes: true });
      document.addEventListener('DOMContentLoaded', run, { once: true });
    },
    nowebrtc() {
      const name = self.RTCPeerConnection ? 'RTCPeerConnection' : self.webkitRTCPeerConnection ? 'webkitRTCPeerConnection' : '';
      if (!name) return;
      const Fake = function () {};
      Fake.prototype = {
        close: noop, createDataChannel: () => ({ close: noop }), createOffer: () => Promise.resolve({}), setLocalDescription: () => Promise.resolve(),
        addEventListener: noop, removeEventListener: noop,
      };
      Fake.prototype.constructor = Fake;
      self[name] = Fake;
    },
    'json-prune'(rawPrune, rawNeedles) {
      const prune = String(rawPrune || '').split(/ +/).filter(Boolean);
      const needles = String(rawNeedles || '').split(/ +/).filter(Boolean);
      if (!prune.length) return;
      const get = (obj, path) => {
        let cur = obj;
        for (const k of path.split('.')) {
          if (cur == null || typeof cur !== 'object' || !(k in cur)) return undefined;
          cur = cur[k];
        }
        return cur;
      };
      const del = (obj, parts) => {
        if (obj == null || typeof obj !== 'object') return;
        const [k, ...rest] = parts;
        if (k === '[]' || k === '*') {
          for (const x of Array.isArray(obj) ? obj : Object.values(obj)) del(x, rest);
        } else if (!rest.length) delete obj[k];
        else del(obj[k], rest);
      };
      const run = (obj) => {
        if (obj == null || typeof obj !== 'object') return obj;
        if (needles.length && !needles.every((n) => get(obj, n) !== undefined)) return obj;
        for (const p of prune) del(obj, p.split('.'));
        return obj;
      };
      JSON.parse = new Proxy(JSON.parse, { apply: (t, th, a) => run(Reflect.apply(t, th, a)) });
      if (self.Response?.prototype?.json) {
        Response.prototype.json = new Proxy(Response.prototype.json, { apply: (t, th, a) => Reflect.apply(t, th, a).then(run) });
      }
    },
    noeval() { self.eval = noop; },
  };
  const ALIAS = {
    'abort-on-property-read': 'aopr', 'abort-on-property-write': 'aopw', 'set-constant': 'set', 'abort-current-script': 'acs',
    'abort-current-inline-script': 'acs', acis: 'acs', 'no-setTimeout-if': 'nostif', 'setTimeout-defuser': 'nostif',
    'no-setInterval-if': 'nosiif', 'setInterval-defuser': 'nosiif', 'addEventListener-defuser': 'aeld', 'prevent-addEventListener': 'aeld',
    'no-window-open-if': 'nowoif', 'window.open-defuser': 'nowoif', 'remove-attr': 'ra', 'no-eval': 'noeval', 'noeval-silent': 'noeval',
    'nowebrtc': 'nowebrtc',
  };
  const SUPPORTED = new Set(Object.keys(S));

  function chain(host) {
    const p = host.split('.');
    const out = [];
    for (let i = 0; i < p.length - 1; i++) out.push(p.slice(i).join('.'));
    return out.length ? out : [host];
  }

  /** hosts: { tênmiền: [[tên, ...đối số], ...] } — ex: { tênmiền: [[...]] } (mảng rỗng = tắt tất cả) */
  self.__lsRun = (hosts, ex = {}, generic = []) => {
    const c = chain(location.hostname || '');
    const blocked = [];
    for (const h of ['*', ...c]) for (const e of ex[h] ?? []) blocked.push(e);
    if (blocked.some((e) => !e.length)) return;
    const skip = new Set(blocked.map((e) => JSON.stringify(e)));
    const list = [...generic.filter((g) => !g.ex || !c.some((h) => g.ex.includes(h))).map((g) => g.e), ...c.flatMap((h) => hosts[h] ?? [])];
    for (const e of list) {
      if (skip.has(JSON.stringify(e))) continue;
      const name = ALIAS[e[0]] ?? e[0];
      if (!SUPPORTED.has(name)) continue;
      try { S[name](...e.slice(1)); } catch { /* một scriptlet lỗi không được kéo theo cái khác */ }
    }
  };
  Object.defineProperty(self, '__lsRun', { enumerable: false, configurable: false, writable: false, value: self.__lsRun });
})();
