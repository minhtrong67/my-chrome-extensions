/**
 * Case Converter — text transformation utilities
 * Pure functions, no DOM access, shared by popup and content script.
 */

const CaseUtils = (() => {
  const SMALL_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in',
    'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with', 'is', 'from'
  ]);

  function splitWords(str) {
    return str.split(/(\s+)/); // keep whitespace tokens so spacing is preserved
  }

  const transforms = {
    uppercase: (str) => str.toUpperCase(),

    lowercase: (str) => str.toLowerCase(),

    capitalize: (str) => {
      // Capitalize the first letter of every whitespace-separated word, keep
      // the rest of each word untouched. Avoids the classic ASCII "\b" word
      // boundary, which misfires on Vietnamese (and other non-ASCII) letters.
      return splitWords(str)
        .map((token) => {
          if (token === '' || /^\s+$/.test(token)) return token;
          return token.replace(/\p{L}/u, (ch) => ch.toUpperCase());
        })
        .join('');
    },

    sentenceCase: (str) => {
      const lower = str.toLowerCase();
      // Capitalize first letter of string and after sentence-ending punctuation
      return lower.replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (m) => m.toUpperCase());
    },

    titleCase: (str) => {
      const parts = splitWords(str);
      let firstWordSeen = false;
      let result = parts.map((token, idx) => {
        if (/^\s+$/.test(token) || token === '') return token;
        const isLast = idx === parts.length - 1 ||
          parts.slice(idx + 1).every((t) => /^\s+$/.test(t) || t === '');
        const lower = token.toLowerCase();
        const bareWord = lower.replace(/[^\p{L}\p{N}]/gu, '');
        const shouldLower = firstWordSeen && !isLast && SMALL_WORDS.has(bareWord);
        firstWordSeen = true;
        if (shouldLower) return lower;
        return token.replace(/\p{L}/u, (ch) => ch.toUpperCase());
      });
      return result.join('');
    },

    alternatingCase: (str) => {
      let i = 0;
      return str.replace(/\p{L}/gu, (ch) => {
        const out = i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase();
        i += 1;
        return out;
      });
    },

    inverseCase: (str) => {
      return str.replace(/\p{L}/gu, (ch) =>
        ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()
      );
    },

    removeExtraSpaces: (str) => str.replace(/[ \t]+/g, ' ').replace(/\s+\n/g, '\n').trim(),

    snakeCase: (str) =>
      str
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase(),

    kebabCase: (str) =>
      str
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase(),

    camelCase: (str) => {
      const words = str
        .trim()
        .split(/[\s_-]+/)
        .filter(Boolean);
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
    }
  };

  const ORDER = [
    'uppercase', 'lowercase', 'capitalize', 'sentenceCase', 'titleCase',
    'alternatingCase', 'inverseCase', 'snakeCase', 'kebabCase', 'camelCase',
    'removeExtraSpaces'
  ];

  function apply(id, str) {
    const fn = transforms[id];
    if (!fn) return str;
    return fn(str);
  }

  return { apply, transforms, ORDER };
})();

if (typeof module !== 'undefined') {
  module.exports = CaseUtils;
}
