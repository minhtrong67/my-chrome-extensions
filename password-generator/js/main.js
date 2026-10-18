// LockSmith — main script
// Author: gnort67

let settings = { ...DEFAULT_SETTINGS };
let currentValue = "";
let currentPoolSize = 0; // real character-pool size from the last password generation, for accurate strength scoring

const el = (id) => document.getElementById(id);

const refs = {
  viewGenerator: el("view-generator"),
  viewSettings: el("view-settings"),
  settingsBtn: el("settingsBtn"),
  backBtn: el("backBtn"),
  langToggleBtn: el("langToggleBtn"),
  themeToggleBtn: el("themeToggleBtn"),

  modeTabs: document.querySelectorAll(".mode-tab"),
  passwordOptions: el("passwordOptions"),
  passphraseOptions: el("passphraseOptions"),
  pinOptions: el("pinOptions"),

  resultText: el("resultText"),
  copyBtn: el("copyBtn"),
  regenBtn: el("regenBtn"),
  generateBtn: el("generateBtn"),

  strengthWrap: el("strengthWrap"),
  strengthFill: el("strengthFill"),
  strengthLabel: el("strengthLabel"),
  crackTimeText: el("crackTimeText"),

  lengthSlider: el("lengthSlider"),
  lengthValue: el("lengthValue"),
  optUpper: el("optUpper"),
  optLower: el("optLower"),
  optNumbers: el("optNumbers"),
  optSymbols: el("optSymbols"),
  advancedToggle: el("advancedToggle"),
  advancedPanel: el("advancedPanel"),
  optExcludeAmbiguous: el("optExcludeAmbiguous"),
  optNoDuplicate: el("optNoDuplicate"),
  customExclude: el("customExclude"),

  wordCountSlider: el("wordCountSlider"),
  wordCountValue: el("wordCountValue"),
  separatorSelect: el("separatorSelect"),
  optCapitalize: el("optCapitalize"),
  optAddNumber: el("optAddNumber"),

  pinLengthSlider: el("pinLengthSlider"),
  pinLengthValue: el("pinLengthValue"),

  historyCard: el("historyCard"),
  historyList: el("historyList"),
  clearHistoryBtn: el("clearHistoryBtn"),
  exportHistoryBtn: el("exportHistoryBtn"),

  themeSelect: el("themeSelect"),
  colorSelect: el("colorSelect"),
  fontSizeSelect: el("fontSizeSelect"),
  languageSelect: el("languageSelect"),
  optShowStrength: el("optShowStrength"),
  optShowHistory: el("optShowHistory"),
  historyLimitSelect: el("historyLimitSelect"),

  exportBtn: el("exportBtn"),
  importBtn: el("importBtn"),
  importFile: el("importFile"),
  resetBtn: el("resetBtn"),
  aboutBtn: el("aboutBtn"),
  landingBtn: el("landingBtn"),
  creditsDialog: el("creditsDialog"),
  closeCreditsBtn: el("closeCreditsBtn"),
  closeCreditsBtn2: el("closeCreditsBtn2"),

  toast: el("toast")
};

let toastTimer = null;
function showToast(key) {
  refs.toast.textContent = i18n.t(key);
  refs.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2000);
}

function currentOptions() {
  return {
    length: parseInt(refs.lengthSlider.value, 10),
    upper: refs.optUpper.checked,
    lower: refs.optLower.checked,
    numbers: refs.optNumbers.checked,
    symbols: refs.optSymbols.checked,
    excludeAmbiguous: refs.optExcludeAmbiguous.checked,
    noDuplicate: refs.optNoDuplicate.checked,
    customExclude: refs.customExclude.value,
    wordCount: parseInt(refs.wordCountSlider.value, 10),
    separator: refs.separatorSelect.value,
    capitalize: refs.optCapitalize.checked,
    addNumber: refs.optAddNumber.checked,
    pinLength: parseInt(refs.pinLengthSlider.value, 10)
  };
}

/** 5 distinct strength levels (Weak / Fair / Good / Strong / Very strong),
 *  each with its own color and fill percentage. Uses the ACTUAL character
 *  pool size for password mode (via currentPoolSize, populated by
 *  doGenerate from the generator's own accounting) rather than guessing —
 *  so toggling "exclude ambiguous characters" or a custom exclude list is
 *  correctly reflected in the score instead of silently ignored. */
function updateStrength(value, mode) {
  if (!settings.showStrength) {
    refs.strengthWrap.classList.add("hidden");
    return;
  }
  refs.strengthWrap.classList.remove("hidden");

  const score = generator.scoreStrength(value, mode, { poolSize: currentPoolSize });
  const pct = [6, 28, 52, 76, 100][score];
  const colors = ["var(--md-error)", "var(--md-error)", "var(--md-warning)", "var(--md-success)", "var(--md-success)"];
  const labels = ["strengthWeak", "strengthFair", "strengthGood", "strengthStrong", "strengthVeryStrong"];
  refs.strengthFill.style.width = pct + "%";
  refs.strengthFill.style.background = colors[score];
  refs.strengthLabel.textContent = i18n.t(labels[score]);

  if (value) {
    const bits = generator.estimateEntropyBits(value, mode, { poolSize: currentPoolSize });
    refs.crackTimeText.textContent = generator.formatCrackTime(bits, (k, n) => i18n.t(k, n));
  } else {
    refs.crackTimeText.textContent = "—";
  }
}

async function doGenerate(persistHistory = true) {
  const opts = currentOptions();
  const mode = settings.mode;
  const out = mode === "passphrase" ? generator.generatePassphrase(opts)
            : mode === "pin"        ? generator.generatePin(opts)
            : generator.generatePassword(opts);

  if (out.error) {
    refs.resultText.textContent = "—";
    currentValue = "";
    currentPoolSize = 0;
    showToast(out.error);
    updateStrength("", mode);
    return;
  }

  currentValue = out.value;
  currentPoolSize = out.poolSize || 0;
  refs.resultText.textContent = out.value;
  updateStrength(out.value, mode);

  // A noDuplicate password that ran out of unique characters is silently
  // shorter than what the user asked for — that's a security-relevant
  // surprise, not just a cosmetic one, so it always gets a toast even
  // though this call may not persist to history.
  if (out.warning) showToast(out.warning);

  // Respect "Save recent history" fully: when it's off, nothing gets
  // written to storage at all (previously this only hid the history
  // panel while still silently saving every generated value underneath).
  if (persistHistory && settings.showHistory) {
    const history = await store.addToHistory(out.value, settings.historyLimit);
    renderHistory(history);
  }
}

function renderHistory(history) {
  refs.historyList.innerHTML = "";
  if (!history || history.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = i18n.t("historyEmpty");
    li.style.cursor = "default";
    li.style.background = "transparent";
    refs.historyList.appendChild(li);
    return;
  }
  history.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.value;
    li.title = i18n.t("copy");
    li.addEventListener("click", () => copyValue(item.value));
    refs.historyList.appendChild(li);
  });
}

async function copyValue(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("toastCopied");
    flashCopyFeedback();
  } catch (e) {
    showToast("toastCopyFailed");
  }
}

/** Briefly swap the main copy button's icon to a checkmark so copying feels
 *  instantly confirmed, without relying on the user noticing the toast. */
let copyFlashTimer = null;
function flashCopyFeedback() {
  clearTimeout(copyFlashTimer);
  refs.copyBtn.classList.add("is-copied");
  copyFlashTimer = setTimeout(() => refs.copyBtn.classList.remove("is-copied"), 1400);
}

function persistSettings() {
  store.saveSettings(settings);
}

function applySettingsToUI() {
  refs.lengthSlider.value = settings.length;
  refs.lengthValue.textContent = settings.length;
  refs.optUpper.checked = settings.optUpper;
  refs.optLower.checked = settings.optLower;
  refs.optNumbers.checked = settings.optNumbers;
  refs.optSymbols.checked = settings.optSymbols;
  refs.optExcludeAmbiguous.checked = settings.excludeAmbiguous;
  refs.optNoDuplicate.checked = settings.noDuplicate;
  refs.customExclude.value = settings.customExclude;

  refs.wordCountSlider.value = settings.wordCount;
  refs.wordCountValue.textContent = settings.wordCount;
  refs.separatorSelect.value = settings.separator;
  refs.optCapitalize.checked = settings.capitalize;
  refs.optAddNumber.checked = settings.addNumber;

  refs.pinLengthSlider.value = settings.pinLength;
  refs.pinLengthValue.textContent = settings.pinLength;

  refs.themeSelect.value = settings.theme;
  refs.colorSelect.value = settings.color || "teal";
  refs.fontSizeSelect.value = settings.fontSize;
  refs.languageSelect.value = settings.language;
  refs.optShowStrength.checked = settings.showStrength;
  refs.optShowHistory.checked = settings.showHistory;
  refs.historyLimitSelect.value = String(settings.historyLimit);

  refs.historyCard.classList.toggle("hidden", !settings.showHistory);

  refs.modeTabs.forEach((tab) => {
    const active = tab.dataset.mode === settings.mode;
    tab.classList.toggle("active", active);
  });
  refs.passwordOptions.classList.toggle("hidden", settings.mode !== "password");
  refs.passphraseOptions.classList.toggle("hidden", settings.mode !== "passphrase");
  refs.pinOptions.classList.toggle("hidden", settings.mode !== "pin");

  const genLabelKey = settings.mode === "passphrase" ? "generatePassphrase"
                     : settings.mode === "pin"        ? "generatePin"
                     : "generate";
  refs.generateBtn.setAttribute("data-i18n", genLabelKey);
  refs.generateBtn.textContent = i18n.t(genLabelKey);
}

/* ============ Event wiring ============ */

refs.settingsBtn.addEventListener("click", () => {
  refs.viewGenerator.classList.add("hidden");
  refs.viewSettings.classList.remove("hidden");
});
refs.backBtn.addEventListener("click", () => {
  refs.viewSettings.classList.add("hidden");
  refs.viewGenerator.classList.remove("hidden");
});

refs.langToggleBtn.addEventListener("click", () => {
  const next = settings.language === "en" ? "vi" : "en";
  settings.language = next;
  i18n.setLang(next);
  applySettingsToUI();
  updateStrength(currentValue, settings.mode);
  persistSettings();
});

refs.themeToggleBtn.addEventListener("click", () => {
  const next = themeManager.cycle();
  settings.theme = next;
  refs.themeSelect.value = next;
  persistSettings();
});

refs.modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    settings.mode = tab.dataset.mode;
    applySettingsToUI();
    persistSettings();
    doGenerate(false);
  });
});

refs.lengthSlider.addEventListener("input", () => {
  refs.lengthValue.textContent = refs.lengthSlider.value;
  settings.length = parseInt(refs.lengthSlider.value, 10);
});
refs.lengthSlider.addEventListener("change", () => { persistSettings(); doGenerate(false); });

refs.wordCountSlider.addEventListener("input", () => {
  refs.wordCountValue.textContent = refs.wordCountSlider.value;
  settings.wordCount = parseInt(refs.wordCountSlider.value, 10);
});
refs.wordCountSlider.addEventListener("change", () => { persistSettings(); doGenerate(false); });

refs.pinLengthSlider.addEventListener("input", () => {
  refs.pinLengthValue.textContent = refs.pinLengthSlider.value;
  settings.pinLength = parseInt(refs.pinLengthSlider.value, 10);
});
refs.pinLengthSlider.addEventListener("change", () => { persistSettings(); doGenerate(false); });

[
  ["optUpper", "optUpper"], ["optLower", "optLower"], ["optNumbers", "optNumbers"], ["optSymbols", "optSymbols"],
  ["optExcludeAmbiguous", "excludeAmbiguous"], ["optNoDuplicate", "noDuplicate"],
  ["optCapitalize", "capitalize"], ["optAddNumber", "addNumber"]
].forEach(([refKey, settingKey]) => {
  refs[refKey].addEventListener("change", () => {
    settings[settingKey] = refs[refKey].checked;
    persistSettings();
    doGenerate(false);
  });
});

refs.customExclude.addEventListener("input", () => {
  settings.customExclude = refs.customExclude.value;
});
refs.customExclude.addEventListener("change", () => { persistSettings(); doGenerate(false); });

refs.separatorSelect.addEventListener("change", () => {
  settings.separator = refs.separatorSelect.value;
  persistSettings();
  doGenerate(false);
});

refs.advancedToggle.addEventListener("click", () => {
  refs.advancedToggle.classList.toggle("open");
  refs.advancedPanel.classList.toggle("open");
});

refs.generateBtn.addEventListener("click", () => doGenerate(true));
refs.regenBtn.addEventListener("click", () => doGenerate(true));
refs.copyBtn.addEventListener("click", () => { if (currentValue) copyValue(currentValue); });

/**
 * Chrome extension popups are lightweight, auto-closing overlay windows —
 * window.confirm()/prompt() are unreliable there (some Chrome versions
 * silently no-op them, and a popup can lose focus and close the instant a
 * native modal would try to render, since popups close on any blur). So
 * destructive actions use a two-step "arm, then confirm" pattern entirely
 * within the page instead: the first click turns the button into a
 * "Click again to confirm" warning state for a few seconds; a second click
 * within that window actually runs the action, and letting it time out
 * safely cancels. This works identically everywhere popups do.
 */
function armDestructiveAction(btn, normalKey, confirmKey, onConfirm) {
  let armed = false;
  let armTimer = null;

  function disarm() {
    armed = false;
    clearTimeout(armTimer);
    btn.classList.remove("is-armed");
    btn.textContent = i18n.t(normalKey);
  }

  return () => {
    if (!armed) {
      armed = true;
      btn.classList.add("is-armed");
      btn.textContent = i18n.t(confirmKey);
      armTimer = setTimeout(disarm, 3000);
    } else {
      disarm();
      onConfirm();
    }
  };
}

refs.clearHistoryBtn.addEventListener("click", armDestructiveAction(refs.clearHistoryBtn, "clear", "confirmClickAgain", async () => {
  await store.clearHistory();
  renderHistory([]);
  showToast("toastCleared");
}));

refs.exportHistoryBtn.addEventListener("click", async () => {
  const history = await store.loadHistory();
  if (!history || history.length === 0) {
    showToast("toastHistoryEmpty");
    return;
  }
  const lines = history.map((item) => item.value);
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `locksmith-history-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("toastHistoryExported");
});

refs.themeSelect.addEventListener("change", () => {
  settings.theme = refs.themeSelect.value;
  themeManager.apply(settings.theme);
  persistSettings();
});
refs.colorSelect.addEventListener("change", () => {
  settings.color = refs.colorSelect.value;
  themeManager.applyColor(settings.color);
  persistSettings();
});
refs.fontSizeSelect.addEventListener("change", () => {
  settings.fontSize = refs.fontSizeSelect.value;
  themeManager.applyFontSize(settings.fontSize);
  persistSettings();
});
refs.languageSelect.addEventListener("change", () => {
  settings.language = refs.languageSelect.value;
  i18n.setLang(settings.language);
  applySettingsToUI();
  persistSettings();
});
refs.optShowStrength.addEventListener("change", () => {
  settings.showStrength = refs.optShowStrength.checked;
  updateStrength(currentValue, settings.mode);
  persistSettings();
});
refs.optShowHistory.addEventListener("change", () => {
  settings.showHistory = refs.optShowHistory.checked;
  refs.historyCard.classList.toggle("hidden", !settings.showHistory);
  persistSettings();
});
refs.historyLimitSelect.addEventListener("change", async () => {
  settings.historyLimit = parseInt(refs.historyLimitSelect.value, 10);
  persistSettings();
  const history = await store.loadHistory();
  const trimmed = history.slice(0, settings.historyLimit);
  await store.saveHistory(trimmed);
  renderHistory(trimmed);
});

refs.exportBtn.addEventListener("click", async () => {
  const data = await store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `locksmith-settings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("toastExported");
});

refs.importBtn.addEventListener("click", () => refs.importFile.click());
refs.importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    settings = await store.importAll(data);
    i18n.setLang(settings.language);
    themeManager.apply(settings.theme);
    themeManager.applyColor(settings.color);
    themeManager.applyFontSize(settings.fontSize);
    applySettingsToUI();
    const history = await store.loadHistory();
    renderHistory(history);
    showToast("toastImported");
  } catch (err) {
    showToast("toastImportFailed");
  } finally {
    refs.importFile.value = "";
  }
});

refs.aboutBtn.addEventListener("click", () => refs.creditsDialog.showModal());
refs.closeCreditsBtn.addEventListener("click", () => refs.creditsDialog.close());
refs.closeCreditsBtn2.addEventListener("click", () => refs.creditsDialog.close());
refs.landingBtn.addEventListener("click", () => {
  const url = (typeof chrome !== "undefined" && chrome.runtime?.getURL) ? chrome.runtime.getURL("landing/index.html") : "landing/index.html";
  window.open(url, "_blank", "noopener");
});

refs.resetBtn.addEventListener("click", armDestructiveAction(refs.resetBtn, "resetDefault", "confirmClickAgain", async () => {
  settings = await store.resetSettings();
  await store.clearHistory();
  i18n.setLang(settings.language);
  themeManager.apply(settings.theme);
  themeManager.applyColor(settings.color);
  themeManager.applyFontSize(settings.fontSize);
  applySettingsToUI();
  renderHistory([]);
  showToast("toastReset");
  doGenerate(false);
}));

/* ============ Init ============ */
(async function init() {
  settings = await store.loadSettings();
  i18n.setLang(settings.language);
  themeManager.apply(settings.theme);
  themeManager.applyColor(settings.color);
  themeManager.applyFontSize(settings.fontSize);
  themeManager.watchSystemChanges();
  applySettingsToUI();
  i18n.apply();

  const history = await store.loadHistory();
  renderHistory(history);

  await doGenerate(false);
})();
