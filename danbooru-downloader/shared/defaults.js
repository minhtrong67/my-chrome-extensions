/* Shared settings: defaults + storage helpers (popup, options, service worker) */
(function (g) {
  const DD = (g.DD = g.DD || {});

  DD.DEFAULTS = () => ({
    // appearance
    themeMode: 'system',            // light | dark | system
    themeColor: 'Indigo',           // name from DD.COLORS or 'Custom'
    customColor: '#7C4DFF',
    fontSize: 'medium',             // small | medium | large
    fontFamily: 'google-sans-flex',
    lang: String((g.navigator && navigator.language) || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en',
    // download
    saveFolder: 'Danbooru/{query}',
    filenameTemplate: '{id}.{ext}',
    quality: 'original',            // original | sample
    concurrency: 3,
    conflict: 'uniquify',           // uniquify | overwrite
    notifyDone: true,
    openFolderDone: false,
    // filters
    logoFilter: true,
    logoByTags: true,
    logoTags: 'logo, *_logo',
    logoBySize: true,
    logoMaxSide: 256,
    logoByRatio: true,
    logoRatio: 4,
    ratings: ['g', 's', 'q', 'e'],
    minScore: 0,
    fileTypes: ['jpg', 'png', 'gif', 'webp', 'avif'],
    // scanning
    scanPages: 1,
    scanDelay: 800,
    autoScan: true,
    blurExplicit: false,
    gridCols: 4
  });

  DD.getSettings = async () => {
    const stored = await chrome.storage.sync.get(null);
    return Object.assign(DD.DEFAULTS(), stored);
  };
  DD.setSettings = (patch) => chrome.storage.sync.set(patch);
  DD.resetSettings = async () => { await chrome.storage.sync.clear(); return DD.DEFAULTS(); };
})(globalThis);
