// Regenerates the Material Design 3 color schemes used by TubeShot.
//   npm install --no-save @material/material-color-utilities@0.3.0
//   node scripts/generate-palettes.cjs
// Writes css/palettes.css and refreshes the same block inlined in index.html.
const fs = require("fs");
const path = require("path");
const { argbFromHex, hexFromArgb, MaterialDynamicColors, SchemeVibrant, Hct } = require("@material/material-color-utilities");

const COLORS = [
  ["red", "#F44336"], ["pink", "#E91E63"], ["purple", "#9C27B0"], ["deep-purple", "#673AB7"],
  ["indigo", "#3F51B5"], ["blue", "#2196F3"], ["light-blue", "#03A9F4"], ["cyan", "#00BCD4"],
  ["teal", "#009688"], ["green", "#4CAF50"], ["light-green", "#8BC34A"], ["lime", "#CDDC39"],
  ["yellow", "#FFEB3B"], ["amber", "#FFC107"], ["orange", "#FF9800"], ["deep-orange", "#FF5722"],
  ["brown", "#795548"], ["blue-grey", "#607D8B"]
];
const ROLES = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "secondaryContainer", "onSecondaryContainer",
  "surface", "surfaceContainerLow", "surfaceContainer", "surfaceContainerHigh", "onSurface", "onSurfaceVariant",
  "outline", "outlineVariant", "inverseSurface", "inverseOnSurface", "error", "onError", "errorContainer", "onErrorContainer"
];
const kebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

let css = "/* Generated from Material You tonal palettes (material-color-utilities, Vibrant). Do not edit by hand. */\n";
for (const [key, hex] of COLORS) {
  for (const dark of [false, true]) {
    const scheme = new SchemeVibrant(Hct.fromInt(argbFromHex(hex)), dark, 0);
    const decls = ROLES.map((r) => `--md-${kebab(r)}:${hexFromArgb(MaterialDynamicColors[r].getArgb(scheme)).toLowerCase()}`).join(";");
    css += `[data-color="${key}"][data-theme="${dark ? "dark" : "light"}"]{${decls}}\n`;
  }
}

const root = path.join(__dirname, "..");
fs.writeFileSync(path.join(root, "css", "palettes.css"), css);

const landing = path.join(root, "index.html");
let html = fs.readFileSync(landing, "utf8");
const re = /\/\* Generated from Material You[\s\S]*?(?=\n\/\* ===== TubeShot landing)/;
if (re.test(html)) {
  fs.writeFileSync(landing, html.replace(re, () => css.trimEnd()));
  console.log("Updated css/palettes.css and index.html");
} else {
  console.log("Updated css/palettes.css (palette block not found in index.html)");
}
