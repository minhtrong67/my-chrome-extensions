/**
 * content.js — injected into youtube.com at document_start.
 *
 * Strategy: own a single <style> element and keep its text in sync with the
 * saved settings. A stylesheet keeps matching every node YouTube renders later
 * (it is a single-page app that re-renders constantly), so there is no
 * MutationObserver, no per-element work and nothing to re-apply on navigation.
 *
 * Flash-free start: the generated CSS is cached in localStorage and applied
 * synchronously, before the async chrome.storage read returns, so the grid
 * doesn't visibly jump from YouTube's default layout to yours on every load.
 *
 * Requires storage.js (loaded first, see manifest.json) for DEFAULT_SETTINGS
 * and sanitize().
 */
(() => {
  if (window.__ygLoaded) return; // guard against double injection
  window.__ygLoaded = true;

  const STYLE_ID = "yg-style";
  const CACHE_KEY = "yg_css_cache";
  const GRID = "ytd-rich-grid-renderer";
  const TOP = "#contents.ytd-rich-grid-renderer"; // the renderer's own #contents

  // Cards never get narrower than this, so a high column count degrades to
  // fewer columns on small windows instead of crushing the thumbnails.
  const MIN_CARD = "170px";
  const GAP = "16px";

  /** Grid rules for one page scope, with `n` columns at most. */
  function columnRule(scope, n) {
    const track = `minmax(max(${MIN_CARD}, calc((100% - ${n - 1} * var(--yg-gap)) / ${n} - 1px)), 1fr)`;
    return `
      ${scope} {
        --yg-gap: ${GAP};
        --ytd-rich-grid-items-per-row: ${n} !important;
        --ytd-rich-grid-posts-per-row: ${n} !important;
      }
      ${scope} ${TOP} {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, ${track}) !important;
        column-gap: var(--yg-gap) !important;
      }
      ${scope} ${TOP} > ytd-rich-grid-row,
      ${scope} ${TOP} > ytd-rich-grid-row > #contents {
        display: contents !important;
      }
      ${scope} ${TOP} ytd-rich-item-renderer {
        width: auto !important;
        max-width: none !important;
        margin: 0 !important;
      }
      ${scope} ${TOP} > :is(
        ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer,
        ytd-continuation-item-renderer, ytd-feed-nudge-renderer, ytd-statement-banner-renderer
      ) {
        grid-column: 1 / -1 !important;
      }
    `;
  }

  /** Translate settings into the complete CSS payload. */
  function buildCss(s) {
    if (!s.enabled) return "";
    let css = "";

    if (s.useCustomColumns) {
      if (s.perPageColumns) {
        css += columnRule(`ytd-browse[page-subtype="home"] ${GRID}`, s.columnsHome);
        css += columnRule(`ytd-browse[page-subtype="subscriptions"] ${GRID}`, s.columnsSubscriptions);
        css += columnRule(`ytd-browse[page-subtype="channel"] ${GRID}`, s.columnsChannel);
      } else {
        css += columnRule(GRID, s.columns);
      }
    }

    if (s.hideShorts) {
      css += `
        ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer,
        ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model),
        ytd-video-renderer:has(a#thumbnail[href^="/shorts/"]),
        ytd-guide-entry-renderer:has(a[title="Shorts"]),
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        yt-tab-shape[tab-title="Shorts"] {
          display: none !important;
        }
      `;
    }

    if (s.compactCards) {
      css += `
        ytd-rich-grid-media #metadata-line,
        ytd-rich-grid-media #description-text,
        ytd-rich-grid-media #avatar-link,
        ytd-rich-grid-media ytd-channel-name,
        ytd-rich-item-renderer [class*="metadata-view-model"][class*="avatar"],
        ytd-rich-item-renderer yt-content-metadata-view-model {
          display: none !important;
        }
        ytd-rich-grid-media #details { margin-top: 4px !important; }
      `;
    }

    if (s.hideComments) {
      css += `ytd-comments#comments { display: none !important; }`;
    }

    if (s.hideEndCards) {
      css += `
        .ytp-ce-element,
        .ytp-endscreen-content,
        .ytp-ce-covering-overlay { display: none !important; }
      `;
    }

    if (s.focusMode) {
      css += `
        #secondary.ytd-watch-flexy { display: none !important; }
        #primary.ytd-watch-flexy { max-width: 100% !important; margin: 0 auto !important; }
      `;
    }

    return css.replace(/\s+/g, " ").trim();
  }

  function ensureStyleTag() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement("style");
      tag.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(tag);
    }
    return tag;
  }

  let applied = null;
  function applyCss(css) {
    if (css === applied && document.getElementById(STYLE_ID)) return;
    applied = css;
    ensureStyleTag().textContent = css;
    try { localStorage.setItem(CACHE_KEY, css); } catch (e) { /* storage blocked */ }
  }

  function applySettings(raw) {
    applyCss(buildCss(sanitize(raw)));
  }

  // 1) Instant: last known CSS, before any async work.
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) { applied = cached; ensureStyleTag().textContent = cached; }
  } catch (e) { /* ignore */ }

  // 2) Authoritative: the saved settings.
  const load = () => chrome.storage.local.get([SETTINGS_KEY], (r) => applySettings(r[SETTINGS_KEY]));
  load();
  // <head> may not exist yet at document_start; re-check once the DOM is parsed
  // in case YouTube replaced it, so the style tag is guaranteed to be attached.
  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById(STYLE_ID)) ensureStyleTag().textContent = applied || "";
  }, { once: true });

  // 3) Live: changes from the popup / options page (or another synced device).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[SETTINGS_KEY]) applySettings(changes[SETTINGS_KEY].newValue);
  });
})();
