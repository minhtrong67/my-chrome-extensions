// yt-screenshot - popup script

(() => {
  "use strict";

  const TARGET = "yt-screenshot-content";
  const POLL_MS = 500;

  const $ = (id) => document.getElementById(id);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let settings = sanitizeSettings(null);
  let activeTab = null;
  let injectTried = false;
  let pollTimer = null;
  let polling = false;
  let scrubbing = false;
  let busy = false;
  let lastStatus = null;
  let historyCache = [];
  let currentView = "capture";

  /* ---------- Helpers ---------- */

  function formatTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return "0:00";
    const s = Math.max(0, Math.floor(totalSeconds));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
  }

  // Accepts "90", "1:30", "1:02:03" (decimals allowed in the last part).
  function parseTimeInput(str) {
    const parts = str.trim().split(":").map((p) => p.trim());
    if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
    return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
  }

  function isYoutubeUrl(url) {
    try {
      const host = new URL(url).hostname;
      return host === "youtube.com" || host.endsWith(".youtube.com");
    } catch (e) {
      return false;
    }
  }

  function sanitizeFilename(name) {
    return (
      String(name || "yt-screenshot")
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
        .replace(/^[.\s]+|[.\s]+$/g, "")
        .slice(0, 80) || "yt-screenshot"
    );
  }

  const setPct = (slider) => {
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    slider.style.setProperty("--pct", `${((slider.value - min) / (max - min)) * 100}%`);
  };

  /* ---------- Toast ---------- */

  let toastTimer = null;
  function toast(key, kind) {
    const bar = $("toast");
    const isError = kind ? kind === "error" : /Failed|NoVideo|Invalid|Empty/.test(key);
    bar.classList.toggle("error", isError);
    setIcon($("toastIcon"), isError ? "circle-alert" : "circle-check");
    $("toastText").textContent = i18n.t(key);
    bar.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => bar.classList.remove("show"), 2600);
  }

  /* ---------- Messaging with the page ---------- */

  function sendToContent(tabId, message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { target: TARGET, ...message }, (response) => {
        if (chrome.runtime.lastError) return resolve({ ok: false, error: "no-connection" });
        resolve(response || { ok: false, error: "no-response" });
      });
    });
  }

  // If the tab was opened before yt-screenshot was installed or updated, the content script is missing.
  // Inject it on demand (once) so the user never has to reload the page.
  async function request(message) {
    if (!activeTab) return { ok: false, error: "no-tab" };
    let res = await sendToContent(activeTab.id, message);
    if (!res.ok && res.error === "no-connection" && !injectTried) {
      injectTried = true;
      try {
        await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ["js/content.js"] });
        res = await sendToContent(activeTab.id, message);
      } catch (e) {
        /* page not injectable */
      }
    }
    return res;
  }

  /* ---------- Rendering: status ---------- */

  function showEmpty(kind) {
    const map = {
      "no-tab": ["noVideoTitle", "noVideoSub"],
      "not-watch": ["notWatchTitle", "notWatchSub"],
      "no-video": ["notWatchTitle", "notWatchSub"],
      "no-connection": ["noConnTitle", "noConnSub"]
    };
    const [title, sub] = map[kind] || map["no-tab"];
    $("emptyTitle").dataset.i18n = title;
    $("emptySub").dataset.i18n = sub;
    $("emptyTitle").textContent = i18n.t(title);
    $("emptySub").textContent = i18n.t(sub);
    $("openYoutubeBtn").classList.toggle("hidden", kind === "no-connection");
    $("emptyState").classList.remove("hidden");
    $("videoPane").classList.add("hidden");
  }

  function renderStatus(status) {
    lastStatus = status;
    $("emptyState").classList.add("hidden");
    $("videoPane").classList.remove("hidden");

    $("videoTitle").textContent = status.title || "-";
    $("videoChannel").textContent = status.channel || "";

    const slider = $("timeSlider");
    slider.disabled = status.live || !status.duration;
    $("timeTotal").textContent = status.live ? i18n.t("liveLabel") : formatTime(status.duration);
    if (!scrubbing) {
      $("timeNow").textContent = formatTime(status.currentTime);
      slider.value = status.duration ? Math.round((status.currentTime / status.duration) * 1000) : 0;
      setPct(slider);
    }

    setIcon($("playIcon"), status.paused ? "play" : "pause");
    const playLabel = i18n.t(status.paused ? "play" : "pause");
    $("playBtn").title = playLabel;
    $("playBtn").setAttribute("aria-label", playLabel);
  }

  async function poll() {
    if (polling || currentView !== "capture") return;
    polling = true;
    try {
      const res = await request({ type: "get-status" });
      if (!res.ok) showEmpty(res.error === "no-connection" ? "no-connection" : "no-tab");
      else if (!res.hasVideo) showEmpty(res.reason || "no-video");
      else renderStatus(res);
    } finally {
      polling = false;
    }
  }

  function startPolling() {
    stopPolling();
    const loop = async () => {
      await poll();
      pollTimer = setTimeout(loop, POLL_MS);
    };
    loop();
  }
  function stopPolling() {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  /* ---------- Playback controls ---------- */

  async function command(message) {
    const res = await request(message);
    if (res.ok && res.hasVideo) renderStatus(res);
  }

  function bindPlayback() {
    $("back10Btn").addEventListener("click", () => command({ type: "seek", delta: -10 }));
    $("back1Btn").addEventListener("click", () => command({ type: "seek", delta: -1 }));
    $("fwd1Btn").addEventListener("click", () => command({ type: "seek", delta: 1 }));
    $("fwd10Btn").addEventListener("click", () => command({ type: "seek", delta: 10 }));
    $("backFrameBtn").addEventListener("click", () => command({ type: "step-frame", direction: -1 }));
    $("fwdFrameBtn").addEventListener("click", () => command({ type: "step-frame", direction: 1 }));
    $("playBtn").addEventListener("click", () => command({ type: "toggle-play" }));

    const slider = $("timeSlider");
    slider.addEventListener("input", () => {
      scrubbing = true;
      setPct(slider);
      if (lastStatus && lastStatus.duration) {
        $("timeNow").textContent = formatTime((slider.value / 1000) * lastStatus.duration);
      }
    });
    slider.addEventListener("change", async () => {
      if (lastStatus && lastStatus.duration) {
        await command({ type: "seek-to", seconds: (slider.value / 1000) * lastStatus.duration });
      }
      scrubbing = false;
    });

    const input = $("seekInput");
    const go = async () => {
      const seconds = parseTimeInput(input.value);
      if (seconds === null) {
        input.classList.add("invalid");
        toast("toastInvalidTime");
        return;
      }
      input.classList.remove("invalid");
      await command({ type: "seek-to", seconds });
    };
    $("seekGoBtn").addEventListener("click", go);
    input.addEventListener("keydown", (e) => e.key === "Enter" && go());
    input.addEventListener("input", () => input.classList.remove("invalid"));

    $("openYoutubeBtn").addEventListener("click", () => {
      chrome.tabs.create({ url: "https://www.youtube.com" });
      window.close();
    });
  }

  /* ---------- Capture ---------- */

  function setBusy(value) {
    busy = value;
    $("captureBtn").classList.toggle("is-busy", value);
    $("copyBtn").disabled = value;
  }

  function download(url, filename) {
    return new Promise((resolve) => {
      chrome.downloads.download({ url, filename }, (id) => resolve(!chrome.runtime.lastError && id !== undefined));
    });
  }

  async function capture(mode) {
    if (busy) return;
    setBusy(true);
    try {
      const copy = mode === "copy";
      const format = copy ? "png" : settings.format; // the clipboard only reliably accepts PNG
      const result = await request({
        type: "capture-frame",
        options: {
          format,
          quality: settings.quality,
          scale: settings.scale,
          watermarkTimestamp: settings.watermarkTimestamp,
          captionInfo: settings.captionInfo
        }
      });

      if (!result.ok) {
        toast(result.error === "no-video" || result.error === "no-tab" ? "toastNoVideo" : "toastCaptureFailed");
        return;
      }

      if (copy) {
        try {
          const blob = await (await fetch(result.dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          toast("toastCopied");
        } catch (e) {
          toast("toastCopyFailed");
          return;
        }
      } else {
        const ext = format === "jpeg" ? "jpg" : "png";
        const name = `yt-screenshot-${sanitizeFilename(result.title)}-${result.timeLabel.replace(/:/g, "-")}.${ext}`;
        const ok = await download(result.dataUrl, name);
        if (!ok) {
          toast("toastDownloadFailed");
          return;
        }
        toast("toastCaptured");
      }

      historyCache = await store.addToHistory({
        title: result.title,
        channel: result.channel,
        timeLabel: result.timeLabel,
        videoUrl: result.videoUrl,
        thumbnail: result.thumbnail
      });
      renderHistory(true);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- History ---------- */

  function renderHistory(animateFirst = false) {
    const list = $("historyList");
    list.textContent = "";
    $("exportHistoryBtn").disabled = $("clearHistoryBtn").disabled = historyCache.length === 0;

    if (historyCache.length === 0) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = i18n.t("historyEmpty");
      list.appendChild(li);
      return;
    }

    historyCache.forEach((item, index) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "history-item" + (animateFirst && index === 0 ? " new" : "");
      btn.title = i18n.t("historyOpen");
      btn.addEventListener("click", () => chrome.tabs.create({ url: item.videoUrl }));

      const img = document.createElement("img");
      img.className = "history-thumb";
      img.alt = "";
      img.src = item.thumbnail || "";

      const info = document.createElement("span");
      info.className = "history-info";
      const name = document.createElement("span");
      name.className = "history-name";
      name.textContent = item.title || "yt-screenshot";
      const meta = document.createElement("span");
      meta.className = "history-meta";
      meta.textContent = [item.channel, item.timeLabel].filter(Boolean).join(" \u00B7 ");
      info.append(name, meta);

      const arrow = document.createElement("span");
      arrow.className = "icon";
      arrow.setAttribute("data-icon", "external-link");

      btn.append(img, info, arrow);
      li.appendChild(btn);
      list.appendChild(li);
    });
    renderIcons(list);
  }

  function bindHistory() {
    $("exportHistoryBtn").addEventListener("click", () => {
      if (historyCache.length === 0) return toast("toastHistoryEmpty");
      const lines = historyCache.map((item) => {
        const date = new Date(item.ts).toLocaleString(i18n.current);
        return `[${date}] ${item.title || "yt-screenshot"} (${item.channel || "?"}) @ ${item.timeLabel} - ${item.videoUrl}`;
      });
      const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `yt-screenshot-history-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("toastHistoryExported");
    });

    $("clearHistoryBtn").addEventListener("click", async () => {
      await store.clearHistory();
      historyCache = [];
      renderHistory();
      toast("toastCleared");
    });
  }

  /* ---------- Settings: apply + bind ---------- */

  const persist = () => store.saveSettings(settings);

  function setRadio(name, value) {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  function applyAppearance() {
    themeManager.apply(settings.theme);
  }

  function syncSettingsUI() {
    setRadio("format", settings.format);
    setRadio("scale", settings.scale);
    $("themeSelect").value = settings.theme;
    $("languageSelect").value = settings.language;
    $("optTimestamp").checked = settings.watermarkTimestamp;
    $("optCaption").checked = settings.captionInfo;
    $("qualitySlider").value = settings.quality;
    $("qualityValue").textContent = `${settings.quality}%`;
    setPct($("qualitySlider"));
    $("qualityCollapse").classList.toggle("open", settings.format === "jpeg");
    $("versionLabel").textContent = chrome.runtime.getManifest().version;
  }

  function onLanguageChanged() {
    i18n.setLang(settings.language);
    renderHistory();
    if (lastStatus) renderStatus(lastStatus);
  }

  function bindSettings() {
    const onRadio = (name, handler) =>
      qsa(`input[name="${name}"]`).forEach((r) => r.addEventListener("change", () => r.checked && handler(r.value)));

    onRadio("format", (v) => {
      settings.format = v;
      $("qualityCollapse").classList.toggle("open", v === "jpeg");
      persist();
    });
    onRadio("scale", (v) => {
      settings.scale = Number(v);
      persist();
    });
    $("themeSelect").addEventListener("change", (e) => {
      settings.theme = e.target.value;
      applyAppearance();
      persist();
    });
    $("languageSelect").addEventListener("change", (e) => {
      settings.language = e.target.value;
      onLanguageChanged();
      persist();
    });

    $("optTimestamp").addEventListener("change", (e) => {
      settings.watermarkTimestamp = e.target.checked;
      persist();
    });
    $("optCaption").addEventListener("change", (e) => {
      settings.captionInfo = e.target.checked;
      persist();
    });

    const q = $("qualitySlider");
    q.addEventListener("input", () => {
      $("qualityValue").textContent = `${q.value}%`;
      setPct(q);
    });
    q.addEventListener("change", () => {
      settings.quality = Number(q.value);
      persist();
    });

    $("captureBtn").addEventListener("click", () => capture("download"));
    $("copyBtn").addEventListener("click", () => capture("copy"));
  }

  /* ---------- Keyboard shortcuts ---------- */

  function bindShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (currentView !== "capture" || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const t = e.target;
      if (t && (t.tagName === "SELECT" || (t.tagName === "INPUT" && t.type !== "radio" && t.type !== "checkbox"))) return;
      if ($("videoPane").classList.contains("hidden")) return;
      if (t && t.type === "radio" && e.key.startsWith("Arrow")) return; // keep native radio navigation
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const step = e.shiftKey ? 10 : 1;
      let handled = true;
      if (key === " ") command({ type: "toggle-play" });
      else if (key === "ArrowLeft") command({ type: "seek", delta: -step });
      else if (key === "ArrowRight") command({ type: "seek", delta: step });
      else if (key === ",") command({ type: "step-frame", direction: -1 });
      else if (key === ".") command({ type: "step-frame", direction: 1 });
      else if (key === "s" && !e.shiftKey) capture("download");
      else if (key === "c" && !e.shiftKey) capture("copy");
      else handled = false;
      if (handled) e.preventDefault();
    });
  }

  // Space activates a focused button on keyup; swallow it so play/pause does not fire twice.
  document.addEventListener("keyup", (e) => {
    if (e.key === " " && currentView === "capture" && e.target.tagName === "BUTTON") e.preventDefault();
  });

  /* ---------- Views ---------- */

  function showView(name) {
    if (name === currentView) return;
    const back = name === "capture";
    const next = $(`view-${name}`);
    const prev = $(`view-${currentView}`);
    currentView = name;

    prev.classList.add("hidden");
    prev.inert = true;
    next.classList.remove("hidden");
    next.inert = false;
    next.classList.remove("enter", "back");
    void next.offsetWidth; // restart the animation
    next.classList.add("enter");
    next.classList.toggle("back", back);

    next.querySelector(".content").scrollTop = 0;
    if (name === "capture") startPolling();
    else stopPolling();
  }

  function bindViews() {
    $("settingsBtn").addEventListener("click", () => showView("settings"));
    $("backBtn").addEventListener("click", () => showView("capture"));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && currentView === "settings") showView("capture");
    });
  }

  /* ---------- Init ---------- */

  async function init() {
    settings = await store.loadSettings();
    if (!settings.language) {
      settings.language = i18n.detect();
      persist();
    }

    themeManager.watchSystem();
    applyAppearance();
    renderIcons();
    i18n.setLang(settings.language);
    syncSettingsUI();

    bindViews();
    bindPlayback();
    bindHistory();
    bindSettings();
    bindShortcuts();

    historyCache = await store.loadHistory();
    renderHistory();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab && isYoutubeUrl(tab.url || "") ? tab : null;
    if (!activeTab) showEmpty("no-tab");
    else $("videoPane").classList.add("hidden");

    document.body.classList.add("ready");
    if (activeTab) startPolling();
  }

  init();
})();
