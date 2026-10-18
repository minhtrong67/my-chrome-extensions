// SmartShot — annotation editor
// Author: minhtrong67 (with AI support from Claude)
//
// Non-destructive model: the captured image is the immutable `base`; every annotation is a small
// object in `objects`. That makes Select/Move/Resize/Delete and cheap undo possible, and the
// pixelate ("redact") tool re-renders from the real pixels so exports are always irreversible.

let settings = { ...DEFAULT_SETTINGS };

/* ------------------------------ state ------------------------------ */
let base = null;                 // HTMLCanvasElement — current (possibly cropped) image
let objects = [];                // annotation objects, bottom → top
let selectedId = null;
let nextId = 1;
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 60;

let tool = "select";
let color = "#F44336";
let size = 4;
let zoom = 1;
let fitMode = true;
let dirty = false;

let drawing = null;              // object being drawn right now
let drag = null;                 // active pointer interaction
let cropRect = null;
let editing = null;              // text being edited { id|null, x, y, color, size }
let editingId = null;
let captureId = null;
let captureType = "visible";
let accent = "#9C27B0";

const PALETTE = ["#F44336", "#FF9800", "#FFEB3B", "#4CAF50", "#2196F3", "#9C27B0", "#000000", "#FFFFFF"];
const $ = (id) => document.getElementById(id);

const canvas = $("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: false });
const overlay = $("overlay");
const octx = overlay.getContext("2d");
const stage = $("stage");
const wrap = $("wrap");
const textEditor = $("textEditor");
const measureCtx = document.createElement("canvas").getContext("2d");
const scratch = document.createElement("canvas");

/* ------------------------------ utils ------------------------------ */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clone = (v) => JSON.parse(JSON.stringify(v));
const selected = () => objects.find((o) => o.id === selectedId) || null;
const isRectLike = (o) => o.type === "rect" || o.type === "ellipse" || o.type === "blur";

let toastTimer = null;
function toast(key) {
  const t = $("toast");
  t.textContent = i18n.t(key);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function fontStack() { return (FONT_OPTIONS[settings.font] || FONT_OPTIONS.system).stack; }
const textPx = (s) => Math.round(14 + s * 2.4);
const textFont = (o) => `600 ${textPx(o.size)}px ${fontStack()}`;

function readAccent() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--md-primary").trim();
  if (v) accent = v;
}

/* ------------------------------ geometry ------------------------------ */
function textMetrics(o) {
  measureCtx.font = textFont(o);
  const lines = o.text.split("\n");
  const lh = textPx(o.size) * 1.25;
  let w = 0;
  for (const l of lines) w = Math.max(w, measureCtx.measureText(l).width);
  return { w, h: lines.length * lh, lh, lines };
}

function lineWidthOf(o) { return o.type === "highlight" ? Math.max(o.size * 3, 14) : o.size; }

function bbox(o) {
  if (o.type === "pen" || o.type === "highlight") {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < o.pts.length; i += 2) {
      x0 = Math.min(x0, o.pts[i]); x1 = Math.max(x1, o.pts[i]);
      y0 = Math.min(y0, o.pts[i + 1]); y1 = Math.max(y1, o.pts[i + 1]);
    }
    const p = lineWidthOf(o) / 2 + 2;
    return { x: x0 - p, y: y0 - p, w: x1 - x0 + 2 * p, h: y1 - y0 + 2 * p };
  }
  if (o.type === "arrow") {
    const p = 10 + o.size * 2.6;
    const x = Math.min(o.x1, o.x2) - p, y = Math.min(o.y1, o.y2) - p;
    return { x, y, w: Math.abs(o.x2 - o.x1) + 2 * p, h: Math.abs(o.y2 - o.y1) + 2 * p };
  }
  if (o.type === "text") { const m = textMetrics(o); return { x: o.x - 3, y: o.y - 3, w: m.w + 6, h: m.h + 6 }; }
  const p = o.type === "blur" ? 0 : o.size / 2;
  return { x: o.x - p, y: o.y - p, w: o.w + 2 * p, h: o.h + 2 * p };
}

function translate(o, dx, dy) {
  if (o.pts) for (let i = 0; i < o.pts.length; i += 2) { o.pts[i] += dx; o.pts[i + 1] += dy; }
  else if (o.type === "arrow") { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; }
  else { o.x += dx; o.y += dy; }
}

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hitObject(o, p) {
  const tol = Math.max(6, 9 / zoom);
  switch (o.type) {
    case "pen": case "highlight": {
      const r = lineWidthOf(o) / 2 + tol;
      if (o.pts.length === 2) return Math.hypot(p.x - o.pts[0], p.y - o.pts[1]) <= r;
      for (let i = 0; i < o.pts.length - 2; i += 2) {
        if (distToSeg(p.x, p.y, o.pts[i], o.pts[i + 1], o.pts[i + 2], o.pts[i + 3]) <= r) return true;
      }
      return false;
    }
    case "arrow": return distToSeg(p.x, p.y, o.x1, o.y1, o.x2, o.y2) <= o.size / 2 + tol + 4;
    case "rect": {
      const r = o.size / 2 + tol;
      const outer = p.x >= o.x - r && p.x <= o.x + o.w + r && p.y >= o.y - r && p.y <= o.y + o.h + r;
      const inner = p.x > o.x + r && p.x < o.x + o.w - r && p.y > o.y + r && p.y < o.y + o.h - r;
      return outer && !inner;
    }
    case "ellipse": {
      const rx = Math.max(1, o.w / 2), ry = Math.max(1, o.h / 2);
      const d = Math.hypot((p.x - (o.x + rx)) / rx, (p.y - (o.y + ry)) / ry);
      return Math.abs(d - 1) * Math.min(rx, ry) <= o.size / 2 + tol;
    }
    default: { const b = bbox(o); return p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol; }
  }
}

const topObjectAt = (p) => { for (let i = objects.length - 1; i >= 0; i--) if (hitObject(objects[i], p)) return objects[i]; return null; };

function handlesOf(o) {
  if (o.type === "arrow") return [[o.x1, o.y1], [o.x2, o.y2]];
  if (isRectLike(o)) return [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
  return [];
}
function hitHandle(o, p) {
  const r = Math.max(8, 11 / zoom);
  return handlesOf(o).findIndex(([hx, hy]) => Math.hypot(p.x - hx, p.y - hy) <= r);
}

/* ------------------------------ drawing ------------------------------ */
function strokePath(g, pts, col, width) {
  g.strokeStyle = col; g.lineWidth = width; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  if (pts.length === 2) g.lineTo(pts[0] + 0.01, pts[1] + 0.01);
  else if (pts.length === 4) g.lineTo(pts[2], pts[3]);
  else {
    for (let i = 2; i < pts.length - 2; i += 2) {
      g.quadraticCurveTo(pts[i], pts[i + 1], (pts[i] + pts[i + 2]) / 2, (pts[i + 1] + pts[i + 3]) / 2);
    }
    g.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
  }
  g.stroke();
}

function pixelate(g, x, y, w, h, block) {
  x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y));
  w = Math.min(Math.ceil(w), g.canvas.width - x); h = Math.min(Math.ceil(h), g.canvas.height - y);
  if (w < 1 || h < 1) return;
  const tw = Math.max(1, Math.ceil(w / block)), th = Math.max(1, Math.ceil(h / block));
  scratch.width = tw; scratch.height = th;
  const s = scratch.getContext("2d");
  s.imageSmoothingEnabled = true; s.imageSmoothingQuality = "high";
  s.clearRect(0, 0, tw, th);
  s.drawImage(g.canvas, x, y, w, h, 0, 0, tw, th);
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(scratch, 0, 0, tw, th, x, y, w, h);
  g.restore();
}

function drawObject(g, o) {
  switch (o.type) {
    case "pen": strokePath(g, o.pts, o.color, o.size); break;
    case "highlight":
      g.save(); g.globalAlpha = 0.4; strokePath(g, o.pts, o.color, lineWidthOf(o)); g.restore(); break;
    case "arrow": {
      const head = 10 + o.size * 2.6;
      const ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
      const len = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
      const h = Math.min(head, len * 0.9);
      const bx = o.x2 - Math.cos(ang) * h * 0.7, by = o.y2 - Math.sin(ang) * h * 0.7;
      g.strokeStyle = o.color; g.fillStyle = o.color; g.lineWidth = o.size; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(o.x1, o.y1); g.lineTo(bx, by); g.stroke();
      g.beginPath();
      g.moveTo(o.x2, o.y2);
      g.lineTo(o.x2 - h * Math.cos(ang - Math.PI / 7), o.y2 - h * Math.sin(ang - Math.PI / 7));
      g.lineTo(o.x2 - h * Math.cos(ang + Math.PI / 7), o.y2 - h * Math.sin(ang + Math.PI / 7));
      g.closePath(); g.fill();
      break;
    }
    case "rect":
      g.strokeStyle = o.color; g.lineWidth = o.size; g.lineJoin = "round";
      g.strokeRect(o.x, o.y, o.w, o.h); break;
    case "ellipse":
      g.strokeStyle = o.color; g.lineWidth = o.size;
      g.beginPath(); g.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.max(0.5, o.w / 2), Math.max(0.5, o.h / 2), 0, 0, Math.PI * 2); g.stroke(); break;
    case "blur": pixelate(g, o.x, o.y, o.w, o.h, Math.max(10, o.size * 3)); break;
    case "text": {
      const m = textMetrics(o);
      g.font = textFont(o); g.fillStyle = o.color; g.textBaseline = "top";
      m.lines.forEach((line, i) => g.fillText(line, o.x, o.y + i * m.lh));
      break;
    }
  }
}

let renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

function render() {
  if (!base) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(base, 0, 0);
  for (const o of objects) if (o.id !== editingId) drawObject(ctx, o);
  if (drawing) drawObject(ctx, drawing);
  drawOverlay();
}

function drawOverlay() {
  const w = overlay.width, h = overlay.height, k = 1 / zoom;
  octx.clearRect(0, 0, w, h);

  if (cropRect) {
    const { x, y, w: cw, h: ch } = cropRect;
    octx.fillStyle = "rgba(0,0,0,.55)";
    octx.fillRect(0, 0, w, y); octx.fillRect(0, y + ch, w, h - y - ch);
    octx.fillRect(0, y, x, ch); octx.fillRect(x + cw, y, w - x - cw, ch);
    octx.lineWidth = 2 * k; octx.strokeStyle = "#fff"; octx.strokeRect(x, y, cw, ch);
    octx.lineWidth = 1 * k; octx.strokeStyle = "rgba(255,255,255,.45)";
    octx.beginPath();
    for (let i = 1; i < 3; i++) {
      octx.moveTo(x + (cw * i) / 3, y); octx.lineTo(x + (cw * i) / 3, y + ch);
      octx.moveTo(x, y + (ch * i) / 3); octx.lineTo(x + cw, y + (ch * i) / 3);
    }
    octx.stroke();
  }

  const s = selected();
  if (s && s.id !== editingId && tool === "select") {
    const b = bbox(s);
    octx.setLineDash([6 * k, 4 * k]); octx.lineWidth = 1.5 * k; octx.strokeStyle = accent;
    octx.strokeRect(b.x, b.y, b.w, b.h);
    octx.setLineDash([]);
    for (const [hx, hy] of handlesOf(s)) {
      octx.beginPath(); octx.arc(hx, hy, 6 * k, 0, Math.PI * 2);
      octx.fillStyle = "#fff"; octx.fill();
      octx.lineWidth = 2 * k; octx.strokeStyle = accent; octx.stroke();
    }
  }
}

/* ------------------------------ base image & zoom ------------------------------ */
function setBase(c) {
  base = c;
  canvas.width = overlay.width = c.width;
  canvas.height = overlay.height = c.height;
  $("dims").textContent = `${c.width} × ${c.height}`;
  applyZoom();
  requestRender();
}

function applyZoom() {
  if (!base) return;
  const w = Math.max(1, Math.round(base.width * zoom)), h = Math.max(1, Math.round(base.height * zoom));
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  $("zoomValue").textContent = Math.round(zoom * 100) + "%";
  if (editing) positionTextEditor();
  requestRender();
}

function fit() {
  if (!base) return;
  const cs = getComputedStyle(stage);
  const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let z = Math.min(1, availW / base.width);
  if (base.height / base.width < 2.5) z = Math.min(z, availH / base.height); // very tall page captures scroll instead
  zoom = clamp(z, 0.05, 1);
  applyZoom();
}

function setZoom(z, clientX, clientY) {
  const before = wrap.getBoundingClientRect();
  const cx = clientX ?? before.left + before.width / 2, cy = clientY ?? before.top + before.height / 2;
  const px = (cx - before.left) / zoom, py = (cy - before.top) / zoom;
  zoom = clamp(z, 0.05, 4);
  fitMode = false;
  applyZoom();
  const after = wrap.getBoundingClientRect();
  stage.scrollLeft += after.left + px * zoom - cx;
  stage.scrollTop += after.top + py * zoom - cy;
}

function pt(e) {
  const r = overlay.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
}

/* ------------------------------ history ------------------------------ */
const snapshot = () => ({ base, objects: clone(objects), sel: selectedId });

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  dirty = true;
  updateButtons();
}

function restore(s) {
  cancelCrop(true);
  cancelText();
  if (s.base !== base) setBase(s.base);
  objects = clone(s.objects);
  selectedId = objects.some((o) => o.id === s.sel) ? s.sel : null;
  dirty = true;
  updateButtons();
  requestRender();
}

function undo() {
  if (!undoStack.length) return toast("toastNothingToUndo");
  redoStack.push(snapshot());
  restore(undoStack.pop());
}
function redo() {
  if (!redoStack.length) return toast("toastNothingToRedo");
  undoStack.push(snapshot());
  restore(redoStack.pop());
}

function updateButtons() {
  $("undoBtn").disabled = !undoStack.length;
  $("redoBtn").disabled = !redoStack.length;
  $("deleteBtn").disabled = !selectedId;
  $("clearBtn").disabled = !objects.length;
}

function select(id) {
  selectedId = id;
  const o = selected();
  if (o && o.type !== "blur") { color = o.color; syncColorUI(); }
  if (o) { size = o.size; $("sizeSlider").value = size; paintSlider($("sizeSlider")); }
  updateButtons();
  requestRender();
}

function deleteSelected() {
  if (!selectedId) return;
  pushHistory();
  objects = objects.filter((o) => o.id !== selectedId);
  selectedId = null;
  updateButtons();
  requestRender();
}

function clearAll() {
  if (!objects.length) return;
  pushHistory();
  objects = [];
  selectedId = null;
  updateButtons();
  requestRender();
  toast("toastCleared2");
}

/* ------------------------------ tools & UI sync ------------------------------ */
function setTool(name) {
  if (name !== "text") commitText();
  if (name !== "crop") cancelCrop(true);
  tool = name;
  document.querySelectorAll(".tool").forEach((b) => {
    const on = b.dataset.tool === name;
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", String(on));
  });
  overlay.style.cursor = name === "select" ? "default" : name === "text" ? "text" : "crosshair";
  if (name !== "select") { selectedId = null; updateButtons(); }
  requestRender();
}

function paintSlider(input) {
  input.style.setProperty("--fill", ((input.value - input.min) / (input.max - input.min)) * 100 + "%");
}

function buildPalette() {
  const box = $("colors");
  box.innerHTML = "";
  PALETTE.forEach((hex) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "color"; b.dataset.color = hex;
    b.style.setProperty("--c", hex); b.setAttribute("role", "radio"); b.title = hex;
    b.addEventListener("click", () => setColor(hex));
    box.appendChild(b);
  });
  const custom = document.createElement("label");
  custom.className = "color-custom"; custom.title = "Custom";
  custom.innerHTML = '<input type="color" id="customColor" value="#F44336" />';
  box.appendChild(custom);
  custom.querySelector("input").addEventListener("input", (e) => setColor(e.target.value.toUpperCase()));
}

function syncColorUI() {
  document.querySelectorAll(".color").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.color.toLowerCase() === color.toLowerCase())));
  const ci = $("customColor");
  if (ci && /^#[0-9a-f]{6}$/i.test(color)) ci.value = color.toLowerCase();
}

let styleSession = false;
function setColor(hex) {
  color = hex;
  syncColorUI();
  const o = selected();
  if (o && o.type !== "blur") {
    if (!styleSession) { pushHistory(); styleSession = true; setTimeout(() => (styleSession = false), 600); }
    o.color = hex;
    requestRender();
  }
  if (editing) { editing.color = hex; textEditor.style.color = hex; }
  savePrefs();
}

function savePrefs() {
  try { localStorage.setItem("smartshot_editor", JSON.stringify({ color, size })); } catch (e) { /* ignore */ }
}

/* ------------------------------ text tool ------------------------------ */
function positionTextEditor() {
  if (!editing) return;
  const px = textPx(editing.size) * zoom;
  Object.assign(textEditor.style, {
    left: editing.x * zoom + "px", top: editing.y * zoom + "px",
    fontSize: px + "px", color: editing.color, fontFamily: fontStack()
  });
  autosizeText();
}

function autosizeText() {
  measureCtx.font = `600 ${parseFloat(textEditor.style.fontSize) || 16}px ${fontStack()}`;
  const lines = (textEditor.value || textEditor.placeholder || " ").split("\n");
  let w = 0;
  for (const l of lines) w = Math.max(w, measureCtx.measureText(l).width);
  textEditor.style.width = Math.ceil(w) + 12 + "px";
  textEditor.style.height = lines.length * (parseFloat(textEditor.style.fontSize) || 16) * 1.25 + "px";
}

function openTextEditor(x, y, existing) {
  commitText();
  editing = existing
    ? { id: existing.id, x: existing.x, y: existing.y, color: existing.color, size: existing.size }
    : { id: null, x, y, color, size };
  editingId = existing ? existing.id : null;
  textEditor.value = existing ? existing.text : "";
  textEditor.classList.remove("hidden");
  positionTextEditor();
  requestRender();
  requestAnimationFrame(() => { textEditor.focus(); textEditor.setSelectionRange(textEditor.value.length, textEditor.value.length); });
}

function closeTextEditor() {
  editing = null; editingId = null;
  textEditor.classList.add("hidden");
  if (document.activeElement === textEditor) textEditor.blur(); // return keyboard focus so shortcuts work again
}

function commitText() {
  if (!editing) return;
  const e = editing;
  const val = textEditor.value.replace(/\s+$/, "");
  closeTextEditor();
  if (e.id) {
    const o = objects.find((x) => x.id === e.id);
    if (o) {
      if (!val) { pushHistory(); objects = objects.filter((x) => x.id !== e.id); if (selectedId === e.id) selectedId = null; }
      else if (val !== o.text) { pushHistory(); o.text = val; }
    }
  } else if (val) {
    pushHistory();
    const o = { id: nextId++, type: "text", x: e.x, y: e.y, text: val, color: e.color, size: e.size };
    objects.push(o);
  }
  updateButtons();
  requestRender();
}

function cancelText() { if (editing) { closeTextEditor(); requestRender(); } }

textEditor.addEventListener("input", autosizeText);
textEditor.addEventListener("blur", commitText);
textEditor.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
  else if (e.key === "Escape") { e.preventDefault(); cancelText(); }
});

/* ------------------------------ crop ------------------------------ */
function showCropBar() {
  const r = cropRect;
  $("cropBar").classList.toggle("hidden", !r);
  if (r) $("cropDims").textContent = `${Math.round(r.w)} × ${Math.round(r.h)}`;
}
function cancelCrop(silent) {
  cropRect = null;
  showCropBar();
  if (!silent) requestRender();
}
function applyCrop() {
  if (!cropRect) return;
  const x = Math.round(cropRect.x), y = Math.round(cropRect.y);
  const w = Math.min(base.width - x, Math.round(cropRect.w)), h = Math.min(base.height - y, Math.round(cropRect.h));
  if (w < 4 || h < 4) return cancelCrop();
  pushHistory();
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(base, x, y, w, h, 0, 0, w, h);
  objects.forEach((o) => translate(o, -x, -y));
  cropRect = null;
  showCropBar();
  setBase(c);
  if (fitMode) fit();
  setTool("select");
  toast("toastCropApplied");
}

/* ------------------------------ pointer interaction ------------------------------ */
function snapAngle(sx, sy, p) {
  const dx = p.x - sx, dy = p.y - sy;
  const len = Math.hypot(dx, dy);
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: sx + Math.cos(a) * len, y: sy + Math.sin(a) * len };
}

function rectFrom(sx, sy, p, square) {
  let w = p.x - sx, h = p.y - sy;
  if (square) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
  return { x: Math.min(sx, sx + w), y: Math.min(sy, sy + h), w: Math.abs(w), h: Math.abs(h) };
}

overlay.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || !base) return;
  const p = pt(e);
  commitText();
  overlay.setPointerCapture(e.pointerId);

  if (tool === "select") {
    const cur = selected();
    if (cur) {
      const hi = hitHandle(cur, p);
      if (hi >= 0) { drag = { mode: "resize", handle: hi, orig: clone(cur), pushed: false }; return; }
    }
    const hit = topObjectAt(p);
    if (hit) {
      if (hit.id !== selectedId) select(hit.id);
      drag = { mode: "move", sx: p.x, sy: p.y, last: p, pushed: false };
    } else { select(null); }
    return;
  }

  if (tool === "text") {
    const hit = [...objects].reverse().find((o) => o.type === "text" && hitObject(o, p));
    if (hit) { openTextEditor(0, 0, hit); } else { openTextEditor(p.x, p.y, null); }
    return;
  }

  if (tool === "crop") {
    drag = { mode: "crop", sx: clamp(p.x, 0, base.width), sy: clamp(p.y, 0, base.height) };
    cropRect = { x: drag.sx, y: drag.sy, w: 0, h: 0 };
    showCropBar();
    return;
  }

  drag = { mode: "draw", sx: p.x, sy: p.y };
  if (tool === "pen" || tool === "highlight") drawing = { type: tool, color, size, pts: [p.x, p.y] };
  else if (tool === "arrow") drawing = { type: "arrow", color, size, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  else drawing = { type: tool, color, size, x: p.x, y: p.y, w: 0, h: 0 };
  requestRender();
});

overlay.addEventListener("pointermove", (e) => {
  if (!base) return;
  const p = pt(e);

  if (!drag) {                       // hover cursor feedback in select mode
    if (tool === "select") {
      const cur = selected();
      const hi = cur ? hitHandle(cur, p) : -1;
      overlay.style.cursor = hi >= 0 ? (cur.type === "arrow" ? "crosshair" : hi % 2 === 0 ? "nwse-resize" : "nesw-resize") : topObjectAt(p) ? "move" : "default";
    }
    return;
  }

  if (drag.mode === "move") {
    const o = selected();
    if (!o) return;
    if (!drag.pushed) { pushHistory(); drag.pushed = true; }
    translate(o, p.x - drag.last.x, p.y - drag.last.y);
    drag.last = p;
  } else if (drag.mode === "resize") {
    const o = selected();
    if (!o) return;
    if (!drag.pushed) { pushHistory(); drag.pushed = true; }
    if (o.type === "arrow") {
      const q = e.shiftKey ? snapAngle(drag.handle === 0 ? o.x2 : o.x1, drag.handle === 0 ? o.y2 : o.y1, p) : p;
      if (drag.handle === 0) { o.x1 = q.x; o.y1 = q.y; } else { o.x2 = q.x; o.y2 = q.y; }
    } else {
      const c = handlesOf(drag.orig)[(drag.handle + 2) % 4];
      Object.assign(o, rectFrom(c[0], c[1], p, e.shiftKey));
    }
  } else if (drag.mode === "crop") {
    const x = clamp(p.x, 0, base.width), y = clamp(p.y, 0, base.height);
    cropRect = { x: Math.min(drag.sx, x), y: Math.min(drag.sy, y), w: Math.abs(x - drag.sx), h: Math.abs(y - drag.sy) };
    showCropBar();
  } else if (drag.mode === "draw" && drawing) {
    if (drawing.pts) {
      const n = drawing.pts.length;
      if (Math.hypot(p.x - drawing.pts[n - 2], p.y - drawing.pts[n - 1]) >= 1.5 / zoom) drawing.pts.push(p.x, p.y);
    } else if (drawing.type === "arrow") {
      const q = e.shiftKey ? snapAngle(drag.sx, drag.sy, p) : p;
      drawing.x2 = q.x; drawing.y2 = q.y;
    } else Object.assign(drawing, rectFrom(drag.sx, drag.sy, p, e.shiftKey));
  }
  requestRender();
});

function endDrag() {
  const d = drag;
  drag = null;
  if (!d) return;

  if (d.mode === "draw" && drawing) {
    const o = drawing;
    drawing = null;
    const tiny = o.pts ? false
      : o.type === "arrow" ? Math.hypot(o.x2 - o.x1, o.y2 - o.y1) < 4
      : o.w < 4 && o.h < 4;
    if (!tiny) {
      pushHistory();
      o.id = nextId++;
      objects.push(o);
      updateButtons();
    }
  } else if (d.mode === "crop") {
    if (!cropRect || cropRect.w < 8 || cropRect.h < 8) cancelCrop(true);
    else showCropBar();
  }
  requestRender();
}
overlay.addEventListener("pointerup", endDrag);
overlay.addEventListener("pointercancel", endDrag);
overlay.addEventListener("lostpointercapture", () => { if (drag && drag.mode !== "crop") endDrag(); });

overlay.addEventListener("dblclick", (e) => {
  const p = pt(e);
  const hit = [...objects].reverse().find((o) => o.type === "text" && hitObject(o, p));
  if (hit) { select(hit.id); openTextEditor(0, 0, hit); }
});

stage.addEventListener("wheel", (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY);
}, { passive: false });

/* ------------------------------ export / save ------------------------------ */
function renderExport(opaque) {
  const c = document.createElement("canvas");
  c.width = base.width; c.height = base.height;
  const g = c.getContext("2d");
  if (opaque) { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(base, 0, 0);
  for (const o of objects) drawObject(g, o);
  return c;
}

function thumbOf(c) {
  const k = Math.min(1, 160 / Math.max(c.width, c.height));
  const t = document.createElement("canvas");
  t.width = Math.max(1, Math.round(c.width * k)); t.height = Math.max(1, Math.round(c.height * k));
  const g = t.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.fillStyle = "#fff"; g.fillRect(0, 0, t.width, t.height);
  g.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL("image/jpeg", 0.72);
}

const currentFormat = () => document.querySelector('input[name="format"]:checked').value;
const toBlob = (c, mime, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), mime, q));

async function download() {
  if (!base) return;
  commitText();
  const format = currentFormat();
  const jpeg = format === "jpeg";
  try {
    const c = renderExport(jpeg);
    const blob = await toBlob(c, jpeg ? "image/jpeg" : "image/png", jpeg ? parseInt($("qualitySlider").value, 10) / 100 : undefined);
    const name = ($("filename").value.trim() || "smartshot").replace(/[\\/:*?"<>|]+/g, "-").replace(/\.(png|jpe?g)$/i, "");
    const filename = `${name}.${jpeg ? "jpg" : "png"}`;
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    dirty = false;
    toast("toastDownloaded");
    store.addToHistory({ captureType, filename, format, action: "download", thumbnail: thumbOf(c) }, settings.historyLimit);
  } catch (err) { toast("toastCopyFailed"); }
}

async function copy() {
  if (!base) return;
  commitText();
  try {
    const c = renderExport(false);
    const blob = await toBlob(c, "image/png");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    dirty = false;
    toast("toastCopied");
    store.addToHistory({ captureType, filename: null, format: "png", action: "clipboard", thumbnail: thumbOf(c) }, settings.historyLimit);
  } catch (err) { toast("toastCopyFailed"); }
}

/* ------------------------------ closing ------------------------------ */
async function closeEditor() {
  if (captureId) capturesDb.delete(captureId).catch(() => {});
  try {
    const tab = await chrome.tabs.getCurrent();
    if (tab) return chrome.tabs.remove(tab.id);
  } catch (e) { /* fall through */ }
  window.close();
}

function requestClose() {
  if (!dirty) return closeEditor();
  const dlg = $("unsavedDialog");
  $("keepBtn").onclick = () => dlg.close();
  $("discardBtn").onclick = () => { dirty = false; dlg.close(); closeEditor(); };
  dlg.showModal();
}

window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

/* ------------------------------ keyboard ------------------------------ */
const TOOL_KEYS = { v: "select", p: "pen", a: "arrow", r: "rect", e: "ellipse", t: "text", h: "highlight", b: "blur", c: "crop" };
let nudgeTimer = null;

document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  const typing = tag === "input" && e.target.type !== "range" && e.target.type !== "radio" && e.target.type !== "color" || tag === "textarea";
  const mod = e.ctrlKey || e.metaKey;

  if (mod && !typing) {
    const k = e.key.toLowerCase();
    if (k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (k === "y") { e.preventDefault(); redo(); return; }
    if (k === "s") { e.preventDefault(); download(); return; }
    if (k === "c" && !window.getSelection().toString()) { e.preventDefault(); copy(); return; }
    if (k === "0") { e.preventDefault(); fitMode = true; fit(); return; }
    if (k === "=" || k === "+") { e.preventDefault(); setZoom(zoom * 1.25); return; }
    if (k === "-") { e.preventDefault(); setZoom(zoom / 1.25); return; }
  }
  if (typing || mod || e.altKey) return;

  if (e.key === "Escape") {
    if (cropRect) cancelCrop(); else if (selectedId) select(null);
    return;
  }
  if (e.key === "Enter" && cropRect) { e.preventDefault(); applyCrop(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); deleteSelected(); return; }

  if (selectedId && e.key.startsWith("Arrow")) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const o = selected();
    if (!nudgeTimer) pushHistory();
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => (nudgeTimer = null), 700);
    translate(o, e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
    requestRender();
    return;
  }
  if (e.key === "+" || e.key === "=") { setZoom(zoom * 1.25); return; }
  if (e.key === "-") { setZoom(zoom / 1.25); return; }
  if (e.key === "0") { fitMode = true; fit(); return; }

  const t = TOOL_KEYS[e.key.toLowerCase()];
  if (t) { e.preventDefault(); setTool(t); }
});

/* ------------------------------ loading images ------------------------------ */
async function loadBlob(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width; c.height = bmp.height;
  c.getContext("2d").drawImage(bmp, 0, 0);
  bmp.close();
  objects = []; undoStack = []; redoStack = []; selectedId = null; dirty = false;
  fitMode = true;
  setBase(c);
  fit();
  updateButtons();
  $("loading").classList.add("done");
}

// Paste (Ctrl+V) or drop an image to edit it — handy when you captured something elsewhere.
window.addEventListener("paste", (e) => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) { e.preventDefault(); loadBlob(item.getAsFile()).catch(() => toast("toastLoadFailed")); }
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
  if (f) { e.preventDefault(); loadBlob(f).catch(() => toast("toastLoadFailed")); }
});

/* ------------------------------ wiring & init ------------------------------ */
function wire() {
  document.querySelectorAll(".tool").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));
  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);
  $("deleteBtn").addEventListener("click", deleteSelected);
  $("clearBtn").addEventListener("click", clearAll);
  $("zoomInBtn").addEventListener("click", () => setZoom(zoom * 1.25));
  $("zoomOutBtn").addEventListener("click", () => setZoom(zoom / 1.25));
  $("zoomValue").addEventListener("click", () => { if (fitMode || zoom !== 1) { fitMode = false; setZoom(1); } else { fitMode = true; fit(); } });
  $("cropApply").addEventListener("click", applyCrop);
  $("cropCancel").addEventListener("click", () => cancelCrop());
  $("downloadBtn").addEventListener("click", download);
  $("copyBtn").addEventListener("click", copy);
  $("closeBtn").addEventListener("click", requestClose);

  const slider = $("sizeSlider");
  slider.addEventListener("input", () => {
    size = parseInt(slider.value, 10);
    paintSlider(slider);
    const o = selected();
    if (o) { if (!styleSession) { pushHistory(); styleSession = true; setTimeout(() => (styleSession = false), 600); } o.size = size; requestRender(); }
    if (editing) { editing.size = size; positionTextEditor(); }
    savePrefs();
  });

  $("themeBtn").addEventListener("click", () => {
    settings.theme = themeManager.cycle();
    themeManager.mirror(settings);
    syncThemeBtn();
    store.saveSettings(settings);
    requestAnimationFrame(() => { readAccent(); requestRender(); });
  });

  document.querySelectorAll('input[name="format"]').forEach((r) => r.addEventListener("change", () => {
    $("qualityBox").classList.toggle("is-collapsed", currentFormat() !== "jpeg");
  }));
  const q = $("qualitySlider");
  q.addEventListener("input", () => { $("qualityValue").textContent = q.value + "%"; paintSlider(q); });

  new ResizeObserver(() => { if (fitMode) fit(); }).observe(stage);
}

function syncThemeBtn() {
  const icon = { light: "sun", dark: "moon", system: "monitor" }[settings.theme] || "monitor";
  $("themeBtn").innerHTML = lucide.svg(icon, 22);
}

(async function init() {
  lucide.render();
  buildPalette();
  wire();

  settings = await store.loadSettings();
  i18n.setLang(settings.language);
  themeManager.applyAll(settings);
  themeManager.watchSystemChanges(() => requestAnimationFrame(() => { readAccent(); requestRender(); }));
  syncThemeBtn();
  readAccent();

  try {
    const prefs = JSON.parse(localStorage.getItem("smartshot_editor") || "{}");
    if (/^#[0-9a-f]{6}$/i.test(prefs.color)) color = prefs.color;
    if (prefs.size >= 2 && prefs.size <= 30) size = prefs.size;
  } catch (e) { /* defaults */ }
  syncColorUI();
  $("sizeSlider").value = size;
  paintSlider($("sizeSlider"));

  document.querySelector(`input[name="format"][value="${settings.format}"]`).checked = true;
  $("qualitySlider").value = settings.quality;
  $("qualityValue").textContent = settings.quality + "%";
  paintSlider($("qualitySlider"));
  $("qualityBox").classList.toggle("is-collapsed", settings.format !== "jpeg");
  setTool("select");
  updateButtons();

  const params = new URLSearchParams(location.search);
  captureId = params.get("id");
  captureType = ["visible", "fullpage", "area"].includes(params.get("type")) ? params.get("type") : "visible";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  $("filename").value = `smartshot-${captureType}-${stamp}`;

  if (!captureId) { $("loading").classList.add("done"); return; }
  try {
    const rec = await capturesDb.get(captureId);
    if (!rec || !rec.blob) throw new Error("missing");
    await loadBlob(rec.blob);
  } catch (err) {
    $("loading").classList.add("done");
    toast("toastLoadFailed");
  }
})();
