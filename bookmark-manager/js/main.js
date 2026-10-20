/**
 * main.js — TagMark popup logic.
 *
 * TagMark is a richer layer on top of Chrome's own bookmarks:
 *  - title / url / folder live in chrome.bookmarks (single source of truth);
 *  - tags and notes are TagMark's addition, stored via storage.js by bookmark id.
 * Every mutation goes through chrome.bookmarks first, then state is re-read from
 * Chrome, so the popup can never drift from chrome://bookmarks. Changes made
 * elsewhere while the popup is open are picked up via bookmark events.
 */

let t = I18N.en;
let settings = { ...DEFAULT_SETTINGS };
let metaMap = {};               // { [bookmarkId]: { tags, note } }
let bookmarks = [];             // flattened url-bearing nodes
let folderTree = [];            // raw chrome.bookmarks tree
let duplicateUrls = new Set();

let currentView = "list";       // list | grid (layout)
let currentSort = "dateAdded";
let currentFolderId = "";
let currentTagFilter = "";
let showDuplicatesOnly = false;
let searchQuery = "";
let selectMode = false;
let selectedIds = new Set();
let editingId = null;
let activeScreen = "list";      // list | edit | settings
let pendingTags = [];
let animateNext = true;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Lower-case + strip diacritics so "viet" matches "Việt". */
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

// ── Init ────────────────────────────────────────────────────

async function init() {
  hydrateIcons();
  settings = await store.loadSettings();
  themeManager.apply(settings.theme, settings.color);
  themeManager.watchSystemChanges();
  setLanguage(resolveLang(settings));
  currentView = settings.defaultView;
  currentSort = settings.defaultSort;
  $("sortSelect").value = currentSort;
  updateViewToggle();
  buildSwatches();
  bindEvents();
  await loadEverything();
  watchChromeBookmarks();
  if (new URLSearchParams(location.search).has("standalone")) document.body.classList.add("standalone");
}

function setLanguage(lang) {
  i18n.setLang(lang);
  t = I18N[lang];
  $("aboutAuthor").textContent = AUTHOR;
  $("aboutVersion").textContent = `${t.version} ${APP_VERSION}`;
  const sort = $("sortSelect");
  const labels = { dateAdded: lang === "vi" ? "Mới nhất" : "Newest", titleAsc: "A → Z", titleDesc: "Z → A" };
  [...sort.options].forEach((o) => { o.textContent = labels[o.value]; });
  sort.title = sort.getAttribute("aria-label") || (lang === "vi" ? "Sắp xếp" : "Sort");
  sort.setAttribute("aria-label", sort.title);
  $("viewListBtn").title = lang === "vi" ? "Dạng danh sách" : "List view";
  $("viewGridBtn").title = lang === "vi" ? "Dạng lưới" : "Grid view";
  $("viewListBtn").setAttribute("aria-label", $("viewListBtn").title);
  $("viewGridBtn").setAttribute("aria-label", $("viewGridBtn").title);
  updateBar();
  if (bookmarks.length || folderTree.length) { populateFolderSelects(); renderTagRow(); renderList(false); }
  buildSwatches();
  syncSettingsUI();
}

async function loadEverything() {
  const [tree, meta] = await Promise.all([chrome.bookmarks.getTree(), store.loadAllMeta()]);
  folderTree = tree;
  metaMap = meta;
  bookmarks = flattenTree(tree);
  computeDuplicates();
  populateFolderSelects();
  renderTagRow();
  renderList(animateNext);
  animateNext = false;
}

function flattenTree(tree) {
  const out = [];
  (function walk(node, path) {
    if (node.url) {
      out.push({ id: node.id, title: node.title || node.url, url: node.url, dateAdded: node.dateAdded || 0, parentId: node.parentId, path });
    } else if (node.children) {
      const nextPath = node.id === "0" ? path : [...path, node.title];
      node.children.forEach((c) => walk(c, nextPath));
    }
  })({ id: "0", children: tree }, []);
  return out;
}

function computeDuplicates() {
  const counts = new Map();
  bookmarks.forEach((b) => counts.set(b.url, (counts.get(b.url) || 0) + 1));
  duplicateUrls = new Set([...counts].filter(([, n]) => n > 1).map(([u]) => u));
  if (!duplicateUrls.size) showDuplicatesOnly = false;
}

/** Re-sync when bookmarks change outside the popup (chrome://bookmarks, sync, other extensions). */
function watchChromeBookmarks() {
  let timer;
  const refresh = () => { clearTimeout(timer); timer = setTimeout(() => { if (activeScreen !== "edit") loadEverything(); }, 250); };
  ["onCreated", "onRemoved", "onChanged", "onMoved"].forEach((ev) => chrome.bookmarks[ev]?.addListener(refresh));
}

// ── Folders ─────────────────────────────────────────────────

function flattenFolders(tree) {
  const out = [];
  (function walk(node, depth) {
    if (node.url) return;
    if (node.id !== "0") out.push({ id: node.id, title: node.title, depth });
    (node.children || []).forEach((c) => walk(c, node.id === "0" ? depth : depth + 1));
  })({ id: "0", children: tree }, 0);
  return out;
}

function populateFolderSelects() {
  const folders = flattenFolders(folderTree);
  const indent = (d) => "\u2003".repeat(Math.max(0, d - 1));
  const opts = folders.map((f) => `<option value="${f.id}">${indent(f.depth)}${esc(f.title)}</option>`).join("");

  const filterSel = $("folderFilterSelect");
  filterSel.innerHTML = `<option value="">${esc(t.allFolders)}</option>${opts}`;
  filterSel.value = folders.some((f) => f.id === currentFolderId) ? currentFolderId : "";
  currentFolderId = filterSel.value;

  const editSel = $("editFolderSelect");
  const prev = editSel.value;
  editSel.innerHTML = opts;
  if (folders.some((f) => f.id === prev)) editSel.value = prev;
  $("folderFilterSelect").title = t.folderLabel;
  $("folderFilterSelect").setAttribute("aria-label", t.folderLabel);
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = findNode(n.children, id); if (f) return f; }
  }
  return null;
}
/** All folder ids at or below `rootId`. */
function folderSubtreeIds(rootId) {
  const ids = new Set();
  const root = findNode(folderTree, rootId);
  (function walk(n) { if (!n || n.url) return; ids.add(n.id); (n.children || []).forEach(walk); })(root);
  return ids;
}

// ── Tag filter row ──────────────────────────────────────────

function allDistinctTags() {
  const counts = new Map();
  const live = new Set(bookmarks.map((b) => b.id));
  for (const [id, m] of Object.entries(metaMap)) {
    if (!live.has(id)) continue;
    (m.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  }
  return [...counts].sort((a, b) => a[0].localeCompare(b[0]));
}

function renderTagRow() {
  const row = $("tagRow");
  const tags = allDistinctTags();
  if (currentTagFilter && !tags.some(([tag]) => tag === currentTagFilter)) currentTagFilter = "";
  let html = "";
  if (duplicateUrls.size) {
    html += `<button class="chip dup${showDuplicatesOnly ? " active" : ""}" data-dup="1">${icon("copy-check", 16)}${esc(t.duplicates)}<span class="chip-count">${duplicateUrls.size}</span></button>`;
  }
  html += tags.map(([tag, n]) => `<button class="chip${currentTagFilter === tag ? " active" : ""}" data-tag="${esc(tag)}">${esc(tag)}<span class="chip-count">${n}</span></button>`).join("");
  row.innerHTML = html;
  $("tagSuggestions").innerHTML = tags.map(([tag]) => `<option value="${esc(tag)}"></option>`).join("");
}

// ── Filter + sort ───────────────────────────────────────────

function getFilteredSorted() {
  const q = fold(searchQuery.trim());
  const folderIds = currentFolderId ? folderSubtreeIds(currentFolderId) : null;
  const list = bookmarks.filter((b) => {
    const meta = metaMap[b.id] || { tags: [], note: "" };
    if (folderIds && !folderIds.has(b.parentId)) return false;
    if (showDuplicatesOnly && !duplicateUrls.has(b.url)) return false;
    if (currentTagFilter && !(meta.tags || []).includes(currentTagFilter)) return false;
    if (q && !fold(`${b.title} ${b.url} ${(meta.tags || []).join(" ")} ${meta.note || ""}`).includes(q)) return false;
    return true;
  });
  const collator = new Intl.Collator(i18n.current, { sensitivity: "base", numeric: true });
  list.sort((a, b) => {
    if (currentSort === "titleAsc") return collator.compare(a.title, b.title);
    if (currentSort === "titleDesc") return collator.compare(b.title, a.title);
    return b.dateAdded - a.dateAdded;
  });
  return list;
}

// ── Rendering ───────────────────────────────────────────────

function faviconUrl(pageUrl) {
  const u = new URL(chrome.runtime.getURL("/_favicon/"));
  u.searchParams.set("pageUrl", pageUrl);
  u.searchParams.set("size", "32");
  return u.toString();
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    const rest = (u.pathname !== "/" ? u.pathname : "") + u.search;
    return (u.hostname || u.protocol).replace(/^www\./, "") + rest;
  } catch (_) { return url; }
}

function renderList(animate = false) {
  const list = $("bookmarkList");
  const filtered = getFilteredSorted();
  list.classList.toggle("grid-view", currentView === "grid");
  list.classList.toggle("animate", animate);
  $("resultsLabel").textContent = t.resultsCount(filtered.length);
  $("clearSearchBtn").hidden = !searchQuery;

  if (!filtered.length) {
    const filtering = searchQuery || currentFolderId || currentTagFilter || showDuplicatesOnly;
    list.innerHTML = `<div class="empty-state">${icon("bookmark", 32)}<span class="empty-title">${esc(t.emptyTitle)}</span><span>${esc(filtering ? t.emptyHintSearch : t.emptyHintEmpty)}</span></div>`;
    updateBulkBar();
    return;
  }

  const frag = document.createDocumentFragment();
  filtered.forEach((b, i) => frag.appendChild(buildItem(b, animate ? Math.min(i, 8) * 22 : 0)));
  list.replaceChildren(frag);
  updateBulkBar();
}

function buildItem(b, delay) {
  const meta = metaMap[b.id] || { tags: [], note: "" };
  const div = document.createElement("div");
  div.className = "bookmark-item" + (selectMode && selectedIds.has(b.id) ? " is-selected" : "");
  div.dataset.id = b.id;
  div.tabIndex = 0;
  div.setAttribute("role", "button");
  if (delay) div.style.animationDelay = `${delay}ms`;

  const isDup = duplicateUrls.has(b.url);
  const chips = (meta.tags || []).map((tag) => `<span class="bm-tag">${esc(tag)}</span>`).join("") + (isDup ? `<span class="bm-tag dup">${esc(t.duplicates)}</span>` : "");
  const path = b.path.length ? `<div class="bm-path">${icon("folder", 12)}<span>${esc(b.path.join(" / "))}</span></div>` : "";
  const lead = selectMode && selectedIds.has(b.id)
    ? `<div class="bm-check">${icon("check", 22)}</div>`
    : `<img src="${faviconUrl(b.url)}" alt="" loading="lazy" data-fav />`;

  div.innerHTML = `
    <div class="bm-lead">${lead}</div>
    <div class="bm-body">
      <div class="bm-title">${esc(b.title)}</div>
      <div class="bm-url">${esc(prettyUrl(b.url))}</div>
      ${path}
      ${chips ? `<div class="bm-tags">${chips}</div>` : ""}
    </div>
    ${meta.note && meta.note.trim() ? `<span class="bm-note" title="${esc(meta.note)}">${icon("sticky-note", 16)}</span>` : ""}
    ${selectMode ? "" : `<div class="bm-actions">
      <button class="icon-btn sm" data-action="edit" title="${esc(t.editAction)}" aria-label="${esc(t.editAction)}">${icon("pencil", 18)}</button>
      <button class="icon-btn sm" data-action="copy" title="${esc(t.copyUrl)}" aria-label="${esc(t.copyUrl)}">${icon("copy", 18)}</button>
    </div>`}`;
  return div;
}

function fallbackIcon(img) {
  const span = document.createElement("span");
  span.className = "fallback";
  span.innerHTML = icon("globe", 20);
  img.replaceWith(span);
}

// ── Selection / bulk ────────────────────────────────────────

function updateBulkBar() {
  $("bulkBar").hidden = !selectMode;
  $("selectModeBtn").classList.toggle("is-active", selectMode);
  if (!selectMode) return;
  const visible = getFilteredSorted();
  const all = visible.length > 0 && visible.every((b) => selectedIds.has(b.id));
  $("bulkCount").textContent = t.bulkCount(selectedIds.size);
  $("bulkSelectAllBtn").textContent = all ? t.deselectAll : t.selectAll;
  $("bulkTagBtn").disabled = $("bulkDeleteBtn").disabled = selectedIds.size === 0;
}

function setSelectMode(on) {
  selectMode = on;
  if (!on) selectedIds.clear();
  renderList(false);
}

async function bulkAddTag() {
  const raw = await askInput({ title: t.bulkTagTitle, message: t.bulkTagPrompt, placeholder: t.tagInputPlaceholder, okText: t.save });
  const tag = (raw || "").trim();
  if (!tag) return;
  const entries = [...selectedIds].map((id) => {
    const m = metaMap[id] || { tags: [], note: "" };
    const tags = [...(m.tags || [])];
    if (!tags.some((x) => x.toLowerCase() === tag.toLowerCase())) tags.push(tag);
    return [id, { tags, note: m.note || "" }];
  });
  await store.setMetaMany(entries);
  toast(t.toastTagAdded(entries.length));
  setSelectMode(false);
  await loadEverything();
}

async function bulkDelete() {
  const ids = [...selectedIds];
  const ok = await askConfirm({ title: t.bulkDeleteTitle(ids.length), message: t.bulkDeleteConfirm, okText: t.deleteAction, danger: true });
  if (!ok) return;
  for (const id of ids) { try { await chrome.bookmarks.remove(id); } catch (_) {} }
  await store.deleteMetaMany(ids);
  toast(t.toastBulkDeleted(ids.length));
  setSelectMode(false);
  await loadEverything();
}

// ── Dialogs & toast ─────────────────────────────────────────

let dialogResolve = null;
function openDialog({ title, message, okText, cancelText, danger, input, placeholder }) {
  return new Promise((resolve) => {
    $("dialogTitle").textContent = title;
    $("dialogMessage").textContent = message || "";
    $("dialogMessage").hidden = !message;
    $("dialogField").hidden = !input;
    $("dialogInput").value = "";
    $("dialogInput").placeholder = placeholder || "";
    $("dialogOk").textContent = okText || t.confirm;
    $("dialogOk").classList.toggle("danger", !!danger);
    $("dialogCancel").textContent = cancelText || t.cancel;
    $("scrim").hidden = false;
    dialogResolve = (v) => { $("scrim").hidden = true; dialogResolve = null; resolve(v); };
    setTimeout(() => (input ? $("dialogInput") : $("dialogOk")).focus(), 30);
  });
}
const askConfirm = (o) => openDialog(o);
const askInput = (o) => openDialog({ ...o, input: true });

let toastTimer;
function toast(msg, isError) {
  const el = $("snackbar");
  el.textContent = msg;
  el.classList.toggle("error", !!isError);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

// ── Screens ─────────────────────────────────────────────────

function showScreen(name) {
  activeScreen = name;
  ["list", "edit", "settings"].forEach((v) => { $(`view-${v}`).hidden = v !== name; });
  closeMenu();
  updateBar();
  if (name === "list") { if (selectMode) setSelectMode(false); renderList(false); }
}

function updateBar() {
  const sub = activeScreen !== "list";
  $("appBar").classList.toggle("sub", sub);
  $("backBtn").hidden = !sub;
  $("brand").hidden = sub;
  $("barTitle").hidden = !sub;
  $("barActions").hidden = sub;
  if (sub) $("barTitle").textContent = activeScreen === "settings" ? t.settings : (editingId ? t.editBookmark : t.addBookmark);
}

function openEdit(id) {
  const b = bookmarks.find((x) => x.id === id);
  if (!b) { toast(t.toastError, true); return; }
  editingId = id;
  const meta = metaMap[id] || { tags: [], note: "" };
  $("editTitleInput").value = b.title;
  $("editUrlInput").value = b.url;
  $("editFolderSelect").value = b.parentId;
  $("noteInput").value = meta.note || "";
  $("deleteBookmarkBtn").hidden = false;
  resetEditUi();
  renderTagPills(meta.tags || []);
  showScreen("edit");
}

function resetEditUi() {
  $("newFolderRow").hidden = true;
  $("newFolderInput").value = "";
  $("tagInput").value = "";
  $("editUrlInput").closest(".field").classList.remove("invalid");
}

function renderTagPills(tags) {
  pendingTags = [...tags];
  $("tagPills").innerHTML = pendingTags.map((tag, i) =>
    `<span class="tag-pill">${esc(tag)}<button type="button" data-i="${i}" aria-label="${esc(t.removeTag)}">${icon("x", 14)}</button></span>`).join("");
}

function addPendingTag(raw) {
  raw.split(",").map((s) => s.trim()).filter(Boolean).forEach((tag) => {
    if (!pendingTags.some((x) => x.toLowerCase() === tag.toLowerCase())) pendingTags.push(tag);
  });
  renderTagPills(pendingTags);
}

function normalizeUrl(str) {
  let s = str.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s; // "example.com" → https://example.com
  try {
    const u = new URL(s);
    if (!["http:", "https:", "ftp:", "file:"].includes(u.protocol)) return null;
    if (u.protocol.startsWith("http") && !u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.href;
  } catch (_) { return null; }
}

async function saveEdit() {
  const url = normalizeUrl($("editUrlInput").value);
  if (!url) {
    $("editUrlInput").closest(".field").classList.add("invalid");
    $("editUrlInput").focus();
    toast(t.toastInvalidUrl, true);
    return;
  }
  if ($("tagInput").value.trim()) { addPendingTag($("tagInput").value); $("tagInput").value = ""; }
  const title = $("editTitleInput").value.trim() || url;
  const folderId = $("editFolderSelect").value;
  const note = $("noteInput").value.trim();
  try {
    let id = editingId;
    if (editingId) {
      const cur = bookmarks.find((x) => x.id === editingId);
      await chrome.bookmarks.update(editingId, { title, url });
      if (cur && cur.parentId !== folderId) await chrome.bookmarks.move(editingId, { parentId: folderId });
      toast(t.toastUpdated);
    } else {
      id = (await chrome.bookmarks.create({ parentId: folderId || undefined, title, url })).id;
      toast(t.toastSaved);
    }
    await store.setMeta(id, { tags: pendingTags, note });
    if (folderId) { settings.lastFolderId = folderId; store.patchSettings({ lastFolderId: folderId }); }
  } catch (_) { toast(t.toastError, true); return; }
  editingId = null;
  showScreen("list");
  await loadEverything();
}

async function deleteCurrent() {
  if (!editingId) return;
  const ok = await askConfirm({ title: t.deleteTitle, message: t.deleteConfirm, okText: t.deleteAction, danger: true });
  if (!ok) return;
  try {
    await chrome.bookmarks.remove(editingId);
    await store.deleteMeta(editingId);
    toast(t.toastDeleted);
  } catch (_) { toast(t.toastError, true); }
  editingId = null;
  showScreen("list");
  await loadEverything();
}

async function createFolderInline() {
  const name = $("newFolderInput").value.trim();
  if (!name) { $("newFolderInput").focus(); return; }
  try {
    const parentId = $("editFolderSelect").value || undefined;
    const folder = await chrome.bookmarks.create({ parentId, title: name });
    folderTree = await chrome.bookmarks.getTree();
    populateFolderSelects();
    $("editFolderSelect").value = folder.id;
    $("newFolderInput").value = "";
    $("newFolderRow").hidden = true;
    toast(t.toastFolderCreated);
  } catch (_) { toast(t.toastError, true); }
}

/** "Bookmark this page": bookmark the active tab, then open it for tagging. */
async function bookmarkCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url && normalizeUrl(tab.url);
  if (!url || !/^(https?|ftp|file):/i.test(tab.url)) { toast(t.toastNoPage, true); return; }
  const existing = bookmarks.find((b) => b.url === tab.url || b.url === url);
  if (existing) { openEdit(existing.id); return; }

  editingId = null;
  $("editTitleInput").value = tab.title || url;
  $("editUrlInput").value = tab.url;
  const folderIds = flattenFolders(folderTree).map((f) => f.id);
  const bar = folderTree[0]?.children?.[0]?.id;
  $("editFolderSelect").value = folderIds.includes(settings.lastFolderId) ? settings.lastFolderId : (bar || folderIds[0]);
  $("noteInput").value = "";
  $("deleteBookmarkBtn").hidden = true;
  resetEditUi();
  renderTagPills([]);
  showScreen("edit");
  $("tagInput").focus();
}

// ── Settings UI ─────────────────────────────────────────────

function buildSwatches() {
  const wrap = $("swatches");
  wrap.innerHTML = MD_COLORS.map((c) => {
    const name = i18n.current === "vi" ? c.vi : c.en;
    const light = ["yellow", "lime", "amber", "lightGreen"].includes(c.id);
    return `<button class="swatch${light ? " dark-ink" : ""}" role="radio" data-color="${c.id}" aria-checked="${settings.color === c.id}" aria-label="${esc(name)}" title="${esc(name)}" style="background:${c.hex}">${icon("check", 16)}</button>`;
  }).join("");
}

function syncSettingsUI() {
  document.querySelectorAll("#themeSeg .seg-btn").forEach((b) => {
    const on = b.dataset.value === settings.theme;
    b.classList.toggle("active", on); b.setAttribute("aria-checked", on);
  });
  document.querySelectorAll("#langSeg .seg-btn").forEach((b) => {
    const on = b.dataset.value === settings.language;
    b.classList.toggle("active", on); b.setAttribute("aria-checked", on);
  });
  document.querySelectorAll("#swatches .swatch").forEach((b) => b.setAttribute("aria-checked", b.dataset.color === settings.color));
}

function openLanding() {
  const p = new URLSearchParams({ lang: i18n.current, theme: themeManager.isDark() ? "dark" : "light", color: settings.color });
  chrome.tabs.create({ url: `${chrome.runtime.getURL(LANDING_PATH)}?${p}` });
}

// ── Export / import / reset ─────────────────────────────────

const dateStamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`; };

function downloadBlob(content, filename, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJson() {
  const data = {
    app: "TagMark", schemaVersion: 2, exportedAt: new Date().toISOString(), settings,
    bookmarks: bookmarks.map((b) => ({ url: b.url, title: b.title, path: b.path, tags: (metaMap[b.id] || {}).tags || [], note: (metaMap[b.id] || {}).note || "" }))
  };
  downloadBlob(JSON.stringify(data, null, 2), `tagmark-backup-${dateStamp()}.json`, "application/json");
  toast(t.toastExported);
}

/** Standard Netscape bookmarks file with real nested folders (readable by every browser). */
function exportHtml() {
  let out = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n`;
  (function walk(node, depth) {
    const pad = "    ".repeat(depth);
    (node.children || []).forEach((c) => {
      const date = Math.round((c.dateAdded || 0) / 1000);
      if (c.url) out += `${pad}<DT><A HREF="${esc(c.url)}" ADD_DATE="${date}">${esc(c.title || c.url)}</A>\n`;
      else { out += `${pad}<DT><H3 ADD_DATE="${date}">${esc(c.title)}</H3>\n${pad}<DL><p>\n`; walk(c, depth + 1); out += `${pad}</DL><p>\n`; }
    });
  })({ children: folderTree }, 1);
  out += `</DL><p>\n`;
  downloadBlob(out, `tagmark-bookmarks-${dateStamp()}.html`, "text/html");
  toast(t.toastExported);
}

async function importJsonFile(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.bookmarks)) throw new Error("bad format");
    let created = 0, merged = 0, importFolderId = null;
    const byUrl = new Map(bookmarks.map((b) => [b.url, b.id]));
    const entries = [];
    for (const item of data.bookmarks) {
      const url = item && item.url && normalizeUrl(String(item.url));
      if (!url) continue;
      const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
      const note = typeof item.note === "string" ? item.note : "";
      const existingId = byUrl.get(url) || byUrl.get(item.url);
      if (existingId) {
        const m = metaMap[existingId] || { tags: [], note: "" };
        entries.push([existingId, { tags: [...new Set([...(m.tags || []), ...tags])], note: m.note && m.note.trim() ? m.note : note }]);
        merged++;
      } else {
        if (!importFolderId) importFolderId = await ensureImportFolder();
        const bm = await chrome.bookmarks.create({ parentId: importFolderId, title: item.title || url, url });
        byUrl.set(url, bm.id);
        entries.push([bm.id, { tags, note }]);
        created++;
      }
    }
    await store.setMetaMany(entries);
    toast(t.toastImported(created, merged));
    await loadEverything();
  } catch (_) { toast(t.toastImportFailed, true); }
}

async function ensureImportFolder() {
  const found = flattenFolders(folderTree).find((f) => f.title === "TagMark Import");
  if (found) return found.id;
  return (await chrome.bookmarks.create({ parentId: folderTree[0]?.children?.[0]?.id, title: "TagMark Import" })).id;
}

async function resetData() {
  const ok = await askConfirm({ title: t.resetTitle, message: t.resetConfirm, okText: t.reset, danger: true });
  if (!ok) return;
  settings = await store.resetSettings();
  await store.saveAllMeta({});
  themeManager.apply(settings.theme, settings.color);
  currentView = settings.defaultView; currentSort = settings.defaultSort;
  $("sortSelect").value = currentSort;
  searchQuery = ""; $("searchInput").value = ""; currentTagFilter = ""; currentFolderId = "";
  updateViewToggle();
  setLanguage(resolveLang(settings));
  toast(t.toastReset);
  showScreen("list");
  await loadEverything();
}

// ── Menu ────────────────────────────────────────────────────

function closeMenu() { $("moreMenu").hidden = true; $("moreBtn").setAttribute("aria-expanded", "false"); }
function updateViewToggle() {
  $("viewListBtn").classList.toggle("active", currentView === "list");
  $("viewGridBtn").classList.toggle("active", currentView === "grid");
  $("viewListBtn").setAttribute("aria-pressed", currentView === "list");
  $("viewGridBtn").setAttribute("aria-pressed", currentView === "grid");
}

// ── Events ──────────────────────────────────────────────────

function bindEvents() {
  $("addPageBtn").addEventListener("click", bookmarkCurrentPage);

  let debounce;
  $("searchInput").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { searchQuery = e.target.value; renderList(false); }, 100);
  });
  $("clearSearchBtn").addEventListener("click", () => { $("searchInput").value = ""; searchQuery = ""; renderList(false); $("searchInput").focus(); });
  $("folderFilterSelect").addEventListener("change", (e) => { currentFolderId = e.target.value; renderList(true); });
  $("sortSelect").addEventListener("change", (e) => { currentSort = e.target.value; store.patchSettings({ defaultSort: currentSort }); renderList(true); });

  const setView = (v) => { currentView = v; settings.defaultView = v; store.patchSettings({ defaultView: v }); updateViewToggle(); renderList(true); };
  $("viewListBtn").addEventListener("click", () => setView("list"));
  $("viewGridBtn").addEventListener("click", () => setView("grid"));

  $("tagRow").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    if (chip.dataset.dup) showDuplicatesOnly = !showDuplicatesOnly;
    else currentTagFilter = currentTagFilter === chip.dataset.tag ? "" : chip.dataset.tag;
    renderTagRow(); renderList(false);
  });

  // List interactions (event delegation — one listener for every row)
  const list = $("bookmarkList");
  list.addEventListener("click", (e) => {
    const item = e.target.closest(".bookmark-item");
    if (!item) return;
    const id = item.dataset.id;
    const b = bookmarks.find((x) => x.id === id);
    if (!b) return;
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "edit") return openEdit(id);
    if (action === "copy") return copyUrl(b.url);
    if (selectMode) {
      selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
      const fresh = buildItem(b, 0);
      item.replaceWith(fresh);
      updateBulkBar();
    } else {
      chrome.tabs.create({ url: b.url });
      window.close();
    }
  });
  list.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("bookmark-item")) { e.preventDefault(); e.target.click(); }
  });
  list.addEventListener("error", (e) => { if (e.target.matches && e.target.matches("img[data-fav]")) fallbackIcon(e.target); }, true);

  $("selectModeBtn").addEventListener("click", () => setSelectMode(!selectMode));
  $("bulkSelectAllBtn").addEventListener("click", () => {
    const visible = getFilteredSorted();
    const all = visible.every((b) => selectedIds.has(b.id));
    visible.forEach((b) => (all ? selectedIds.delete(b.id) : selectedIds.add(b.id)));
    renderList(false);
  });
  $("bulkTagBtn").addEventListener("click", bulkAddTag);
  $("bulkDeleteBtn").addEventListener("click", bulkDelete);

  // Menu
  $("moreBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const open = $("moreMenu").hidden;
    $("moreMenu").hidden = !open;
    $("moreBtn").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".menu-anchor")) closeMenu(); });
  $("exportJsonBtn").addEventListener("click", () => { closeMenu(); exportJson(); });
  $("exportHtmlBtn").addEventListener("click", () => { closeMenu(); exportHtml(); });
  $("importJsonBtn").addEventListener("click", () => { closeMenu(); $("importJsonFile").click(); });
  $("importJsonFile").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importJsonFile(f); e.target.value = ""; });
  $("resetBtn").addEventListener("click", () => { closeMenu(); resetData(); });

  // Navigation
  $("settingsBtn").addEventListener("click", () => showScreen("settings"));
  $("backBtn").addEventListener("click", () => { editingId = null; showScreen("list"); });
  $("cancelEditBtn").addEventListener("click", () => { editingId = null; showScreen("list"); });

  // Edit form
  $("saveBookmarkBtn").addEventListener("click", saveEdit);
  $("deleteBookmarkBtn").addEventListener("click", deleteCurrent);
  $("newFolderToggleBtn").addEventListener("click", () => { $("newFolderRow").hidden = !$("newFolderRow").hidden; if (!$("newFolderRow").hidden) $("newFolderInput").focus(); });
  $("createFolderBtn").addEventListener("click", createFolderInline);
  $("newFolderInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); createFolderInline(); } });
  $("editUrlInput").addEventListener("input", (e) => e.target.closest(".field").classList.remove("invalid"));
  ["editTitleInput", "editUrlInput"].forEach((id) => $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") saveEdit(); }));
  $("tagsInputWrap").addEventListener("click", (e) => { if (e.target === $("tagsInputWrap")) $("tagInput").focus(); });
  $("tagPills").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-i]");
    if (btn) { pendingTags.splice(Number(btn.dataset.i), 1); renderTagPills(pendingTags); }
  });
  $("tagInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addPendingTag(e.target.value); e.target.value = ""; }
    else if (e.key === "Backspace" && !e.target.value && pendingTags.length) { pendingTags.pop(); renderTagPills(pendingTags); }
  });
  $("tagInput").addEventListener("change", (e) => {
    // Picking a datalist suggestion fires "change" with a full value.
    if (pendingTags.length || e.target.value) { addPendingTag(e.target.value); e.target.value = ""; }
  });

  // Settings
  $("swatches").addEventListener("click", async (e) => {
    const b = e.target.closest(".swatch");
    if (!b) return;
    settings.color = b.dataset.color;
    themeManager.apply(settings.theme, settings.color);
    syncSettingsUI();
    store.patchSettings({ color: settings.color });
  });
  $("themeSeg").addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn");
    if (!b) return;
    settings.theme = b.dataset.value;
    themeManager.apply(settings.theme, settings.color);
    syncSettingsUI();
    store.patchSettings({ theme: settings.theme });
  });
  $("langSeg").addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn");
    if (!b) return;
    settings.language = b.dataset.value;
    setLanguage(resolveLang(settings));
    store.patchSettings({ language: settings.language });
  });
  $("openLandingBtn").addEventListener("click", openLanding);
  $("manageShortcutsBtn").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

  // Dialog
  $("dialogOk").addEventListener("click", () => dialogResolve && dialogResolve($("dialogField").hidden ? true : $("dialogInput").value));
  $("dialogCancel").addEventListener("click", () => dialogResolve && dialogResolve($("dialogField").hidden ? false : null));
  $("scrim").addEventListener("mousedown", (e) => { if (e.target === $("scrim") && dialogResolve) dialogResolve($("dialogField").hidden ? false : null); });
  $("dialogInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("dialogOk").click(); });

  // Global keys
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("scrim").hidden) return $("dialogCancel").click();
    if (!$("moreMenu").hidden) return closeMenu();
    if (activeScreen !== "list") { editingId = null; return showScreen("list"); }
    if (selectMode) return setSelectMode(false);
  });
}

async function copyUrl(url) {
  try { await navigator.clipboard.writeText(url); toast(t.toastUrlCopied); }
  catch (_) { toast(t.toastError, true); }
}

init();
