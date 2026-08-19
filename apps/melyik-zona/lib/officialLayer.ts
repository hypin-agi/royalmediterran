/**
 * A hivatalos zónakészlet beillesztése az OSM-ből számolt válaszba.
 *
 * Külön modul, mert ez a termék legfontosabb döntése: ha van hivatalos
 * találat, az felülír minden OSM-alapú következtetést. Így tesztelhető
 * anélkül, hogy hálózatot vagy Next-route-ot kellene indítani.
 */

import type { Verdict, ZoneLookup } from "./zone";
import { getDataset, type ZoneFeature } from "./zoneDataset";
import type { LatLon } from "./geo";
import {
  getStreetZoneTable,
  lookupStreetIn,
  type StreetZoneEntry,
} from "./streetZones";

/** Üres váz, ha az Overpass kiesett, de hivatalos adatunk van. */
export function emptyLookup(point: LatLon): ZoneLookup {
  return {
    point,
    verdict: {
      paid: "unknown",
      source: "none",
      code: null,
      confidence: "low",
      hoursExpression: null,
      charge: null,
      maxstay: null,
      evidence: [],
    },
    zones: [],
    nearbyZones: [],
    streetName: null,
    streets: [],
    lots: [],
    admin: { city: null, district: null, areas: [] },
  };
}

export function officialVerdict(feature: ZoneFeature): Verdict {
  const dataset = getDataset();
  return {
    paid: "paid",
    source: "official",
    code: feature.code,
    confidence: "high",
    hoursExpression: feature.openingHours,
    charge:
      feature.hourlyRateHUF === null
        ? null
        : `${feature.hourlyRateHUF.toLocaleString("hu-HU")} Ft/óra`,
    maxstay: feature.maxstay,
    evidence: [
      feature.name
        ? `A pont a(z) „${feature.name}” zóna (${feature.code}) hivatalos határán belül van.`
        : `A pont a(z) ${feature.code} zóna hivatalos határán belül van.`,
      `Adatkészlet: ${dataset.source} (${dataset.version}).`,
    ],
  };
}

/**
 * A hivatalos találat felülírja az OSM-ből számolt verdiktet, de az OSM-ből
 * jövő kontextust (utcanév, kerület, térkép) megtartjuk.
 */
export function applyOfficial(
  lookup: ZoneLookup,
  official: { feature: ZoneFeature } | null,
): ZoneLookup {
  if (!official) return lookup;

  const feature = official.feature;
  return {
    ...lookup,
    verdict: officialVerdict(feature),
    zones: [
      {
        osmType: "relation",
        osmId: 0,
        osmUrl: null,
        code: feature.code,
        name: feature.name,
        containsPoint: true,
        distanceMeters: null,
        fee: "yes",
        charge:
          feature.hourlyRateHUF === null
            ? null
            : `${feature.hourlyRateHUF.toLocaleString("hu-HU")} Ft/óra`,
        openingHours: feature.openingHours,
        maxstay: feature.maxstay,
        operator: feature.operator,
        website: null,
        tags: {},
        outline: feature.polygons.flatMap((polygon) => polygon.outers),
      },
      ...lookup.zones,
    ],
    admin: {
      ...lookup.admin,
      city: lookup.admin.city ?? feature.city,
      district: lookup.admin.district ?? feature.district,
    },
  };
}

/**
 * Utcajegyzék-réteg: a GPS-pont mellé az OpenStreetMapből megkapott utcanevet
 * és kerületet összevetjük a hivatalos utcajegyzékkel.
 *
 * Akkor fut, ha nincs hivatalos poligon-találat. Ha az utca több zónán fut át,
 * NEM választunk egyet: `code` marad null, és felsoroljuk a lehetőségeket.
 */
export function applyStreetZone(
  lookup: ZoneLookup,
  entries: StreetZoneEntry[] = getStreetZoneTable().entries,
): ZoneLookup {
  const result = lookupStreetIn(entries, lookup.streetName, {
    district: lookup.admin.district,
    city: lookup.admin.city,
  });

  if (result.status === "none") return lookup;

  const table = getStreetZoneTable();
  const first = result.entries[0];
  const hasHouseRanges = result.entries.some((entry) => entry.houseNumbers);

  if (result.status === "ambiguous") {
    return {
      ...lookup,
      verdict: {
        paid: "paid",
        source: "street-table",
        code: null,
        confidence: "medium",
        hoursExpression: first.openingHours,
        charge:
          first.hourlyRateHUF === null
            ? null
            : `${first.hourlyRateHUF.toLocaleString("hu-HU")} Ft/óra`,
        maxstay: first.maxstay,
        evidence: [
          `${first.street}: a hivatalos utcajegyzék szerint fizetős, de ez a közterület több zónára esik.`,
          "Házszám nélkül nem dönthető el, melyikbe tartozol — a zónatáblán ellenőrizd.",
          `Adatkészlet: ${table.source} (${table.version}).`,
        ],
        alternatives: result.entries.map((entry) => ({
          code: entry.code,
          houseNumbers: entry.houseNumbers,
        })),
      },
    };
  }

  return {
    ...lookup,
    verdict: {
      paid: "paid",
      source: "street-table",
      code: result.code,
      confidence: hasHouseRanges ? "medium" : "high",
      hoursExpression: first.openingHours,
      charge:
        first.hourlyRateHUF === null
          ? null
          : `${first.hourlyRateHUF.toLocaleString("hu-HU")} Ft/óra`,
      maxstay: first.maxstay,
      evidence: [
        `${first.street}: a hivatalos utcajegyzék szerint a ${result.code} zónába tartozik.`,
        ...(hasHouseRanges
          ? [
              `A jegyzék házszám szerinti bontást is tartalmaz (${first.houseNumbers}) — a tábla a mérvadó.`,
            ]
          : []),
        `Adatkészlet: ${table.source} (${table.version}).`,
      ],
    },
  };
}
