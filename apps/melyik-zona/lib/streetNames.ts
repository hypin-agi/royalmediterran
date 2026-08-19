/**
 * Magyar közterületnevek normalizálása összehasonlításhoz.
 *
 * MIÉRT KELL
 * ----------
 * A hivatalos zónajegyzékek utcanevekkel dolgoznak ("Tűzoltó u."), az
 * OpenStreetMap viszont a saját írásmódját adja ("Tűzoltó utca"). Ha ezt a
 * kettőt nyersen hasonlítjuk össze, a találatok nagy része elveszik.
 *
 * MIT NEM CSINÁLUNK
 * -----------------
 * Nem vonjuk össze a különböző közterület-típusokat. A „Váci út" és a
 * „Váci utca" két külön közterület, más zónában — ezek egybemosása
 * rosszabb lenne, mint a találat hiánya. Csak a rövidítéseket oldjuk fel a
 * saját teljes alakjukra.
 */

/** Rövidítés → teljes alak. Csak az utolsó szóra alkalmazzuk. */
const SUFFIXES: Record<string, string> = {
  u: "utca",
  utc: "utca",
  krt: "korut",
  rkp: "rakpart",
  stny: "setany",
  sgt: "sugarut",
  ltp: "lakotelep",
  hrsz: "hrsz",
};

/** Ékezetek eltávolítása — a kereséshez, nem a megjelenítéshez. */
export function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ő/g, "o")
    .replace(/ű/g, "u")
    .replace(/Ő/g, "O")
    .replace(/Ű/g, "U");
}

/**
 * Normalizált kulcs egy közterületnévhez.
 * "Tűzoltó u."      → "tuzolto utca"
 * "TŰZOLTÓ UTCA"    → "tuzolto utca"
 * "József krt."     → "jozsef korut"
 * "Váci út"         → "vaci ut"   (nem "vaci utca"!)
 */
export function normalizeStreet(name: string): string {
  if (!name) return "";

  let text = stripDiacritics(name.normalize("NFC"))
    .toLowerCase()
    // A házszám-jellegű farok nem része a névnek.
    .replace(/\s+\d+([-/]\d+)?\.?\s*$/u, "")
    // Írásjelek egységesítése, a pontot külön kezeljük a rövidítéseknél.
    .replace(/[,;()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = text.split(" ").filter(Boolean);
  if (tokens.length === 0) return "";

  const last = tokens[tokens.length - 1].replace(/\.$/, "");
  if (SUFFIXES[last] !== undefined) {
    tokens[tokens.length - 1] = SUFFIXES[last];
  } else {
    tokens[tokens.length - 1] = last;
  }

  return tokens.join(" ").replace(/\./g, "").trim();
}

/**
 * Kerület normalizálása. Elfogadja a római számot, az arab számot és az
 * OSM-ben szokásos "IX. kerület" alakot is; egységesen arab sorszámot ad.
 * Ha nem ismerhető fel, null.
 */
export function normalizeDistrict(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = stripDiacritics(value).toLowerCase().trim();

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

const ROMAN_VALUES: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100,
};

export function romanToArabic(roman: string): number | null {
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
