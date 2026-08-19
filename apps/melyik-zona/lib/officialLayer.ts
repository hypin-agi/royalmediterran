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
