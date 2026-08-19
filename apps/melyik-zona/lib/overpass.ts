import type { LatLon } from "./geo";

export type OverpassGeomPoint = { lat: number; lon: number };

export type OverpassElement = {
  type: "node" | "way" | "relation" | "area" | "count";
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
  /** `out center` esetén a bounding box közepe. */
  center?: OverpassGeomPoint;
  /** `out count` esetén a darabszámok. */
  tags_count?: Record<string, string>;
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
 * Egyetlen Overpass kéréssel begyűjtünk minden réteget, amiből a zóna
 * megállapítható. A rétegek egymást pótolják — Magyarországon a fizetős
 * várakozás sokszor nem külön zóna-poligonként, hanem az úttestre tagelve
 * szerepel, ezért mindkettőt le kell kérni.
 *
 *  1. `is_in` — a pontot tartalmazó területek: közigazgatási határok (kerület,
 *     település) és azok a parkolási zónák, amelyekhez az Overpass area-t
 *     generált. Ez akkor is talál, ha a zóna közepén állunk.
 *  2. `around` — közeli `zone=parking` poligonok teljes geometriával: ez adja
 *     a térképet, a szomszédos zónákat, és tartalék az area-generálás hiányára.
 *  3. A pont körüli úttestek — nevesített utak és minden olyan út, amin van
 *     `parking:*` tag. Innen jön a fizetős/ingyenes tény és sokszor a zónakód is.
 *  4. Közeli `amenity=parking` területek — parkolók, ha az utcán nincs adat.
 */
export function buildQuery(point: LatLon, aroundMeters = 600): string {
  const lat = point.lat.toFixed(6);
  const lon = point.lon.toFixed(6);
  return `[out:json][timeout:25];
is_in(${lat},${lon})->.here;
(
  area.here["boundary"="administrative"];
  area.here["zone"~"parking"];
);
out tags;
(
  relation(around:${aroundMeters},${lat},${lon})["zone"~"parking"];
  way(around:${aroundMeters},${lat},${lon})["zone"~"parking"];
)->.zones;
.zones out geom;
(
  way(around:40,${lat},${lon})["highway"]["name"];
  way(around:40,${lat},${lon})["highway"][~"^parking:"~"."];
)->.streets;
.streets out tags geom;
(
  way(around:150,${lat},${lon})["amenity"="parking"];
  relation(around:150,${lat},${lon})["amenity"="parking"];
)->.lots;
.lots out tags center;`;
}

/**
 * Országos lefedettség-lekérdezés: minden magyarországi parkolási zóna
 * középpontja és tagjei, plusz a fizetősre tagelt úttestek darabszáma.
 * Ebből rajzoljuk meg a térképet arról, hol tudunk egyáltalán válaszolni.
 */
export function buildCoverageQuery(): string {
  return `[out:json][timeout:180];
area["ISO3166-1"="HU"]["admin_level"="2"]->.hu;
(
  relation(area.hu)["zone"~"parking"];
  way(area.hu)["zone"~"parking"];
);
out tags center;
way(area.hu)[~"^parking:(both|left|right)(:.*)?$"~"."]["highway"];
out count;`;
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
