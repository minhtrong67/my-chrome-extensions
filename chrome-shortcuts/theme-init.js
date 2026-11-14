/* Runs synchronously in <head> to avoid a light/dark flash. The real settings live in
   chrome.storage.sync; common.js mirrors theme + language into localStorage as a fast cache. */
(() => {
  let m = 'auto';
  try { m = localStorage.getItem('theme') || 'auto'; } catch (e) {}
  const dark = m === 'dark' || (m !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
