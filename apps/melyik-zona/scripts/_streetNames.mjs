/**
 * A lib/streetNames.ts JavaScript-párja az importáló scriptekhez.
 * A két megvalósításnak egyeznie kell — erre teszt is van
 * (tests/streetNames.test.cjs: "a script és az app normalizálója egyezik").
 */

const SUFFIXES = {
  u: "utca", utc: "utca", krt: "korut", rkp: "rakpart",
  stny: "setany", sgt: "sugarut", ltp: "lakotelep", hrsz: "hrsz",
};

export function stripDiacritics(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ő/g, "o").replace(/ű/g, "u")
    .replace(/Ő/g, "O").replace(/Ű/g, "U");
}

export function normalizeStreet(name) {
  if (!name) return "";
  const text = stripDiacritics(name.normalize("NFC"))
    .toLowerCase()
    .replace(/\s+\d+([-/]\d+)?\.?\s*$/u, "")
    .replace(/[,;()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = text.split(" ").filter(Boolean);
  if (tokens.length === 0) return "";

  const last = tokens[tokens.length - 1].replace(/\.$/, "");
  tokens[tokens.length - 1] = SUFFIXES[last] !== undefined ? SUFFIXES[last] : last;
  return tokens.join(" ").replace(/\./g, "").trim();
}

const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100 };

export function romanToArabic(roman) {
  if (!/^[IVXLC]+$/.test(roman)) return null;
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = ROMAN_VALUES[roman[i]];
    const next = ROMAN_VALUES[roman[i + 1]];
    if (next !== undefined && current < next) total -= current;
    else total += current;
  }
  return total > 0 ? total : null;
}

export function normalizeDistrict(value) {
  if (!value) return null;
  const text = stripDiacritics(String(value)).toLowerCase().trim();
  const arab = text.match(/^(\d{1,2})\.?\s*(ker|kerulet)?/);
  if (arab) {
    const n = Number(arab[1]);
    if (n >= 1 && n <= 23) return n;
  }
  const roman = text.match(/^([ivxlc]+)\.?\s*(ker|kerulet)?/);
  if (roman) {
    const n = romanToArabic(roman[1].toUpperCase());
    if (n !== null && n >= 1 && n <= 23) return n;
  }
  return null;
}
