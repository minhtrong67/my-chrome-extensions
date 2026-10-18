/**
 * Case Converter — background service worker
 * Sets up a right-click context menu so users can convert a selection
 * without leaving the page, in addition to the keyboard shortcuts.
 */

const MENU_ITEMS = [
  { id: 'uppercase', titleEn: 'UPPERCASE', titleVi: 'CHỮ HOA' },
  { id: 'lowercase', titleEn: 'lowercase', titleVi: 'chữ thường' },
  { id: 'capitalize', titleEn: 'Capitalize Each Word', titleVi: 'Viết Hoa Từng Từ' },
  { id: 'sentenceCase', titleEn: 'Sentence case', titleVi: 'Viết hoa đầu câu' },
  { id: 'titleCase', titleEn: 'Title Case', titleVi: 'Viết Hoa Tiêu Đề' },
  { id: 'alternatingCase', titleEn: 'aLTERNATING cASE', titleVi: 'cHỮ xEN kẼ' },
];

async function getLang() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('caseConverterSettings', (res) => {
      resolve((res.caseConverterSettings && res.caseConverterSettings.language) || 'en');
    });
  });
}

async function buildMenu() {
  const lang = await getLang();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'case-converter-root',
      title: lang === 'vi' ? 'Case Converter' : 'Case Converter',
      contexts: ['editable', 'selection'],
    });
    MENU_ITEMS.forEach((item) => {
      chrome.contextMenus.create({
        id: `cc-${item.id}`,
        parentId: 'case-converter-root',
        title: lang === 'vi' ? item.titleVi : item.titleEn,
        contexts: ['editable', 'selection'],
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.caseConverterSettings) {
    buildMenu();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.menuItemId.startsWith('cc-') || !tab || !tab.id) return;
  const transformId = info.menuItemId.replace('cc-', '');
  chrome.tabs.sendMessage(tab.id, { type: 'CC_APPLY_TO_ACTIVE', transformId });
});
