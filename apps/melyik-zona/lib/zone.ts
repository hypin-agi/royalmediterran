import {
  assembleRings,
  distanceToRings,
  pointInPolygon,
  type LatLon,
  type Ring,
} from "./geo";
import type { OverpassElement, OverpassResponse } from "./overpass";

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

export type StreetInfo = {
  name: string;
  distanceMeters: number | null;
  /** Az útra közvetlenül rögzített parkolási tagek (`parking:*`, `zone:*`). */
  parkingTags: Record<string, string>;
};

export type ZoneLookup = {
  point: LatLon;
  zones: ZoneMatch[];
  nearbyZones: ZoneMatch[];
  street: StreetInfo | null;
  streets: StreetInfo[];
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

const PARKING_TAG_PREFIXES = ["parking", "zone", "fee", "maxstay"];

function parkingTagsOf(tags: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tags).filter(([key]) =>
      PARKING_TAG_PREFIXES.some(
        (prefix) => key === prefix || key.startsWith(`${prefix}:`),
      ),
    ),
  );
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
    .sort((a, b) => (a.outline.length ? 0 : 1) - (b.outline.length ? 0 : 1));

  const nearbyZones = candidates
    .filter((z) => !z.containsPoint)
    .sort(
      (a, b) =>
        (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (b.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 5);

  const streets: StreetInfo[] = ways
    .filter((w) => w.tags?.highway && w.tags?.name)
    .map((w) => {
      const geometry = (w.geometry ?? []).map((p) => ({ lat: p.lat, lon: p.lon }));
      return {
        name: w.tags!.name,
        distanceMeters: geometry.length
          ? Math.round(distanceToRings(point, [geometry]))
          : null,
        parkingTags: parkingTagsOf(w.tags ?? {}),
      };
    })
    .sort(
      (a, b) =>
        (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (b.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    );

  // Azonos nevű utak összevonása (egy utca több way-ből áll).
  const seenStreets = new Set<string>();
  const uniqueStreets = streets.filter((s) => {
    if (seenStreets.has(s.name)) return false;
    seenStreets.add(s.name);
    return true;
  });

  return {
    point,
    zones,
    nearbyZones,
    street: uniqueStreets[0] ?? null,
    streets: uniqueStreets.slice(0, 4),
    admin: { city, district, areas: adminAreas },
  };
}
