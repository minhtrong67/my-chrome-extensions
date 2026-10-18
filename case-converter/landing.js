(() => {
  const query = new URLSearchParams(location.search);
  const browserLang = (navigator.language || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  let savedPrefs = {};
  try { savedPrefs = JSON.parse(localStorage.getItem('ccLandingPrefs') || '{}'); } catch (_) { savedPrefs = {}; }
  const state = {
    lang: query.get('lang') === 'vi' ? 'vi' : query.get('lang') === 'en' ? 'en' : (savedPrefs.lang === 'vi' || savedPrefs.lang === 'en' ? savedPrefs.lang : browserLang),
    theme: query.get('theme') === 'dark' ? 'dark' : query.get('theme') === 'light' ? 'light' : (savedPrefs.theme === 'dark' || savedPrefs.theme === 'light' ? savedPrefs.theme : (prefersDark ? 'dark' : 'light')),
    color: ['purple', 'blue', 'green', 'orange', 'pink', 'teal'].includes(query.get('color')) ? query.get('color') : 'purple',
  };

  const copy = {
    en: {
      navFeatures: 'Features', navHow: 'How it works', navAbout: 'About', getStarted: 'Get started',
      eyebrow: 'Material Design · Privacy first', title: 'Make every word <span>fit.</span>',
      heroText: 'Convert text anywhere on the web with one beautiful, focused Chrome extension. Smart case tools, custom shortcuts and zero data collection.',
      addChrome: 'Add to Chrome <span>→</span>', explore: 'Explore features', local: '100% local', bilingual: 'English + Tiếng Việt', open: 'Open source',
      yourText: 'Your text', result: 'Result', featuresEyebrow: 'Everything in reach', featuresTitle: 'A small tool with a thoughtful edge.', featuresText: 'Designed for writers, developers and everyone who moves words around the web.',
      f1: '11 useful transformations', f1t: 'From UPPERCASE and sentence case to snake_case, kebab-case and camelCase.', f2: 'Shortcuts that stay in context', f2t: 'Transform the field you are editing. Works with inputs, textareas and rich editors.', f3: 'Your style, your theme', f3t: 'Light, dark or system appearance with Material color palettes and bilingual UI.',
      howEyebrow: 'Three easy moves', howTitle: 'From thought to polished text.', step1: 'Open', step1t: 'Pin Case Converter and open the popup whenever you need a quick text tool.', step2: 'Transform', step2t: 'Paste text or use a shortcut directly inside the page you are already working on.', step3: 'Keep writing', step3t: 'Copy the result, chain another tool, or continue editing without losing your flow.',
      ctaTitle: 'Words, in your way.', ctaText: 'Install from source in under a minute. No account. No tracking.', source: 'View source →', created: 'Created by', support: 'with support from', theme: 'Toggle theme', language: 'Switch language',
    },
    vi: {
      navFeatures: 'Tính năng', navHow: 'Cách hoạt động', navAbout: 'Giới thiệu', getStarted: 'Bắt đầu',
      eyebrow: 'Material Design · Ưu tiên riêng tư', title: 'Để mọi từ <span>đúng ý.</span>',
      heroText: 'Chuyển đổi văn bản ở bất kỳ đâu trên web với một tiện ích Chrome đẹp, tập trung và nhanh. Công cụ thông minh, phím tắt tuỳ chỉnh, không thu thập dữ liệu.',
      addChrome: 'Thêm vào Chrome <span>→</span>', explore: 'Khám phá tính năng', local: '100% cục bộ', bilingual: 'English + Tiếng Việt', open: 'Mã nguồn mở',
      yourText: 'Văn bản của bạn', result: 'Kết quả', featuresEyebrow: 'Mọi thứ trong tầm tay', featuresTitle: 'Một công cụ nhỏ, được chăm chút kỹ.', featuresText: 'Dành cho người viết, lập trình viên và tất cả những ai làm việc với văn bản trên web.',
      f1: '11 kiểu chuyển đổi hữu ích', f1t: 'Từ CHỮ HOA, viết hoa đầu câu đến snake_case, kebab-case và camelCase.', f2: 'Phím tắt ngay trong ngữ cảnh', f2t: 'Chuyển đổi ngay ô bạn đang sửa. Hoạt động với input, textarea và trình soạn thảo nâng cao.', f3: 'Phong cách của bạn, theme của bạn', f3t: 'Giao diện sáng, tối hoặc theo hệ thống với bảng màu Material và hai ngôn ngữ.',
      howEyebrow: 'Ba bước đơn giản', howTitle: 'Từ ý tưởng đến văn bản hoàn chỉnh.', step1: 'Mở', step1t: 'Ghim Case Converter và mở popup mỗi khi cần một công cụ văn bản nhanh.', step2: 'Chuyển đổi', step2t: 'Dán văn bản hoặc dùng phím tắt ngay trong trang bạn đang làm việc.', step3: 'Tiếp tục viết', step3t: 'Sao chép kết quả, kết hợp công cụ khác hoặc tiếp tục chỉnh sửa liền mạch.',
      ctaTitle: 'Văn bản theo cách của bạn.', ctaText: 'Cài đặt từ mã nguồn trong chưa đầy một phút. Không tài khoản. Không theo dõi.', source: 'Xem mã nguồn →', created: 'Được tạo bởi', support: 'với sự hỗ trợ của', theme: 'Đổi theme', language: 'Đổi ngôn ngữ',
    },
  };
  const $ = (selector) => document.querySelector(selector);
  const set = (selector, value, html = false) => { const el = $(selector); if (el) html ? (el.innerHTML = value) : (el.textContent = value); };
  function applyTheme() { document.documentElement.dataset.theme = state.theme; document.documentElement.dataset.color = state.color; }
  function applyLanguage() {
    const t = copy[state.lang]; document.documentElement.lang = state.lang;
    const values = {
      '#navFeatures': 'navFeatures', '#navHow': 'navHow', '#navAbout': 'navAbout', '#getStarted': 'getStarted', '#heroEyebrow': 'eyebrow', '#heroTitle': 'title', '#heroText': 'heroText', '#addChrome': 'addChrome', '#explore': 'explore', '#local': 'local', '#bilingual': 'bilingual', '#openSource': 'open', '#yourText': 'yourText', '#result': 'result', '#featuresEyebrow': 'featuresEyebrow', '#featuresTitle': 'featuresTitle', '#featuresText': 'featuresText', '#f1': 'f1', '#f1t': 'f1t', '#f2': 'f2', '#f2t': 'f2t', '#f3': 'f3', '#f3t': 'f3t', '#howEyebrow': 'howEyebrow', '#howTitle': 'howTitle', '#step1': 'step1', '#step1t': 'step1t', '#step2': 'step2', '#step2t': 'step2t', '#step3': 'step3', '#step3t': 'step3t', '#ctaTitle': 'ctaTitle', '#ctaText': 'ctaText', '#source': 'source', '#created': 'created', '#support': 'support',
    };
    Object.entries(values).forEach(([selector, key]) => set(selector, t[key], ['#heroTitle', '#addChrome'].includes(selector)));
    const langBtn = $('#languageToggle'); if (langBtn) langBtn.textContent = state.lang.toUpperCase(); langBtn?.setAttribute('aria-label', t.language);
    $('#themeToggle')?.setAttribute('aria-label', t.theme);
  }
  function persist() {
    try { localStorage.setItem('ccLandingPrefs', JSON.stringify(state)); } catch (_) { /* private mode */ }
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) chrome.storage.sync.set({ caseConverterLanding: state });
  }
  $('#languageToggle')?.addEventListener('click', () => { state.lang = state.lang === 'vi' ? 'en' : 'vi'; applyLanguage(); persist(); });
  $('#themeToggle')?.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); persist(); });
  applyTheme(); applyLanguage();
  if (!query.has('lang') && !query.has('theme') && typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.get('caseConverterSettings', (result) => {
      const saved = result.caseConverterSettings || {};
      if (saved.language === 'vi' || saved.language === 'en') state.lang = saved.language;
      if (saved.theme === 'dark' || saved.theme === 'light') state.theme = saved.theme;
      if (['purple', 'blue', 'green', 'orange', 'pink', 'teal'].includes(saved.color)) state.color = saved.color;
      applyTheme(); applyLanguage();
    });
  }
})();
