import {
  assembleRings,
  distanceToRings,
  pointInPolygon,
  type LatLon,
  type Ring,
} from "./geo";
import type { OverpassElement, OverpassResponse } from "./overpass";
import {
  parseStreetParking,
  summariseStreet,
  type StreetParkingInfo,
  type StreetVerdict,
} from "./streetParking";
import { haversineMeters } from "./geo";

export type ZoneMatch = {
  osmType: "way" | "relation" | "area";
  osmId: number;
  osmUrl: string | null;
  /** A zónakód, amit a parkolóautomatába / applikációba be kell írni. */
  code: string | null;
  name: string | null;
  /** true = a GPS-pont a zóna poligonján belül van. */
  containsPoint: boolean;
  /** Méter a zóna legközelebbi határpontjáig (ha van geometriánk). */
  distanceMeters: number | null;
  fee: string | null;
  charge: string | null;
  openingHours: string | null;
  maxstay: string | null;
  operator: string | null;
  website: string | null;
  /** Minden további OSM tag, hogy semmi ne vesszen el. */
  tags: Record<string, string>;
  /** Külső gyűrűk a térképhez (ritkított). */
  outline: Ring[];
};

export type AdminArea = { name: string; adminLevel: number | null };

export type StreetLayer = StreetParkingInfo & { verdict: StreetVerdict };

export type ParkingLot = {
  osmType: "way" | "relation";
  osmId: number;
  osmUrl: string;
  name: string | null;
  fee: string | null;
  charge: string | null;
  openingHours: string | null;
  maxstay: string | null;
  distanceMeters: number | null;
};

/** Mennyire bízhat a felhasználó a válaszban. */
export type Confidence = "high" | "medium" | "low";

export type Verdict = {
  /** `paid` = fizetős szakasz, `free` = az adat szerint nem fizetős. */
  paid: "paid" | "free" | "unknown";
  /** Melyik rétegből jött a válasz. */
  /** `official` = repóba importált hivatalos zónakészlet (a legerősebb). */
  source: "official" | "zone" | "street" | "lot" | "none";
  /** A zónakód, ha bármelyik réteg tudja. */
  code: string | null;
  confidence: Confidence;
  /** Kiértékelhető `opening_hours` kifejezés, ha van. */
  hoursExpression: string | null;
  charge: string | null;
  maxstay: string | null;
  /** Emberi nyelvű indoklás, mire alapoztuk a választ. */
  evidence: string[];
};

export type ZoneLookup = {
  point: LatLon;
  verdict: Verdict;
  zones: ZoneMatch[];
  nearbyZones: ZoneMatch[];
  /** A legközelebbi úttest neve — akkor is, ha nincs rajta parkolási adat. */
  streetName: string | null;
  streets: StreetLayer[];
  lots: ParkingLot[];
  admin: { city: string | null; district: string | null; areas: AdminArea[] };
};

const CODE_KEYS = [
  "ref",
  "zone:code",
  "zone_code",
  "parking:zone",
  "zone:parking:code",
  "code",
  "short_name",
];

const OSM_ELEMENT_BASE: Record<string, string> = {
  way: "https://www.openstreetmap.org/way/",
  relation: "https://www.openstreetmap.org/relation/",
};

/** Overpass area-id → eredeti OSM objektum (3600000000 fölött relation). */
function areaToOsm(id: number): { type: "way" | "relation"; id: number } | null {
  if (id > 3_600_000_000) return { type: "relation", id: id - 3_600_000_000 };
  if (id > 2_400_000_000) return { type: "way", id: id - 2_400_000_000 };
  return null;
}

function firstTag(
  tags: Record<string, string>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = tags[key];
    if (value && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Zónakód kinyerése. Elsőként a dedikált kód-tageket nézzük; ha azok üresek,
 * a névből próbálunk egy önálló 3–5 jegyű számot kiolvasni (a magyar zónakódok
 * ilyenek, és sok helyen a `name` tartalmazza őket).
 */
export function extractCode(tags: Record<string, string>): string | null {
  const direct = firstTag(tags, CODE_KEYS);
  if (direct) return direct;

  const name = tags.name ?? tags["name:hu"] ?? "";
  const match = name.match(/(?<![\d])(\d{3,5})(?![\d])/);
  return match ? match[1] : null;
}

/** Payload-méret korlátozás: gyűrűnként legfeljebb ~120 pont. */
function decimateRing(ring: Ring, maxPoints = 120): Ring {
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const out: Ring = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  if (out[out.length - 1] !== ring[ring.length - 1]) out.push(ring[ring.length - 1]);
  return out;
}

function ringsOf(element: OverpassElement): { outers: Ring[]; inners: Ring[] } {
  if (element.type === "way") {
    const ring = (element.geometry ?? []).map((p) => ({ lat: p.lat, lon: p.lon }));
    return { outers: ring.length >= 3 ? [ring] : [], inners: [] };
  }

  const outerSegments: Ring[] = [];
  const innerSegments: Ring[] = [];
  for (const member of element.members ?? []) {
    if (!member.geometry || member.geometry.length < 2) continue;
    const segment = member.geometry.map((p) => ({ lat: p.lat, lon: p.lon }));
    if (member.role === "inner") innerSegments.push(segment);
    else outerSegments.push(segment);
  }

  return {
    outers: assembleRings(outerSegments),
    inners: assembleRings(innerSegments),
  };
}

function toZoneMatch(element: OverpassElement, point: LatLon): ZoneMatch {
  const tags = { ...(element.tags ?? {}) };
  const { outers, inners } = ringsOf(element);
  const hasGeometry = outers.length > 0;

  const osm =
    element.type === "area"
      ? areaToOsm(element.id)
      : { type: element.type as "way" | "relation", id: element.id };

  const known = new Set([
    "fee",
    "charge",
    "opening_hours",
    "maxstay",
    "operator",
    "website",
    "name",
  ]);

  return {
    osmType: element.type === "area" ? (osm?.type ?? "area") : (element.type as "way" | "relation"),
    osmId: osm?.id ?? element.id,
    osmUrl: osm ? `${OSM_ELEMENT_BASE[osm.type]}${osm.id}` : null,
    code: extractCode(tags),
    name: tags.name ?? tags["name:hu"] ?? null,
    // area-ként visszakapott zóna definíció szerint tartalmazza a pontot
    containsPoint:
      element.type === "area"
        ? true
        : hasGeometry && pointInPolygon(point, { outers, inners }),
    distanceMeters: hasGeometry
      ? Math.round(distanceToRings(point, outers))
      : null,
    fee: tags.fee ?? tags["parking:fee"] ?? null,
    charge: tags.charge ?? tags["fee:charge"] ?? null,
    openingHours: tags.opening_hours ?? tags["fee:conditional"] ?? null,
    maxstay: tags.maxstay ?? null,
    operator: tags.operator ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    tags: Object.fromEntries(
      Object.entries(tags).filter(([key]) => !known.has(key)),
    ),
    outline: outers.map((ring) => decimateRing(ring)),
  };
}

function isParkingZone(element: OverpassElement): boolean {
  const zone = element.tags?.zone;
  return typeof zone === "string" && zone.includes("parking");
}

function mergeById(matches: ZoneMatch[]): ZoneMatch[] {
  const byKey = new Map<string, ZoneMatch>();
  for (const match of matches) {
    const key = `${match.osmType}/${match.osmId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, match);
      continue;
    }
    // A geometriával rendelkező példány a jobb, de a tartalmazást tartsuk meg.
    const better = existing.outline.length >= match.outline.length ? existing : match;
    byKey.set(key, {
      ...better,
      containsPoint: existing.containsPoint || match.containsPoint,
      distanceMeters: existing.distanceMeters ?? match.distanceMeters,
    });
  }
  return [...byKey.values()];
}

const HIGHWAY_BLOCKLIST = new Set([
  "footway",
  "path",
  "steps",
  "cycleway",
  "pedestrian",
  "construction",
  "proposed",
  "platform",
  "corridor",
]);

function distanceOfWay(element: OverpassElement, point: LatLon): number | null {
  const geometry = (element.geometry ?? []).map((p) => ({
    lat: p.lat,
    lon: p.lon,
  }));
  if (geometry.length === 0) return null;
  return Math.round(distanceToRings(point, [geometry]));
}

function toParkingLot(
  element: OverpassElement,
  point: LatLon,
): ParkingLot | null {
  const tags = element.tags ?? {};
  const center = element.center;
  const osmType = element.type === "relation" ? "relation" : "way";

  return {
    osmType,
    osmId: element.id,
    osmUrl: `${OSM_ELEMENT_BASE[osmType]}${element.id}`,
    name: tags.name ?? null,
    fee: tags.fee ?? null,
    charge: tags.charge ?? null,
    openingHours: tags.opening_hours ?? null,
    maxstay: tags.maxstay ?? null,
    distanceMeters: center
      ? Math.round(haversineMeters(point, { lat: center.lat, lon: center.lon }))
      : null,
  };
}

/**
 * A rétegek összegzése egyetlen válasszá.
 *
 * Sorrend: a zóna-poligon a legerősebb bizonyíték (onnan jön kód is), utána az
 * úttestre tagelt adat, végül a közeli fizetős parkoló. Ha egyik réteg sem tud
 * semmit, azt `unknown`-ként mondjuk ki — nem írjuk rá, hogy ingyenes.
 */
function buildVerdict(
  zones: ZoneMatch[],
  streets: StreetLayer[],
  lots: ParkingLot[],
): Verdict {
  const zone = zones[0];
  if (zone) {
    const paidByTag = zone.fee === "no" ? "free" : "paid";
    return {
      paid: paidByTag,
      source: "zone",
      code: zone.code,
      confidence: zone.code ? "high" : "medium",
      hoursExpression: zone.openingHours,
      charge: zone.charge,
      maxstay: zone.maxstay,
      evidence: [
        zone.name
          ? `A pont a(z) „${zone.name}” parkolási zóna poligonján belül van.`
          : "A pont egy parkolási zóna poligonján belül van.",
      ],
    };
  }

  const paidStreet = streets.find((street) => street.verdict.paid === true);
  if (paidStreet) {
    const { verdict } = paidStreet;
    return {
      paid: "paid",
      source: "street",
      code: verdict.zoneCode,
      confidence: verdict.zoneCode ? "medium" : "low",
      hoursExpression: verdict.hoursExpression,
      charge: verdict.charge,
      maxstay: verdict.maxstay,
      evidence: [
        paidStreet.name
          ? `${paidStreet.name}: az úttest adata szerint fizetős a várakozás.`
          : "A legközelebbi úttest adata szerint fizetős a várakozás.",
        ...verdict.evidence,
      ],
    };
  }

  const freeStreet = streets.find((street) => street.verdict.paid === false);
  if (freeStreet) {
    return {
      paid: "free",
      source: "street",
      code: null,
      confidence: "low",
      hoursExpression: freeStreet.verdict.hoursExpression,
      charge: null,
      maxstay: freeStreet.verdict.maxstay,
      evidence: [
        freeStreet.name
          ? `${freeStreet.name}: az úttest adata szerint nem fizetős a várakozás.`
          : "A legközelebbi úttest adata szerint nem fizetős a várakozás.",
      ],
    };
  }

  const paidLot = lots.find((lot) => lot.fee === "yes");
  if (paidLot) {
    return {
      paid: "unknown",
      source: "lot",
      code: null,
      confidence: "low",
      hoursExpression: paidLot.openingHours,
      charge: paidLot.charge,
      maxstay: paidLot.maxstay,
      evidence: [
        `${paidLot.distanceMeters ?? "?"} méterre van egy fizetős parkoló${
          paidLot.name ? ` (${paidLot.name})` : ""
        } — az utcai várakozásról viszont nincs adat.`,
      ],
    };
  }

  return {
    paid: "unknown",
    source: "none",
    code: null,
    confidence: "low",
    hoursExpression: null,
    charge: null,
    maxstay: null,
    evidence: [
      "Erre a pontra nincs parkolási adat az OpenStreetMapben — sem zónahatár, sem az úttestre tagelt információ.",
    ],
  };
}

export function parseLookup(
  response: OverpassResponse,
  point: LatLon,
): ZoneLookup {
  const areas = response.elements.filter((e) => e.type === "area");
  const ways = response.elements.filter((e) => e.type === "way");
  const relations = response.elements.filter((e) => e.type === "relation");

  const adminAreas: AdminArea[] = areas
    .filter((a) => a.tags?.boundary === "administrative" && a.tags?.name)
    .map((a) => ({
      name: a.tags!.name,
      adminLevel: a.tags!.admin_level ? Number(a.tags!.admin_level) : null,
    }))
    .sort((a, b) => (a.adminLevel ?? 99) - (b.adminLevel ?? 99));

  const city =
    adminAreas.find((a) => a.adminLevel === 8)?.name ??
    adminAreas.find((a) => a.adminLevel === 7)?.name ??
    null;
  const district =
    adminAreas.find((a) => a.adminLevel === 9)?.name ??
    adminAreas.find((a) => a.adminLevel === 10)?.name ??
    null;

  const candidates = mergeById([
    ...areas.filter(isParkingZone).map((e) => toZoneMatch(e, point)),
    ...relations.filter(isParkingZone).map((e) => toZoneMatch(e, point)),
    ...ways.filter(isParkingZone).map((e) => toZoneMatch(e, point)),
  ]);

  const zones = candidates
    .filter((z) => z.containsPoint)
    .sort((a, b) => (a.code ? 0 : 1) - (b.code ? 0 : 1));

  const nearbyZones = candidates
    .filter((z) => !z.containsPoint)
    .sort(
      (a, b) =>
        (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (b.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 5);

  // --- Úttest-réteg ---
  const highwayWays = ways.filter((w) => {
    const highway = w.tags?.highway;
    if (!highway || HIGHWAY_BLOCKLIST.has(highway)) return false;
    return !isParkingZone(w) && w.tags?.amenity !== "parking";
  });

  const streets: StreetLayer[] = highwayWays
    .map((w) => {
      const info = parseStreetParking(w.tags ?? {}, {
        osmId: w.id,
        distanceMeters: distanceOfWay(w, point) ?? Number.MAX_SAFE_INTEGER,
      });
      return { ...info, verdict: summariseStreet(info) };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Csak azokat tartjuk meg, amikről mondanak is valamit — a puszta utcanév
  // külön mezőben megy, hogy ne tűnjön adatnak.
  const informative = streets.filter(
    (street) => street.sides.length > 0 || street.verdict.paid !== null,
  );

  const streetName = streets.find((street) => street.name)?.name ?? null;

  // --- Parkoló-réteg ---
  const lots = [...ways, ...relations]
    .filter((e) => e.tags?.amenity === "parking")
    .map((e) => toParkingLot(e, point))
    .filter((lot): lot is ParkingLot => lot !== null)
    .sort(
      (a, b) =>
        (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (b.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 4);

  return {
    point,
    verdict: buildVerdict(zones, informative, lots),
    zones,
    nearbyZones,
    streetName,
    streets: informative.slice(0, 4),
    lots,
    admin: { city, district, areas: adminAreas },
  };
}
