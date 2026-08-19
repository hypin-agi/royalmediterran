import type { LatLon } from "./geo";

export type OverpassGeomPoint = { lat: number; lon: number };

export type OverpassElement = {
  type: "node" | "way" | "relation" | "area";
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeomPoint[];
  members?: {
    type: string;
    ref: number;
    role: string;
    geometry?: OverpassGeomPoint[];
  }[];
  lat?: number;
  lon?: number;
};

export type OverpassResponse = { elements: OverpassElement[] };

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const USER_AGENT =
  "MelyikZona/1.0 (parkolasi zona kereso; https://github.com/hypin-agi/royalmediterran)";

/**
 * Egyetlen Overpass kéréssel begyűjtünk mindent, ami a zóna megállapításához kell:
 *
 *  1. `is_in` — a pontot tartalmazó területek (közigazgatási határok ÉS azok a
 *     parkolási zónák, amelyekhez az Overpass area-t generált). Ez a pontos út:
 *     akkor is talál, ha a zóna közepén állunk, és a határ több km-re van.
 *  2. `around` — a közeli parkolási zónák teljes geometriával. Ez adja a térképet,
 *     a szomszédos zónák listáját, és tartalékot, ha az area-generálás kihagyta a zónát.
 *  3. A pont körüli elnevezett utak — az utcanévhez és az útra közvetlenül
 *     rögzített parkolási tagekhez (`parking:*`).
 */
export function buildQuery(point: LatLon, aroundMeters = 600): string {
  const lat = point.lat.toFixed(6);
  const lon = point.lon.toFixed(6);
  return `[out:json][timeout:25];
is_in(${lat},${lon})->.here;
(
  area.here["boundary"="administrative"];
  area.here["zone"~"parking"];
  area.here["amenity"="parking"];
);
out tags;
(
  relation(around:${aroundMeters},${lat},${lon})["zone"~"parking"];
  way(around:${aroundMeters},${lat},${lon})["zone"~"parking"];
)->.zones;
.zones out geom;
way(around:45,${lat},${lon})["highway"]["name"]->.streets;
.streets out tags geom;`;
}

export class OverpassError extends Error {
  constructor(message: string, readonly attempts: string[]) {
    super(message);
    this.name = "OverpassError";
  }
}

export async function runOverpass(query: string): Promise<OverpassResponse> {
  const attempts: string[] = [];

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(28_000),
        cache: "no-store",
      });

      if (!response.ok) {
        attempts.push(`${endpoint} → HTTP ${response.status}`);
        continue;
      }

      const json = (await response.json()) as OverpassResponse;
      if (!json || !Array.isArray(json.elements)) {
        attempts.push(`${endpoint} → váratlan válaszformátum`);
        continue;
      }
      return json;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      attempts.push(`${endpoint} → ${reason}`);
    }
  }

  throw new OverpassError(
    "Egyik Overpass végpont sem válaszolt használhatóan.",
    attempts,
  );
}
