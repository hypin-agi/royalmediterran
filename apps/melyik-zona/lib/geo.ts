export type LatLon = { lat: number; lon: number };
export type Ring = LatLon[];

/** Föld sugara méterben. */
const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(a: LatLon, b: LatLon): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Ray-casting pont-a-poligonban teszt. A hosszúsági fokot a szélességi kör
 * koszinuszával skálázzuk, hogy a teszt közelítőleg metrikus legyen — a
 * ray-casting maga szögkoordinátákon is helyes, a skálázás csak a numerikus
 * stabilitást javítja a magyar szélességeken.
 */
export function pointInRing(point: LatLon, ring: Ring): boolean {
  if (ring.length < 3) return false;
  const { lat, lon } = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i].lat;
    const xi = ring[i].lon;
    const yj = ring[j].lat;
    const xj = ring[j].lon;
    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export type Polygon = { outers: Ring[]; inners: Ring[] };

export function pointInPolygon(point: LatLon, polygon: Polygon): boolean {
  const inOuter = polygon.outers.some((ring) => pointInRing(point, ring));
  if (!inOuter) return false;
  return !polygon.inners.some((ring) => pointInRing(point, ring));
}

/** Legkisebb távolság a ponttól a gyűrű bármely csúcsáig (méterben). */
export function distanceToRings(point: LatLon, rings: Ring[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const ring of rings) {
    for (const vertex of ring) {
      const d = haversineMeters(point, vertex);
      if (d < min) min = d;
    }
  }
  return min;
}

const CLOSE_ENOUGH_DEG = 1e-7;

function samePoint(a: LatLon, b: LatLon): boolean {
  return (
    Math.abs(a.lat - b.lat) < CLOSE_ENOUGH_DEG &&
    Math.abs(a.lon - b.lon) < CLOSE_ENOUGH_DEG
  );
}

/**
 * Overpass relation tagjai darabolt vonalláncként érkeznek. Ez a függvény
 * összefűzi őket zárt gyűrűkké: mindig azt a következő darabot keresi, amelyik
 * az aktuális lánc végéhez illeszkedik (szükség esetén megfordítva).
 */
export function assembleRings(segments: Ring[]): Ring[] {
  const pool = segments.filter((s) => s.length >= 2).map((s) => [...s]);
  const rings: Ring[] = [];

  while (pool.length > 0) {
    let current = pool.shift()!;
    let extended = true;

    while (extended && !samePoint(current[0], current[current.length - 1])) {
      extended = false;
      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[i];
        const end = current[current.length - 1];
        if (samePoint(end, candidate[0])) {
          current = current.concat(candidate.slice(1));
        } else if (samePoint(end, candidate[candidate.length - 1])) {
          current = current.concat([...candidate].reverse().slice(1));
        } else {
          continue;
        }
        pool.splice(i, 1);
        extended = true;
        break;
      }
    }

    if (current.length >= 3) rings.push(current);
  }

  return rings;
}
