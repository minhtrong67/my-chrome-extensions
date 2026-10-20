/* Password Generator — core generation logic.
 * Every random choice uses crypto.getRandomValues (never Math.random) with
 * rejection sampling, so results are uniform and free of modulo bias. */

const CHAR_SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~"
};
const AMBIGUOUS_CHARS = "Il1O0";
const UINT32_SPACE = 0x100000000;

/** Uniform secure integer in [0, max). */
function secureRandomInt(max) {
  if (max <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(UINT32_SPACE / max) * max;
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % max;
}

/** In-place Fisher–Yates shuffle using the secure source. */
function secureShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const generator = {
  /**
   * options: { length, upper, lower, numbers, symbols, excludeAmbiguous, noDuplicate, customExclude }
   * returns: { value, bits, error, warning }
   */
  generatePassword(o) {
    const excluded = new Set(Array.from(o.customExclude || ""));
    if (o.excludeAmbiguous) Array.from(AMBIGUOUS_CHARS).forEach((c) => excluded.add(c));

    const enabled = ["upper", "lower", "numbers", "symbols"].filter((k) => o[k]);
    if (enabled.length === 0) return { value: "", bits: 0, error: "errNoType" };

    const sets = enabled
      .map((k) => Array.from(CHAR_SETS[k]).filter((c) => !excluded.has(c)))
      .filter((s) => s.length > 0);
    if (sets.length === 0) return { value: "", bits: 0, error: "errAllExcluded" };

    const pool = sets.flat();
    const target = Math.max(o.length, sets.length);
    // One guaranteed character per enabled set, so every chosen type really appears.
    const result = sets.map((s) => s[secureRandomInt(s.length)]);
    let warning = null;

    if (o.noDuplicate) {
      const remaining = pool.filter((c) => !result.includes(c));
      secureShuffle(remaining);
      const need = target - result.length;
      if (need > remaining.length) warning = "warnShorter";
      result.push(...remaining.slice(0, Math.max(0, need)));
    } else {
      while (result.length < target) result.push(pool[secureRandomInt(pool.length)]);
    }
    secureShuffle(result);

    // Entropy: with unique characters the pool shrinks on every pick.
    let bits = 0;
    for (let i = 0; i < result.length; i++) {
      bits += Math.log2(o.noDuplicate ? Math.max(pool.length - i, 1) : pool.length);
    }
    return { value: result.join(""), bits, error: null, warning };
  },

  /** options: { wordCount, separator, capitalize, addNumber } */
  generatePassphrase(o) {
    const words = [];
    for (let i = 0; i < o.wordCount; i++) {
      const w = PASSPHRASE_WORDS[secureRandomInt(PASSPHRASE_WORDS.length)];
      words.push(o.capitalize ? w[0].toUpperCase() + w.slice(1) : w);
    }
    let bits = o.wordCount * Math.log2(PASSPHRASE_WORDS.length);
    if (o.addNumber) {
      words.push(String(secureRandomInt(90) + 10));
      bits += Math.log2(90);
    }
    return { value: words.join(o.separator), bits, error: null, warning: null };
  },

  /** options: { pinLength } */
  generatePin(o) {
    const n = Math.max(4, o.pinLength || 6);
    let value = "";
    for (let i = 0; i < n; i++) value += secureRandomInt(10);
    return { value, bits: n * Math.log2(10), error: null, warning: null };
  },

  /** 0 (weak) … 4 (very strong) from an entropy estimate in bits. */
  score(bits) {
    if (bits <= 0) return -1;
    if (bits < 36) return 0;
    if (bits < 60) return 1;
    if (bits < 80) return 2;
    if (bits < 100) return 3;
    return 4;
  },

  /** Average-case seconds to brute-force at 10 billion guesses/second. */
  crackSeconds(bits) {
    return Math.pow(2, bits) / 1e10 / 2;
  }
};
