/* Danbooru page scanner (content script). Talks to the popup through a port. */
(() => {
  if (window.__ddLoaded) return;
  window.__ddLoaded = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const abs = (u, base = location.href) => { try { return new URL(u, base).href; } catch { return ''; } };
  const extOf = (u) => { try { return new URL(u).pathname.split('.').pop().toLowerCase(); } catch { return ''; } };
  const md5Of = (u) => { try { return new URL(u).pathname.split('/').pop().split('.')[0]; } catch { return ''; } };

  const cardsOf = (doc) =>
    [...doc.querySelectorAll('article.post-preview')].filter((el) => !el.closest('#sidebar, aside, #related-posts, .post-sidebar'));

  const fromCard = (el, base) => {
    const d = el.dataset;
    const id = d.id || (el.id || '').replace('post_', '');
    if (!id) return null;
    const img = el.querySelector('img');
    const file = d.fileUrl ? abs(d.fileUrl, base) : '';
    return {
      id: String(id),
      thumb: img ? abs(img.getAttribute('src') || img.src, base) : d.previewFileUrl ? abs(d.previewFileUrl, base) : '',
      file,
      large: d.largeFileUrl ? abs(d.largeFileUrl, base) : '',
      w: +d.width || 0,
      h: +d.height || 0,
      ext: (d.fileExt || extOf(file)).toLowerCase(),
      rating: d.rating || '',
      score: +d.score || 0,
      tags: d.tags || '',
      md5: d.md5 || md5Of(file),
      pending: !file
    };
  };

  const fromJson = (j) => {
    if (!j || !j.id || !j.file_url) return null;
    return {
      id: String(j.id),
      thumb: j.preview_file_url || j.large_file_url || j.file_url,
      file: j.file_url,
      large: j.large_file_url || j.file_url,
      w: j.image_width || 0,
      h: j.image_height || 0,
      ext: (j.file_ext || extOf(j.file_url)).toLowerCase(),
      rating: j.rating || '',
      score: j.score || 0,
      tags: j.tag_string || '',
      md5: j.md5 || md5Of(j.file_url)
    };
  };

  async function getJson(url) {
    for (let i = 0; i < 2; i++) {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 429) { await sleep(3000); continue; }
      if (!res.ok) return null;
      try { return await res.json(); } catch { return null; }
    }
    return null;
  }

  const nextUrl = (doc, base) => {
    const a = doc.querySelector('a.paginator-next, a[rel="next"]');
    const href = a && a.getAttribute('href');
    return href ? abs(href, base) : '';
  };

  const postId = () => { const m = location.pathname.match(/^\/posts\/(\d+)/); return m ? m[1] : ''; };

  async function scan(opts, emit, sig) {
    const seen = new Set();
    let unavailable = 0;

    // single post page: just that post
    const pid = postId();
    if (pid) {
      const it = fromJson(await getJson(`${location.origin}/posts/${pid}.json`));
      if (it) emit({ type: 'items', page: 1, items: [it], unavailable: 0 });
      else emit({ type: 'items', page: 1, items: [], unavailable: 1 });
      emit({ type: 'done' });
      return;
    }

    let doc = document, url = location.href;
    const maxPages = Math.max(1, opts.pages | 0);
    for (let p = 1; p <= maxPages && !sig.cancelled; p++) {
      const items = [];
      for (const el of cardsOf(doc)) {
        const it = fromCard(el, url);
        if (!it || seen.has(it.id)) continue;
        seen.add(it.id);
        if (it.pending) {
          // preview has no file URL (lazy markup or restricted post): ask the API
          const full = fromJson(await getJson(`${location.origin}/posts/${it.id}.json`));
          await sleep(250);
          if (!full) { unavailable++; continue; }
          items.push(full);
        } else {
          delete it.pending;
          items.push(it);
        }
        if (sig.cancelled) break;
      }
      emit({ type: 'items', page: p, items, unavailable });
      unavailable = 0;
      if (p >= maxPages || sig.cancelled) break;

      const next = nextUrl(doc, url);
      if (!next) break;
      await sleep(Math.max(200, opts.delay | 0));
      try {
        let res = await fetch(next, { credentials: 'include' });
        if (res.status === 429) { await sleep(3500); res = await fetch(next, { credentials: 'include' }); }
        if (!res.ok) { emit({ type: 'error', message: 'HTTP ' + res.status }); break; }
        doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        url = next;
      } catch (e) {
        emit({ type: 'error', message: String(e) });
        break;
      }
    }
    emit({ type: 'done', cancelled: !!sig.cancelled });
  }

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'dd-scan') return;
    const sig = { cancelled: false };
    const emit = (m) => { try { port.postMessage(m); } catch {} };
    port.onMessage.addListener((msg) => {
      if (msg.type === 'start') scan(msg.opts || {}, emit, sig).catch((e) => emit({ type: 'error', message: String(e) }));
      if (msg.type === 'cancel') sig.cancelled = true;
    });
    port.onDisconnect.addListener(() => { sig.cancelled = true; });
  });

  chrome.runtime.onMessage.addListener((msg, _s, send) => {
    if (msg && msg.type === 'dd-ping') {
      send({ ok: true, count: postId() ? 1 : cardsOf(document).length, url: location.href, origin: location.origin });
    }
  });
})();
