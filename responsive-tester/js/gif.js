'use strict';
/* Streaming GIF89a encoder with a fixed 3-3-2 palette and ordered dithering. */
window.RTGif = class RTGif {
  constructor(w, h) {
    this.w = w; this.h = h; this.chunks = [];
    const hd = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, w & 255, w >> 8, h & 255, h >> 8, 0xF7, 0, 0];
    const pal = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      pal[i * 3] = Math.round(((i >> 5) & 7) * 255 / 7);
      pal[i * 3 + 1] = Math.round(((i >> 2) & 7) * 255 / 7);
      pal[i * 3 + 2] = Math.round((i & 3) * 255 / 3);
    }
    const loop = [0x21, 0xFF, 0x0B, ...'NETSCAPE2.0'.split('').map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0];
    this.chunks.push(new Uint8Array(hd), pal, new Uint8Array(loop));
    this.bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  }
  addFrame(rgba, delayMs) {
    const { w, h } = this, idx = new Uint8Array(w * h), B = this.bayer;
    let p = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        const o = p * 4, t = B[((y & 3) << 2) | (x & 3)] - 7.5;
        let r = rgba[o] + t * 2.4, g = rgba[o + 1] + t * 2.4, b = rgba[o + 2] + t * 5.6;
        r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
        idx[p] = ((Math.round(r * 7 / 255)) << 5) | ((Math.round(g * 7 / 255)) << 2) | Math.round(b * 3 / 255);
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
