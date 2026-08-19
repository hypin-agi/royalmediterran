/**
 * Utcanév → zónakód megfeleltetés.
 *
 * MIÉRT EZ A MÁSODIK ÚT
 * ---------------------
 * A zónahatárokat poligonként megszerezni nehéz. A hivatalos zónajegyzékek
 * viszont utcanevekkel dolgoznak: „Tűzoltó utca → 3061". Ezt táblázatként
 * jóval könnyebb beszerezni, mint egy geometriai állományt.
 *
 * A GPS-pontból az OpenStreetMap megbízhatóan megadja a legközelebbi utca
 * nevét és a kerületet — a kettőt összekapcsolva a zónakód poligon nélkül is
 * megvan. Ez a réteg pontosan ezt teszi.
 *
 * HOL A HATÁRA
 * ------------
 * Egy utca átnyúlhat két zónán (jellemzően házszám szerint). Ilyenkor NEM
 * választunk: `ambiguous` állapotot adunk vissza az összes szóba jövő kóddal,
 * és a felület megmondja, hogy a táblát kell megnézni. Egy tippelt kód
 * büntetést ér — a bizonytalanság kimondása nem.
 */

import rawTable from "../data/street-zones.json";
import { normalizeDistrict, normalizeStreet } from "./streetNames";

export type StreetZoneEntry = {
  /** Az utcanév eredeti, megjelenítésre szánt alakja. */
  street: string;
  /** Normalizált kulcs — ezen keresünk. */
  key: string;
  city: string | null;
  /** Kerület arab sorszámként (Budapest), különben null. */
  district: number | null;
  code: string;
  /** Házszám-tartomány szövegesen, ha a forrás megadja (pl. "1-25 páratlan"). */
  houseNumbers: string | null;
  openingHours: string | null;
  hourlyRateHUF: number | null;
  maxstay: string | null;
};

export type StreetZoneTable = {
  version: string;
  source: string;
  license: string;
  fetchedAt: string | null;
  entries: StreetZoneEntry[];
};

const table = rawTable as unknown as StreetZoneTable;

export function getStreetZoneTable(): StreetZoneTable {
  return table;
}

export function hasStreetZoneTable(): boolean {
  return Array.isArray(table.entries) && table.entries.length > 0;
}

export type StreetZoneLookup =
  | { status: "none"; entries: []; code: null }
  | { status: "match"; entries: StreetZoneEntry[]; code: string }
  | { status: "ambiguous"; entries: StreetZoneEntry[]; code: null };

/**
 * A tiszta, tesztelhető mag: adott bejegyzéslistában keres.
 */
export function lookupStreetIn(
  entries: StreetZoneEntry[],
  streetName: string | null | undefined,
  context: { district?: string | number | null; city?: string | null } = {},
): StreetZoneLookup {
  if (!streetName) return { status: "none", entries: [], code: null };

  const key = normalizeStreet(streetName);
  if (!key) return { status: "none", entries: [], code: null };

  let candidates = entries.filter((entry) => entry.key === key);
  if (candidates.length === 0) return { status: "none", entries: [], code: null };

  // Kerület szerinti szűkítés: ugyanaz az utcanév több kerületben is létezik.
  const district =
    typeof context.district === "number"
      ? context.district
      : normalizeDistrict(context.district ?? null);

  if (district !== null) {
    const sameDistrict = candidates.filter((entry) => entry.district === district);
    if (sameDistrict.length > 0) candidates = sameDistrict;
  }

  // Település szerinti szűkítés, ha van értelmezhető városnév.
  if (context.city) {
    const city = context.city.toLowerCase();
    const sameCity = candidates.filter(
      (entry) => entry.city && entry.city.toLowerCase() === city,
    );
    if (sameCity.length > 0) candidates = sameCity;
  }

  const codes = new Set(candidates.map((entry) => entry.code));
  if (codes.size === 1) {
    return { status: "match", entries: candidates, code: [...codes][0] };
  }
  return { status: "ambiguous", entries: candidates, code: null };
}

export function lookupStreet(
  streetName: string | null | undefined,
  context: { district?: string | number | null; city?: string | null } = {},
): StreetZoneLookup {
  return lookupStreetIn(table.entries, streetName, context);
}
