// Đa ngôn ngữ (vi / en). t('khoá', {biến}) và applyI18n() cho các phần tử có data-i18n*.
import { vi } from './lang/vi.js';
import { en } from './lang/en.js';

export const LANGS = { vi: 'Tiếng Việt', en: 'English' };
const DICTS = { vi, en };
let lang = 'vi';

export const getLang = () => lang;

export function setLang(l) {
  lang = DICTS[l] ? l : 'vi';
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

/** Dịch theo ngôn ngữ chỉ định (dùng trong service worker). */
export function translate(l, key, vars) {
  let s = DICTS[l]?.[key] ?? DICTS.vi[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}
export const t = (key, vars) => translate(lang, key, vars);

/**
 * data-i18n="khoá"            → textContent
 * data-i18n-html="khoá"       → innerHTML (chuỗi tin cậy trong từ điển, có thể chứa <code>, <strong>…)
 * data-i18n-attr="placeholder:khoá;aria-label:khoá" → thuộc tính
 */
export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((x) => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
}
