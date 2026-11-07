(async () => {
  const $ = (id) => document.getElementById(id);
  const manifest = chrome.runtime.getManifest();
  let S = await DD.getSettings();
  let t = DD.makeT(S.lang);
  let debounce;

  const save = (patch) => {
    Object.assign(S, patch);
    DD.setSettings(patch);
    clearTimeout(debounce);
    debounce = setTimeout(() => toast(t('opt.saved')), 250);
  };
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  /* ---- small builders ---- */
  const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const row = ({ title, desc, control, body, sub, id }) => {
    const r = h(`<div class="row${sub ? ' sub' : ''}"${id ? ` id="${id}"` : ''}></div>`);
    const head = h(`<div class="row-head"><div class="row-text"><div class="row-title"></div><div class="row-desc"></div></div></div>`);
    head.querySelector('.row-title').textContent = title;
    if (desc) head.querySelector('.row-desc').textContent = desc; else head.querySelector('.row-desc').remove();
    if (control) head.appendChild(control);
    if (title || desc || control) r.appendChild(head);
    if (body) { const b = h('<div class="row-body"></div>'); [].concat(body).forEach((x) => b.appendChild(x)); r.appendChild(b); }
    return r;
  };

  const toggle = (key, onChange) => {
    const l = h(`<label class="switch"><input type="checkbox"><span class="track"><span class="handle">${DD.svg('check')}</span></span></label>`);
    const i = l.querySelector('input');
    i.checked = !!S[key];
    i.onchange = () => { save({ [key]: i.checked }); onChange && onChange(i.checked); };
    return l;
  };

  const segmented = (key, options, onChange) => {
    const w = h('<div class="seg" role="radiogroup"></div>');
    options.forEach((o) => {
      const b = h(`<button type="button" role="radio">${o.icon ? DD.svg(o.icon) : ''}<span class="${o.cls || ''}"></span></button>`);
      b.querySelector('span').textContent = o.label;
      b.setAttribute('aria-checked', String(S[key] === o.value));
      b.onclick = () => {
        w.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', 'false'));
        b.setAttribute('aria-checked', 'true');
        save({ [key]: o.value });
        onChange && onChange(o.value);
      };
      w.appendChild(b);
    });
    return w;
  };

  const slider = (key, { min, max, step = 1, fmt = (v) => v, onInput }) => {
    const w = h('<div class="slider-wrap"><input class="slider" type="range"><output></output></div>');
    const i = w.querySelector('input'), o = w.querySelector('output');
    Object.assign(i, { min, max, step, value: S[key] });
    const paint = () => { i.style.setProperty('--v', ((i.value - min) / (max - min)) * 100 + '%'); o.textContent = fmt(+i.value); };
    i.oninput = () => { paint(); onInput && onInput(+i.value); };
    i.onchange = () => save({ [key]: +i.value });
    paint();
    return w;
  };

  const field = (key, { label, hint, multiline, onInput }) => {
    const f = h(`<div class="field"><label></label>${multiline ? '<textarea spellcheck="false"></textarea>' : '<input type="text" spellcheck="false">'}<div class="hint"></div></div>`);
    f.querySelector('label').textContent = label || '';
    if (!label) f.querySelector('label').remove();
    f.querySelector('.hint').textContent = hint || '';
    if (!hint) f.querySelector('.hint').remove();
    const i = f.querySelector('input,textarea');
    if (!label) i.setAttribute('aria-label', hint || key);
    i.value = S[key];
    i.oninput = () => { Object.assign(S, { [key]: i.value }); onInput && onInput(); };
    i.onchange = () => save({ [key]: i.value });
    f.input = i;
    return f;
  };

  const chipSet = (key, options) => {
    const w = h('<div class="chips"></div>');
    options.forEach((o) => {
      const b = h(`<button type="button" class="chip" aria-pressed="${S[key].includes(o.value)}">${DD.svg('check')}<span></span></button>`);
      b.querySelector('span').textContent = o.label;
      b.onclick = () => {
        const set = new Set(S[key]);
        set.has(o.value) ? set.delete(o.value) : set.add(o.value);
        b.setAttribute('aria-pressed', String(set.has(o.value)));
        save({ [key]: [...set] });
      };
      w.appendChild(b);
    });
    return w;
  };

  /* ---- custom dropdown (listbox, keyboard accessible) ---- */
  function dropdown({ options, value, onChange, ariaLabel }) {
    const root = h(`<div class="dd"><button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="dd-value"></span>${DD.svg('expand')}</button></div>`);
    const btn = root.querySelector('.dd-btn'), val = root.querySelector('.dd-value');
    btn.setAttribute('aria-label', ariaLabel || '');
    let menu = null, cur = value, active = 0;

    const find = (v) => options.find((o) => o.value === v) || options[0];
    const paintBtn = () => { const o = find(cur); val.textContent = o.label; val.style.fontFamily = o.stack || ''; };
    const close = (focus) => {
      if (!menu) return;
      menu.remove(); menu = null;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      if (focus) btn.focus();
    };
    const outside = (e) => { if (!root.contains(e.target)) close(false); };
    const setActive = (i) => {
      active = (i + options.length) % options.length;
      [...menu.children].forEach((li, k) => li.dataset.active = String(k === active));
      menu.setAttribute('aria-activedescendant', menu.children[active].id);
      menu.children[active].scrollIntoView({ block: 'nearest' });
    };
    const choose = (i) => { cur = options[i].value; paintBtn(); close(true); onChange(cur); };
    const open = () => {
      if (menu) return;
      menu = h('<ul class="dd-menu" role="listbox" tabindex="-1"></ul>');
      options.forEach((o, i) => {
        const li = h(`<li class="dd-opt" role="option" id="ddo-${o.value}"><div><span class="nm"></span><span class="sm"></span></div>${DD.svg('check')}</li>`);
        const nm = li.querySelector('.nm'); nm.textContent = o.label; nm.style.fontFamily = o.stack || '';
        const sm = li.querySelector('.sm'); sm.textContent = o.sample || ''; sm.style.fontFamily = o.stack || '';
        li.setAttribute('aria-selected', String(o.value === cur));
        li.onpointerenter = () => setActive(i);
        li.onclick = () => choose(i);
        menu.appendChild(li);
      });
      root.appendChild(menu);
      // flip upward if there is not enough room below
      const r = btn.getBoundingClientRect();
      if (innerHeight - r.bottom < Math.min(menu.scrollHeight, 340) + 16 && r.top > innerHeight - r.bottom) menu.classList.add('up');
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', outside, true);
      menu.focus({ preventScroll: true });
      setActive(Math.max(0, options.findIndex((o) => o.value === cur)));
      menu.onkeydown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
        else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
        else if (e.key === 'Escape') { e.preventDefault(); close(true); }
        else if (e.key === 'Tab') close(false);
        else if (e.key.length === 1) {
          const k = options.findIndex((o, n) => n > active && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
          const k2 = k < 0 ? options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase())) : k;
          if (k2 >= 0) setActive(k2);
        }
      };
    };
    btn.onclick = () => (menu ? close(true) : open());
    btn.onkeydown = (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } };
    paintBtn();
    return root;
  }

  /* ---- color grid ---- */
  function colorGrid() {
    const dark = DD.isDark(S);
    const grid = h('<div class="swatches" role="radiogroup"></div>');
    const mk = (name, seed) => {
      const sc = DD.scheme(seed, dark);
      const b = h(`<div class="swatch" role="radio" tabindex="0"><span class="disc"><span class="badge">${DD.svg('check')}</span></span><span class="nm"></span></div>`);
      b.style.setProperty('--sw-p', sc.primary); b.style.setProperty('--sw-c', sc.primaryContainer); b.style.setProperty('--sw-t', sc.tertiary);
      b.querySelector('.nm').textContent = DD.colorLabel(S.lang, name);
      b.dataset.name = name;
      return b;
    };
    DD.COLORS.forEach((n) => grid.appendChild(mk(n, DD.SEEDS[n])));

    // 20th tile (custom) keeps the grid a clean 5 x 4
    const cu = mk('Custom', S.customColor);
    cu.querySelector('.disc').classList.add('rainbow');
    cu.querySelector('.disc').insertAdjacentHTML('afterbegin', DD.svg('edit'));
    cu.querySelector('.nm').textContent = t('opt.customColor');
    const input = h('<input type="color" aria-label="Custom color">');
    input.value = S.customColor;
    cu.appendChild(input);
    grid.appendChild(cu);

    const sync = () => grid.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.name === S.themeColor)));
    const pick = (name) => { save({ themeColor: name }); DD.applyTheme(S); sync(); };
    grid.addEventListener('click', (e) => {
      const s = e.target.closest('.swatch');
      if (s && s !== cu) pick(s.dataset.name);
    });
    grid.addEventListener('keydown', (e) => {
      const s = e.target.closest('.swatch');
      if (s && (e.key === 'Enter' || e.key === ' ') && s !== cu) { e.preventDefault(); pick(s.dataset.name); }
    });
    input.addEventListener('input', () => { S.customColor = input.value; pick('Custom'); const sc = DD.scheme(input.value, dark); cu.style.setProperty('--sw-p', sc.primary); });
    input.addEventListener('change', () => save({ customColor: input.value, themeColor: 'Custom' }));
    sync();
    return grid;
  }

  /* ---- build page ---- */
  function build() {
    const main = $('main');
    main.textContent = '';
    const section = (icon, title, rows) => {
      main.appendChild(h(`<h2 class="sec-title">${DD.svg(icon)}<span></span></h2>`)).querySelector('span').textContent = title;
      const g = h('<div class="group"></div>');
      rows.forEach((r) => g.appendChild(r));
      main.appendChild(g);
      return g;
    };

    /* Appearance */
    const refreshAll = () => { DD.applyTheme(S); };
    section('palette', t('opt.sec.appearance'), [
      row({ title: t('opt.theme'), desc: t('opt.theme.desc'), body: segmented('themeMode', [
        { value: 'light', label: t('opt.theme.light'), icon: 'light' },
        { value: 'dark', label: t('opt.theme.dark'), icon: 'dark' },
        { value: 'system', label: t('opt.theme.system'), icon: 'system' }
      ], () => { refreshAll(); build(); }) }),
      row({ title: t('opt.color'), desc: t('opt.color.desc'), body: colorGrid() }),
      row({ title: t('opt.fontSize'), desc: t('opt.fontSize.desc'), body: segmented('fontSize', [
        { value: 'small', label: t('opt.size.small'), cls: 'size-s' },
        { value: 'medium', label: t('opt.size.medium'), cls: 'size-m' },
        { value: 'large', label: t('opt.size.large'), cls: 'size-l' }
      ], refreshAll) }),
      row({ title: t('opt.font'), desc: t('opt.font.desc'), body: dropdown({
        ariaLabel: t('opt.font'),
        value: S.fontFamily,
        options: DD.FONTS.map((f) => ({ value: f.id, label: f.id === 'system' ? t('opt.font.system') : f.name, stack: f.stack, sample: 'Xin chào · Hello · 0123 ăâêôơư' })),
        onChange: (v) => { save({ fontFamily: v }); refreshAll(); }
      }) }),
      row({ title: t('opt.lang'), desc: t('opt.lang.desc'), body: segmented('lang', [
        { value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }
      ], (v) => { t = DD.makeT(v); document.documentElement.lang = v; DD.applyI18n(t); $('subtitle').textContent = t('opt.subtitle', { v: manifest.version }); build(); }) })
    ]);

    /* Download */
    const folder = field('saveFolder', { onInput: () => updatePreview() });
    const fname = field('filenameTemplate', { onInput: () => updatePreview() });
    const tokenChips = (f) => {
      const w = h('<div class="chips"></div>');
      ['id', 'md5', 'artist', 'character', 'copyright', 'query', 'rating', 'score', 'width', 'height', 'date', 'index'].forEach((k) => {
        const b = h(`<button type="button" class="chip"><span class="tok"></span></button>`);
        b.querySelector('.tok').textContent = '{' + k + '}';
        b.onclick = () => {
          const i = f.input, a = i.selectionStart ?? i.value.length, z = i.selectionEnd ?? a;
          i.value = i.value.slice(0, a) + '{' + k + '}' + i.value.slice(z);
          i.focus(); i.setSelectionRange(a + k.length + 2, a + k.length + 2);
          S[i === folder.input ? 'saveFolder' : 'filenameTemplate'] = i.value;
          save({ [i === folder.input ? 'saveFolder' : 'filenameTemplate']: i.value });
          updatePreview();
        };
        w.appendChild(b);
      });
      return w;
    };
    const preview = h('<div class="preview"></div>');
    function updatePreview() {
      const p = DD.buildPath(S, { id: 9876543, md5: 'a1b2c3d4', ext: 'jpg', w: 1920, h: 1080, rating: 'g', score: 42, index: 1 }, { query: 'hatsune_miku+solo', site: 'danbooru' }, { artist: 'artist_name', character: 'hatsune_miku', copyright: 'vocaloid' });
      preview.innerHTML = `${esc(t('opt.preview'))}: <b>Downloads/${esc(p)}</b>`;
    }
    const rootLink = h(`<div class="link-row"><button type="button" class="btn text sm">${DD.svg('open')}<span></span></button></div>`);
    rootLink.querySelector('span').textContent = t('opt.folder.root');
    rootLink.querySelector('button').onclick = () => chrome.tabs.create({ url: 'chrome://settings/downloads' });
    updatePreview();

    section('download', t('opt.sec.download'), [
      row({ title: t('opt.folder'), desc: t('opt.folder.desc'), body: [folder, tokenChips(folder), rootLink] }),
      row({ title: t('opt.filename'), desc: t('opt.filename.desc'), body: [fname, tokenChips(fname), preview] }),
      row({ title: t('opt.quality'), desc: t('opt.quality.desc'), body: segmented('quality', [
        { value: 'original', label: t('opt.quality.original') }, { value: 'sample', label: t('opt.quality.sample') }
      ]) }),
      row({ title: t('opt.concurrency'), desc: t('opt.concurrency.desc'), body: slider('concurrency', { min: 1, max: 6 }) }),
      row({ title: t('opt.conflict'), body: segmented('conflict', [
        { value: 'uniquify', label: t('opt.conflict.uniquify') }, { value: 'overwrite', label: t('opt.conflict.overwrite') }
      ]) }),
      row({ title: t('opt.notifyDone'), desc: t('opt.notifyDone.desc'), control: toggle('notifyDone') }),
      row({ title: t('opt.openFolderDone'), desc: t('opt.openFolderDone.desc'), control: toggle('openFolderDone') })
    ]);

    /* Filters */
    const logoRows = [];
    const sync = () => logoRows.forEach((r) => r.classList.toggle('disabled', !S.logoFilter));
    const rSize = row({ sub: true, title: t('opt.logoBySize'), desc: t('opt.logoBySize.desc', { n: S.logoMaxSide }), control: toggle('logoBySize'),
      body: slider('logoMaxSide', { min: 64, max: 1024, step: 16, fmt: (v) => v + ' px', onInput: (v) => (rSize.querySelector('.row-desc').textContent = t('opt.logoBySize.desc', { n: v })) }) });
    const rRatio = row({ sub: true, title: t('opt.logoByRatio'), desc: t('opt.logoByRatio.desc', { n: S.logoRatio }), control: toggle('logoByRatio'),
      body: slider('logoRatio', { min: 2, max: 8, step: 0.5, fmt: (v) => v + ':1', onInput: (v) => (rRatio.querySelector('.row-desc').textContent = t('opt.logoByRatio.desc', { n: v })) }) });
    const rTags = row({ sub: true, title: t('opt.logoByTags'), desc: t('opt.logoByTags.desc'), control: toggle('logoByTags'),
      body: field('logoTags', { hint: t('opt.logoTags.hint'), multiline: true }) });
    logoRows.push(rTags, rSize, rRatio);

    const scoreRow = row({ title: t('opt.minScore'), desc: t('opt.minScore.desc', { n: S.minScore }),
      body: slider('minScore', { min: -20, max: 200, step: 5, onInput: (v) => (scoreRow.querySelector('.row-desc').textContent = t('opt.minScore.desc', { n: v })) }) });

    section('filter', t('opt.sec.filters'), [
      row({ title: t('opt.logoFilter'), desc: t('opt.logoFilter.desc'), control: toggle('logoFilter', sync) }),
      rTags, rSize, rRatio,
      row({ title: t('opt.ratings'), desc: t('opt.ratings.desc'), body: chipSet('ratings', ['g', 's', 'q', 'e'].map((k) => ({ value: k, label: t('opt.rating.' + k) }))) }),
      scoreRow,
      row({ title: t('opt.fileTypes'), desc: t('opt.fileTypes.desc'), body: chipSet('fileTypes', [
        { value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }, { value: 'gif', label: 'GIF' }, { value: 'webp', label: 'WebP' },
        { value: 'avif', label: 'AVIF' }, { value: 'video', label: t('opt.type.video') }, { value: 'zip', label: t('opt.type.zip') }
      ]) })
    ]);
    sync();

    /* Scanning */
    const delayRow = row({ title: t('opt.scanDelay'), desc: t('opt.scanDelay.desc', { n: S.scanDelay }),
      body: slider('scanDelay', { min: 300, max: 3000, step: 100, fmt: (v) => v + ' ms', onInput: (v) => (delayRow.querySelector('.row-desc').textContent = t('opt.scanDelay.desc', { n: v })) }) });
    section('search', t('opt.sec.scan'), [
      row({ title: t('opt.scanPages'), desc: t('opt.scanPages.desc'), body: slider('scanPages', { min: 1, max: 50 }) }),
      delayRow,
      row({ title: t('opt.autoScan'), desc: t('opt.autoScan.desc'), control: toggle('autoScan') }),
      row({ title: t('opt.blurExplicit'), desc: t('opt.blurExplicit.desc'), control: toggle('blurExplicit') }),
      row({ title: t('opt.gridCols'), desc: t('opt.gridCols.desc'), body: segmented('gridCols', [3, 4, 5].map((n) => ({ value: n, label: String(n) }))) })
    ]);

    /* Backup */
    const foot = h('<div class="foot"></div>');
    const mkBtn = (cls, icon, label, fn) => { const b = h(`<button type="button" class="btn ${cls}">${DD.svg(icon)}<span></span></button>`); b.querySelector('span').textContent = label; b.onclick = fn; foot.appendChild(b); };
    mkBtn('tonal', 'download', t('opt.export'), exportSettings);
    mkBtn('tonal', 'upload', t('opt.import'), () => $('importFile').click());
    mkBtn('danger', 'reset', t('opt.reset'), () => $('dlgReset').showModal());
    section('settings', t('opt.sec.about'), [row({ body: foot })]);
  }

  /* ---- export / import / reset ---- */
  function exportSettings() {
    const blob = new Blob([JSON.stringify({ app: 'danbooru-downloader', version: manifest.version, settings: S }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'danbooru-downloader-settings.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('opt.exported'));
  }
  $('importFile').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'danbooru-downloader' || typeof j.settings !== 'object') throw 0;
      const clean = {};
      const def = DD.DEFAULTS();
      Object.keys(def).forEach((k) => { if (k in j.settings && typeof j.settings[k] === typeof def[k]) clean[k] = j.settings[k]; });
      await applyAll(Object.assign(def, clean));
      toast(t('opt.imported'));
    } catch { toast(t('opt.importFail')); }
  };
  async function applyAll(next) {
    await chrome.storage.sync.clear();
    await DD.setSettings(next);
    S = next; t = DD.makeT(S.lang);
    document.documentElement.lang = S.lang;
    DD.applyTheme(S); DD.applyI18n(t);
    $('subtitle').textContent = t('opt.subtitle', { v: manifest.version });
    build();
  }
  $('resetCancel').onclick = () => $('dlgReset').close();
  $('resetOk').onclick = async () => { $('dlgReset').close(); await applyAll(DD.DEFAULTS()); toast(t('opt.saved')); };

  /* ---- init ---- */
  DD.applyTheme(S);
  DD.watchTheme(() => S);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S.themeMode === 'system' && build());
  document.documentElement.lang = S.lang;
  $('logo').innerHTML = `<svg viewBox="0 0 100 100"><path d="${DD.scallop(8, 0.08)}" fill="var(--primary)"/><g transform="translate(26 26) scale(2)" fill="var(--on-primary)"><path d="${DD.ICONS.download}"/></g></svg>`;
  DD.applyI18n(t);
  $('subtitle').textContent = t('opt.subtitle', { v: manifest.version });
  build();
  document.body.classList.add('ready');
})();
