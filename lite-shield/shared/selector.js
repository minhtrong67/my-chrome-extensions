// Kiểm tra chặt một selector CSS có thuộc tập "đơn giản & chắc chắn hợp lệ" hay không,
// và gom selector thành các danh sách để chèn làm CSS.
//
// Vì sao cần: một selector hỏng trong danh sách dấu phẩy làm hỏng cả luật. Selector đơn giản được gom
// bằng dấu phẩy (Chrome tách thành từng luật riêng, tra cứu nhanh theo class/id). Phần còn lại bọc trong
// :is() — danh sách "khoan dung", selector hỏng chỉ bị bỏ riêng lẻ, đổi lại khớp chậm hơn.

const SIMPLE_PSEUDO = new Set([
  'first-child', 'last-child', 'only-child', 'first-of-type', 'last-of-type', 'only-of-type', 'empty', 'root',
]);
const LIST_FUNCS = new Set(['not', 'is', 'where', 'has']);
const NTH_FUNCS = new Set(['nth-child', 'nth-last-child', 'nth-of-type', 'nth-last-of-type']);
const NTH_RE = /^\s*(?:odd|even|[+-]?\d+|[+-]?\d*n(?:\s*[+-]\s*\d+)?)\s*$/i;
const WS = /\s/;
let hasDepth = 0;

// Mỗi hàm parse* nhận (s, i) và trả về chỉ số kế tiếp, hoặc -1 nếu không hợp lệ.
const isHex = (c) => /[0-9a-fA-F]/.test(c);
const isIdentStart = (c) => /[A-Za-z_]/.test(c) || c > '\x7f';
const isIdentChar = (c) => /[A-Za-z0-9_-]/.test(c) || c > '\x7f';

function escape(s, i) {
  // s[i] === '\\'
  const c = s[i + 1];
  if (c === undefined || c === '\n' || c === '\r' || c === '\f') return -1;
  if (!isHex(c)) return i + 2;
  let j = i + 1;
  let n = 0;
  while (n < 6 && s[j] !== undefined && isHex(s[j])) (j++, n++);
  if (s[j] !== undefined && WS.test(s[j])) j++;
  return j;
}

function ident(s, i) {
  let j = i;
  if (s[j] === '-') {
    j++;
    if (s[j] === '-') {
      j++; // --custom
    } else if (s[j] === undefined || !(isIdentStart(s[j]) || s[j] === '\\')) return -1;
  } else if (s[j] === undefined || !(isIdentStart(s[j]) || s[j] === '\\')) return -1;
  while (j < s.length) {
    if (s[j] === '\\') {
      j = escape(s, j);
      if (j < 0) return -1;
    } else if (isIdentChar(s[j])) j++;
    else break;
  }
  return j;
}

function str(s, i) {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === q) return j + 1;
    if (s[j] === '\\') {
      if (s[j + 1] === undefined) return -1;
      j += 2;
    } else if (s[j] === '\n') return -1;
    else j++;
  }
  return -1;
}

const skipWs = (s, i) => {
  while (i < s.length && WS.test(s[i])) i++;
  return i;
};

function attr(s, i) {
  // s[i] === '['
  let j = skipWs(s, i + 1);
  j = ident(s, j);
  if (j < 0) return -1;
  j = skipWs(s, j);
  if (s[j] === ']') return j + 1;
  const op = s.slice(j, j + 2);
  if (op === '=' || s[j] === '=') j += 1;
  else if (['~=', '|=', '^=', '$=', '*='].includes(op)) j += 2;
  else return -1;
  j = skipWs(s, j);
  j = s[j] === '"' || s[j] === "'" ? str(s, j) : ident(s, j);
  if (j < 0) return -1;
  j = skipWs(s, j);
  if ((s[j] === 'i' || s[j] === 'I' || s[j] === 's' || s[j] === 'S') && !isIdentChar(s[j + 1] ?? ' ')) j = skipWs(s, j + 1);
  return s[j] === ']' ? j + 1 : -1;
}

function pseudo(s, i, depth) {
  // s[i] === ':'
  if (s[i + 1] === ':') return -1; // không cho pseudo-element
  let j = ident(s, i + 1);
  if (j < 0) return -1;
  const name = s.slice(i + 1, j).toLowerCase();
  if (s[j] !== '(') return SIMPLE_PSEUDO.has(name) ? j : -1;
  if (NTH_FUNCS.has(name)) {
    const close = s.indexOf(')', j);
    return close > 0 && NTH_RE.test(s.slice(j + 1, close)) ? close + 1 : -1;
  }
  if (!LIST_FUNCS.has(name) || depth > 3) return -1;
  if (name === 'has') {
    if (hasDepth > 0) return -1; // Chrome không cho :has() lồng trong :has()
    hasDepth++;
  }
  const end = list(s, j + 1, depth + 1, name === 'has');
  if (name === 'has') hasDepth--;
  return end > 0 && s[end] === ')' ? end + 1 : -1;
}

function compound(s, i, depth) {
  let j = i;
  let any = false;
  if (s[j] === '*') (j++, (any = true));
  else {
    const k = ident(s, j);
    if (k > 0) (j = k, (any = true));
  }
  for (;;) {
    const c = s[j];
    let k;
    if (c === '#' || c === '.') k = ident(s, j + 1);
    else if (c === '[') k = attr(s, j);
    else if (c === ':') k = pseudo(s, j, depth);
    else break;
    if (k < 0) return -1;
    j = k;
    any = true;
  }
  return any ? j : -1;
}

// Một selector phức hợp: compound (combinator compound)*. relative: cho phép combinator ở đầu (trong :has).
function complex(s, i, depth, relative) {
  let j = skipWs(s, i);
  if (relative && '>+~'.includes(s[j] ?? '')) j = skipWs(s, j + 1);
  j = compound(s, j, depth);
  if (j < 0) return -1;
  for (;;) {
    const k = skipWs(s, j);
    let m = k;
    if ('>+~'.includes(s[k] ?? '')) m = skipWs(s, k + 1);
    else if (k === j) return j; // không có khoảng trắng/combinator → hết
    if (m >= s.length || s[m] === ',' || s[m] === ')') return k === j ? j : -1; // combinator thừa ở cuối
    const n = compound(s, m, depth);
    if (n < 0) return -1;
    j = n;
  }
}

function list(s, i, depth, relative) {
  let j = complex(s, i, depth, relative);
  while (j > 0) {
    const k = skipWs(s, j);
    if (s[k] !== ',') return k;
    j = complex(s, k + 1, depth, relative);
  }
  return -1;
}

export function isSimpleSelector(sel) {
  if (typeof sel !== 'string' || !sel || sel.length > 600) return false;
  hasDepth = 0;
  const end = list(sel, 0, 0, false);
  return end === sel.length || (end > 0 && skipWs(sel, end) === sel.length);
}

// Selector nguy hiểm cho cả luật CSS: ký tự phá cấu trúc.
const BREAKS = /[{};]|\/\*|<\/|\n/;

// Gom thành các "danh sách chọn" dùng trực tiếp làm tiền tố luật CSS hoặc đối số querySelectorAll.
export function toSelectorChunks(selectors, size = 100) {
  const plain = [];
  const loose = [];
  for (const raw of selectors) {
    const s = String(raw).trim();
    if (!s || BREAKS.test(s)) continue;
    // Selector đơn giản có thể chứa dấu phẩy ở cấp cao nhất: tách ra để đếm/gom độc lập.
    (isSimpleSelector(s) ? plain : loose).push(s);
  }
  const out = [];
  for (let i = 0; i < plain.length; i += size) out.push(plain.slice(i, i + size).join(','));
  for (let i = 0; i < loose.length; i += size) out.push(`:is(${loose.slice(i, i + size).join(',')})`);
  return out;
}

export const hideCss = (chunks) => chunks.map((c) => `${c}{display:none!important}`).join('\n');
