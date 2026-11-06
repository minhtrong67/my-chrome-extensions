# Changelog

## 0.5.2
- **Lower memory:** the generic cosmetic list (~13,000 `.class` / `#id` selectors) is no longer loaded as static CSS into every tab (≈ 5 MB per tab). The page now only asks for the classes/ids it actually contains, so per-tab cost drops to about 1 MB. Static CSS shrank from 210 KB to 18 KB; the 433 KB `generic.json` read became 51 KB.
- Element hiding of elements added later or whose class changes keeps working (`tests/lazy-generic.cjs`).
- `tests/memory-rss.cjs` measures extension-process memory against an empty extension.

## 0.5.1
- ABPVN supplement (`lists/vn.txt`): third-party Admicro/eClick ad & logging hosts; the build now merges `lists/<id>.txt` into every extra list.
- `tests/corpus-url.cjs` (`npm run test:corpus`): measures block rate and false positives with Chrome's own `testMatchOutcome` on 40 ad/tracker URLs and 45 clean URLs.

## 0.5.0
- **Filter lists:** added ABPVN (Vietnam), uBlock filters (filters, privacy, badware, unbreak, quick-fixes) and AdGuard Base (off by default); each list toggles independently.
- **Scriptlets:** new engine with the most common uBlock scriptlets (set, aopr/aopw, json-prune, json-prune-fetch/xhr-response, nowoif, nostif/nosiif, aeld, noeval, …), scoped per site; can be switched off.
- **Filter compiler:** `$all`, `$to`, `$denyallow`, `$removeparam`, `$redirect`, `$badfilter`, `$method`; rules using unsupported syntax are skipped instead of being widened.
- **“Page broken?”** in the popup: Full / Network-only / Off per site, plus a copyable diagnostic report.
- **Fewer permissions:** `webRequest` is now optional (block log & statistics only); `webNavigation` removed.
- **Safety fixes:** entity domains (`example.*`) no longer turn site-specific cosmetic rules into global ones; scriptlets without a domain and unscoped “allow” rules are rejected; `tools/audit-rulesets.mjs` checks every built ruleset.
- **Accessibility:** axe-core reports no violations on popup, settings and landing page in light and dark.

## 0.4.1
- Fixed section spacing, horizontal scrollbar caused by the glow animation, and smooth scroll-to-top.

## 0.4.0
- Settings: light/dark/system, 19 Material colors, text size, language, custom font dropdown, accordions, toasts, tooltips, scroll-to-top, README.

## 0.3.0
- Typography, language (EN/VI), author card, landing page, Lucide icons.

## 0.2.x
- Block log, per-domain allow, list auto-update, YouTube scriptlet, statistics, element zapper shortcut.
