'use strict';
/* Streaming GIF89a encoder: adaptive median-cut palette (from the first frame) and ordered dithering. */
window.RTGif = class RTGif {
  constructor(w, h) {
    this.w = w; this.h = h; this.chunks = []; this.lut = null;
    this.bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  }
  /* adaptive 256-colour palette (weighted median cut over a 5-5-5 histogram), built from the first frame */
  buildPalette(rgba) {
    const hist = new Uint32Array(32768), n = rgba.length / 4;
    for (let i = 0; i < n; i++) hist[((rgba[i * 4] >> 3) << 10) | ((rgba[i * 4 + 1] >> 3) << 5) | (rgba[i * 4 + 2] >> 3)]++;
    let items = [];
    for (let k = 0; k < 32768; k++) if (hist[k]) items.push({ r: (k >> 10) << 3 | 4, g: ((k >> 5) & 31) << 3 | 4, b: (k & 31) << 3 | 4, c: hist[k] });
    let boxes = [items];
    const range = (box) => {
      let rl = 255, rh = 0, gl = 255, gh = 0, bl = 255, bh = 0;
      for (const p of box) { if (p.r < rl) rl = p.r; if (p.r > rh) rh = p.r; if (p.g < gl) gl = p.g; if (p.g > gh) gh = p.g; if (p.b < bl) bl = p.b; if (p.b > bh) bh = p.b; }
      const dr = rh - rl, dg = gh - gl, db = bh - bl, m = Math.max(dr, dg, db);
      return { ch: m === dr ? 'r' : m === dg ? 'g' : 'b', span: m };
    };
    while (boxes.length < 256) {
      let best = -1, bs = 0;
      boxes.forEach((bx, i) => { if (bx.length < 2) return; const r = range(bx), sc = r.span * Math.sqrt(bx.reduce((a, p) => a + p.c, 0)); if (sc > bs) { bs = sc; best = i; } });
      if (best < 0) break;
      const bx = boxes[best], ch = range(bx).ch;
      bx.sort((p, q) => p[ch] - q[ch]);
      const total = bx.reduce((a, p) => a + p.c, 0); let acc = 0, cut = 1;
      for (let i = 0; i < bx.length; i++) { acc += bx[i].c; if (acc >= total / 2) { cut = Math.min(Math.max(i + 1, 1), bx.length - 1); break; } }
      boxes.splice(best, 1, bx.slice(0, cut), bx.slice(cut));
    }
    const pal = new Uint8Array(768);
    boxes.forEach((bx, i) => {
      let r = 0, g = 0, b = 0, c = 0;
      for (const p of bx) { r += p.r * p.c; g += p.g * p.c; b += p.b * p.c; c += p.c; }
      pal[i * 3] = Math.round(r / c); pal[i * 3 + 1] = Math.round(g / c); pal[i * 3 + 2] = Math.round(b / c);
    });
    const lut = new Uint8Array(32768), cnt = boxes.length;
    for (let k = 0; k < 32768; k++) {
      const r = (k >> 10) << 3 | 4, g = ((k >> 5) & 31) << 3 | 4, b = (k & 31) << 3 | 4;
      let bi = 0, bd = 1e9;
      for (let i = 0; i < cnt; i++) { const dr = pal[i * 3] - r, dg = pal[i * 3 + 1] - g, db = pal[i * 3 + 2] - b, d = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (d < bd) { bd = d; bi = i; } }
      lut[k] = bi;
    }
    this.lut = lut;
    const w = this.w, h = this.h;
    const hd = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, w & 255, w >> 8, h & 255, h >> 8, 0xF7, 0, 0];
    const loop = [0x21, 0xFF, 0x0B, ...'NETSCAPE2.0'.split('').map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0];
    this.chunks.push(new Uint8Array(hd), pal, new Uint8Array(loop));
  }
  addFrame(rgba, delayMs) {
    if (!this.lut) this.buildPalette(rgba);
    const { w, h, lut } = this, idx = new Uint8Array(w * h), B = this.bayer;
    let p = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        const o = p * 4, t = (B[((y & 3) << 2) | (x & 3)] - 7.5) * 0.9;
        let r = rgba[o] + t, g = rgba[o + 1] + t, b = rgba[o + 2] + t;
        r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
        idx[p] = lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
      }
    }
    const cs = Math.max(2, Math.round(delayMs / 10));
    this.chunks.push(new Uint8Array([0x21, 0xF9, 4, 4, cs & 255, cs >> 8, 0, 0, 0x2C, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0, 8]));
    this.chunks.push(RTGif.lzw(idx));
  }
  static lzw(px) {
    const MIN = 8, CLEAR = 256, EOI = 257;
    const out = []; let cur = 0, bits = 0, size = MIN + 1, next = EOI + 1;
    let table = new Map();
    const emit = (c) => {
      cur |= c << bits; bits += size;
      while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; }
    };
    emit(CLEAR);
    let ib = px[0];
    for (let i = 1; i < px.length; i++) {
      const k = px[i], key = (ib << 8) | k, c = table.get(key);
      if (c === undefined) {
        emit(ib);
        if (next === 4096) { emit(CLEAR); next = EOI + 1; size = MIN + 1; table = new Map(); }
        else { if (next >= (1 << size)) size++; table.set(key, next++); }
        ib = k;
      } else ib = c;
    }
    emit(ib); emit(EOI);
    if (bits > 0) out.push(cur & 255);
    const n = out.length, blocks = new Uint8Array(n + Math.ceil(n / 255) + 1);
    let o = 0;
    for (let i = 0; i < n; i += 255) {
      const len = Math.min(255, n - i);
      blocks[o++] = len;
      for (let j = 0; j < len; j++) blocks[o++] = out[i + j];
    }
    blocks[o] = 0;
    return blocks;
  }
  finish() { this.chunks.push(new Uint8Array([0x3B])); return new Blob(this.chunks, { type: 'image/gif' }); }
};
