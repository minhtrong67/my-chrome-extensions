const DEFAULTS = {
  defaultFormat: "png",
  quality: 92,
  background: "#ffffff",
  saveAs: false,
  menuMode: "quick",
};

const $ = (id) => document.getElementById(id);
const quality = $("quality");
const qualityValue = $("qualityValue");
const background = $("background");
const swatchChip = $("swatchChip");
const saveAs = $("saveAs");
const saved = $("saved");
let savedTimer;

function paintQuality() {
  qualityValue.textContent = `${quality.value}%`;
  const pct = ((quality.value - quality.min) / (quality.max - quality.min)) * 100;
  quality.style.setProperty("--pct", `${pct}%`);
}

function paintSwatch() {
  swatchChip.style.background = background.value;
}

function flashSaved() {
  saved.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => saved.classList.remove("show"), 1200);
}

async function save(patch) {
  await chrome.storage.sync.set(patch);
  flashSaved();
}

async function init() {
  const s = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };

  const radio = document.querySelector(`input[name="format"][value="${s.defaultFormat}"]`);
  (radio || document.querySelector('input[name="format"][value="png"]')).checked = true;

  const modeRadio = document.querySelector(`input[name="menuMode"][value="${s.menuMode}"]`);
  (modeRadio || document.querySelector('input[name="menuMode"][value="quick"]')).checked = true;
  document.querySelectorAll('input[name="menuMode"]').forEach((r) =>
    r.addEventListener("change", () => r.checked && save({ menuMode: r.value }))
  );

  quality.value = s.quality;
  background.value = s.background;
  saveAs.checked = !!s.saveAs;
  paintQuality();
  paintSwatch();

  document.querySelectorAll('input[name="format"]').forEach((r) =>
    r.addEventListener("change", () => r.checked && save({ defaultFormat: r.value }))
  );
  quality.addEventListener("input", paintQuality);
  quality.addEventListener("change", () => save({ quality: Number(quality.value) }));
  background.addEventListener("input", paintSwatch);
  background.addEventListener("change", () => save({ background: background.value }));
  saveAs.addEventListener("change", () => save({ saveAs: saveAs.checked }));
}

// Reveal highlight theo con trỏ chuột
document.querySelectorAll(".reveal").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  });
});

init();
