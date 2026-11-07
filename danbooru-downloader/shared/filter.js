/* Classification of scanned items: returns '' (keep) or a reason: logo | rating | score | type */
(function (g) {
  const DD = (g.DD = g.DD || {});

  const wildcard = (p) => new RegExp('^' + p.trim().toLowerCase().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  let cacheKey = '', cacheRe = [];
  const patterns = (str) => {
    if (str !== cacheKey) {
      cacheKey = str;
      cacheRe = String(str || '').split(/[,\n]+/).map((x) => x.trim()).filter(Boolean).map(wildcard);
    }
    return cacheRe;
  };

  DD.typeKey = (ext) => {
    ext = String(ext || '').toLowerCase();
    if (ext === 'jpeg') return 'jpg';
    if (ext === 'mp4' || ext === 'webm') return 'video';
    return ext;
  };

  DD.classify = (it, s) => {
    if (s.logoFilter) {
      if (s.logoByTags && it.tags) {
        const res = patterns(s.logoTags);
        if (res.length && it.tags.split(' ').some((t) => res.some((r) => r.test(t)))) return 'logo';
      }
      if (it.w && it.h) {
        if (s.logoBySize && Math.max(it.w, it.h) <= s.logoMaxSide) return 'logo';
        if (s.logoByRatio && Math.max(it.w, it.h) / Math.min(it.w, it.h) >= s.logoRatio) return 'logo';
      }
    }
    if (it.rating && !s.ratings.includes(it.rating)) return 'rating';
    if (it.score < s.minScore) return 'score';
    const k = DD.typeKey(it.ext);
    const known = ['jpg', 'png', 'gif', 'webp', 'avif', 'video', 'zip'];
    if (known.includes(k) && !s.fileTypes.includes(k)) return 'type';
    return '';
  };
})(globalThis);
