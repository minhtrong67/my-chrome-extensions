/* File / folder naming from templates */
(function (g) {
  const DD = (g.DD = g.DD || {});

  DD.TOKENS = ['id', 'md5', 'ext', 'width', 'height', 'rating', 'score', 'index', 'query', 'site', 'date', 'artist', 'character', 'copyright'];

  DD.sanitize = (s, max = 120) =>
    String(s == null ? '' : s)
      .replace(/[\u0000-\u001f<>:"\/\\|?*]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/, '')
      .slice(0, max);

  DD.needsMeta = (...templates) => templates.some((t) => /\{(artist|character|copyright)\}/.test(t || ''));

  const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));

  DD.buildPath = (settings, item, ctx, meta) => {
    const now = new Date();
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    const vars = {
      id: item.id, md5: item.md5 || '', ext: item.ext || 'jpg',
      width: item.w || '', height: item.h || '', rating: item.rating || '', score: item.score ?? '',
      index: pad(item.index || 0, 3), query: ctx.query || 'posts', site: ctx.site || 'danbooru',
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      artist: (meta && meta.artist) || 'unknown', character: (meta && meta.character) || 'unknown',
      copyright: (meta && meta.copyright) || 'unknown'
    };
    // sanitize every substituted value so a tag can never inject a path separator
    const safe = {};
    Object.keys(vars).forEach((k) => (safe[k] = DD.sanitize(vars[k], 60)));

    let name = DD.sanitize(fill(settings.filenameTemplate, safe), 150);
    if (!name) name = String(item.id);
    const ext = '.' + vars.ext;
    if (!name.toLowerCase().endsWith(ext.toLowerCase())) name += ext;

    const folder = fill(settings.saveFolder, safe)
      .split(/[\/\\]+/)
      .map((p) => DD.sanitize(p, 80))
      .filter((p) => p && p !== '.' && p !== '..');
    return [...folder, name].join('/');
  };
})(globalThis);
