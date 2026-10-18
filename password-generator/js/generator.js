// LockSmith — generator module
// Uses crypto.getRandomValues for cryptographically secure randomness
// throughout — never Math.random(), which is not safe for anything
// security-sensitive (it's not a CSPRNG and its output is predictable).

const CHAR_SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~"
};

const AMBIGUOUS_CHARS = "l1IO0";

// The size of the space crypto.getRandomValues(Uint32Array) draws from:
// values range over [0, 2^32 - 1], i.e. 2^32 possible outcomes.
const UINT32_SPACE = 0x100000000; // 2^32

/**
 * Draw a cryptographically secure random integer in [0, maxExclusive) with
 * a perfectly uniform distribution, using rejection sampling to eliminate
 * modulo bias (naively doing `randomUint32() % max` skews low values
 * slightly more likely whenever max doesn't evenly divide 2^32).
 */
function secureRandomInt(maxExclusive) {
  const arr = new Uint32Array(1);
  // Largest multiple of maxExclusive that is <= the full 2^32 space. Any
  // draw landing at or above this is discarded and re-rolled, so every
  // surviving draw is equally likely modulo maxExclusive.
  const limit = Math.floor(UINT32_SPACE / maxExclusive) * maxExclusive;
  let val;
  do {
    crypto.getRandomValues(arr);
    val = arr[0];
  } while (val >= limit);
  return val % maxExclusive;
}

/** Fisher-Yates shuffle using the same secure source, so the final
 *  character order doesn't leak anything about generation order. */
function secureShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const generator = {
  /**
   * Build a password from the given options.
   * options: { length, upper, lower, numbers, symbols, excludeAmbiguous, noDuplicate, customExclude }
   * Returns { value, error, warning, poolSize }
   *   - error:   set (and value === "") when no character type could be used at all.
   *   - warning: set when noDuplicate + the exclusion filters left too few unique
   *              characters to reach the requested length, so the actual result
   *              is shorter than asked for. The caller should surface this
   *              clearly — a silently-shorter-than-requested password is a real
   *              security footgun, not just a cosmetic inconvenience.
   *   - poolSize: the number of distinct characters actually available, used by
   *              scoreStrength() for an accurate entropy estimate instead of a
   *              rough guess.
   */
  generatePassword(options) {
    let pool = "";
    const guaranteed = [];

    const addSet = (flag, set) => {
      if (!flag) return;
      let chars = set;
      if (options.excludeAmbiguous) {
        chars = chars.split("").filter((c) => !AMBIGUOUS_CHARS.includes(c)).join("");
      }
      if (options.customExclude) {
        const excludeList = options.customExclude.split("");
        chars = chars.split("").filter((c) => !excludeList.includes(c)).join("");
      }
      if (chars.length === 0) return;
      pool += chars;
      guaranteed.push(chars[secureRandomInt(chars.length)]);
    };

    addSet(options.upper, CHAR_SETS.upper);
    addSet(options.lower, CHAR_SETS.lower);
    addSet(options.numbers, CHAR_SETS.numbers);
    addSet(options.symbols, CHAR_SETS.symbols);

    if (pool.length === 0) {
      return { value: "", error: "needOneCharType", warning: null, poolSize: 0 };
    }

    const length = Math.max(options.length, guaranteed.length);
    const poolChars = pool.split("");
    const result = [...guaranteed];

    const usedChars = new Set(options.noDuplicate ? guaranteed : []);
    let ranOut = false;

    while (result.length < length) {
      let candidatePool = poolChars;
      if (options.noDuplicate) {
        candidatePool = poolChars.filter((c) => !usedChars.has(c));
        if (candidatePool.length === 0) { ranOut = true; break; } // ran out of unique chars
      }
      const ch = candidatePool[secureRandomInt(candidatePool.length)];
      result.push(ch);
      if (options.noDuplicate) usedChars.add(ch);
    }

    secureShuffle(result);
    return {
      value: result.join(""),
      error: null,
      warning: ranOut ? "warningShorterThanRequested" : null,
      poolSize: poolChars.length
    };
  },

  /**
   * Build a passphrase from the given options.
   * options: { wordCount, separator, capitalize, addNumber }
   */
  generatePassphrase(options) {
    const words = [];
    for (let i = 0; i < options.wordCount; i++) {
      let w = PASSPHRASE_WORDS[secureRandomInt(PASSPHRASE_WORDS.length)];
      if (options.capitalize) w = w.charAt(0).toUpperCase() + w.slice(1);
      words.push(w);
    }
    if (options.addNumber) {
      words.push(String(secureRandomInt(90) + 10));
    }
    return { value: words.join(options.separator), error: null, warning: null };
  },

  /**
   * Build a numeric PIN — e.g. for a door code, ATM card, or SIM lock.
   * options: { length }
   * Every digit is drawn independently and uniformly (unlike a password,
   * there's no "guarantee one of each type" step — a PIN has only one
   * character type by definition).
   */
  generatePin(options) {
    const length = Math.max(4, options.pinLength || 6);
    let value = "";
    for (let i = 0; i < length; i++) {
      value += String(secureRandomInt(10));
    }
    return { value, error: null, warning: null };
  },

  /**
   * Estimate password/passphrase/PIN strength on a 0-4 scale using an
   * entropy calculation appropriate to each mode:
   *   - password:   log2(actualPoolSize) * length — uses the REAL character
   *                 pool size the generator drew from (passed in as
   *                 `poolSize`), not a rough guess, so toggling e.g.
   *                 "exclude ambiguous characters" is correctly reflected.
   *   - passphrase: 11 bits/word (log2(2048), the BIP-39 wordlist size) +
   *                 ~6.5 bits if a trailing number was appended.
   *   - pin:        log2(10) * length — digits only.
   */
  scoreStrength(value, mode, extra = {}) {
    if (!value) return 0;
    const bits = this.estimateEntropyBits(value, mode, extra);
    if (bits < 28) return 0;
    if (bits < 45) return 1;
    if (bits < 60) return 2;
    if (bits < 80) return 3;
    return 4;
  },

  /** Returns the estimated entropy, in bits, behind a generated value. */
  estimateEntropyBits(value, mode, extra = {}) {
    if (!value) return 0;

    if (mode === "passphrase") {
      const parts = value.split(/[-_.\s]/).filter(Boolean);
      // A trailing 2-digit number (10-99) contributes log2(90) bits; every
      // other part is a dictionary word contributing log2(2048) = 11 bits.
      const lastIsNumber = /^\d+$/.test(parts[parts.length - 1] || "");
      const wordCount = lastIsNumber ? parts.length - 1 : parts.length;
      let bits = wordCount * Math.log2(PASSPHRASE_WORDS.length);
      if (lastIsNumber) bits += Math.log2(90);
      return bits;
    }

    if (mode === "pin") {
      return value.length * Math.log2(10);
    }

    // password mode
    const poolSize = extra.poolSize || estimatePoolSizeFromValue(value);
    return value.length * Math.log2(Math.max(poolSize, 2));
  },

  /**
   * Turn an entropy estimate into a rough, human-readable "time to crack"
   * string, assuming a determined offline attacker at 10 billion
   * guesses/second (a realistic modern GPU-cluster benchmark for a fast,
   * unsalted hash — intentionally a conservative/pessimistic assumption for
   * the user, since it's always safer to under-promise on security).
   * Callers pass in the two translated unit-label functions so this module
   * doesn't need to know about i18n directly.
   */
  formatCrackTime(bits, t) {
    const guessesPerSecond = 1e10;
    // Average case: an attacker finds it halfway through the keyspace.
    const seconds = Math.pow(2, bits) / guessesPerSecond / 2;

    const YEAR = 365.25 * 24 * 3600;
    if (seconds < 1) return t("crackInstant");
    if (seconds < 60) return t("crackSeconds", Math.round(seconds));
    if (seconds < 3600) return t("crackMinutes", Math.round(seconds / 60));
    if (seconds < 86400) return t("crackHours", Math.round(seconds / 3600));
    if (seconds < YEAR) return t("crackDays", Math.round(seconds / 86400));
    const years = seconds / YEAR;
    if (years < 1000) return t("crackYears", Math.round(years));
    if (years < 1e6) return t("crackThousandYears", Math.round(years / 1e3));
    if (years < 1e9) return t("crackMillionYears", Math.round(years / 1e6));
    return t("crackBillionYears", Math.round(years / 1e9));
  }
};

/** Fallback pool-size estimate for callers that don't pass one explicitly
 *  (kept only as a safety net — generatePassword() always supplies the
 *  real poolSize now, so this path should rarely execute). */
function estimatePoolSizeFromValue(value) {
  let size = 0;
  if (/[a-z]/.test(value)) size += 26;
  if (/[A-Z]/.test(value)) size += 26;
  if (/[0-9]/.test(value)) size += 10;
  if (/[^a-zA-Z0-9]/.test(value)) size += 28;
  return size || 26;
}
