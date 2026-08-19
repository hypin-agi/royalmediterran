/**
 * Hivatalos zóna-adatkészlet — ez a rendszer legerősebb rétege.
 *
 * MIÉRT LÉTEZIK EZ A FÁJL
 * -----------------------
 * A `zone=parking` OSM-tag elsősorban lengyel térképezési konvenció; magyar
 * területen ritka, és zónakódot szinte soha nem hordoz. Márpedig a termék
 * lényege pont a zónakód. Ezért a koordináta → zónakód leképezést nem szabad
 * kizárólag az OSM-re bízni: ez a modul egy repóban tárolt, hivatalos forrásból
 * importált poligonkészletből dolgozik, és ha az megvan, mindent felülír.
 *
 * Az adatkészletet a `scripts/import-zones.mjs` állítja elő egy hivatalos
 * GeoJSON-ból. Amíg nincs betöltve, a `features` üres, és az alkalmazás
 * visszaesik az OSM-rétegekre — de a felület ezt meg is mondja, nem tesz úgy,
 * mintha tudná a választ.
 */

import rawDataset from "../data/zones.json";
import { pointInPolygon, type LatLon, type Ring } from "./geo";

export type ZonePolygon = { outers: Ring[]; inners: Ring[] };

export type ZoneFeature = {
  /** A kód, amit a parkolóautomatába / applikációba be kell írni. */
  code: string;
  name: string | null;
  city: string | null;
  district: string | null;
  /** Övezet-kategória, ha a forrás tartalmazza (pl. "A", "B", "C"). */
  category: string | null;
  /** Óradíj forintban. Csak akkor töltjük ki, ha a forrás megadja. */
  hourlyRateHUF: number | null;
  /** Fizetős időszak `opening_hours` szintaxisban. */
  openingHours: string | null;
  maxstay: string | null;
  operator: string | null;
  /** [minLat, minLon, maxLat, maxLon] — durva előszűréshez. */
  bbox: [number, number, number, number];
  polygons: ZonePolygon[];
};

export type ZoneDataset = {
  /** Az adatkészlet verziója / kiadási dátuma. */
  version: string;
  /** Honnan származik — kötelező kitölteni, hogy visszakövethető legyen. */
  source: string;
  license: string;
  fetchedAt: string | null;
  features: ZoneFeature[];
};

const dataset = rawDataset as unknown as ZoneDataset;

export function getDataset(): ZoneDataset {
  return dataset;
}

export function hasOfficialData(): boolean {
  return Array.isArray(dataset.features) && dataset.features.length > 0;
}

function inBbox(point: LatLon, bbox: ZoneFeature["bbox"]): boolean {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  return (
    point.lat >= minLat &&
    point.lat <= maxLat &&
    point.lon >= minLon &&
    point.lon <= maxLon
  );
}

export type DatasetMatch = {
  feature: ZoneFeature;
  /** true = a pont a poligonon belül van (nem csak a bboxban). */
  exact: boolean;
};

/**
 * Megkeresi a pontot tartalmazó zónát. Először bbox-szal szűrünk (olcsó),
 * utána futtatjuk a pontos pont-a-poligonban tesztet a maradékon.
 */
export function findZoneIn(
  features: ZoneFeature[],
  point: LatLon,
): DatasetMatch | null {
  // Előszűrés befoglaló téglalappal — olcsó, és a jelöltek számát nagyságrenddel
  // csökkenti, mielőtt a drágább pont-a-poligonban tesztet futtatnánk.
  const candidates = features.filter((feature) => inBbox(point, feature.bbox));

  for (const feature of candidates) {
    for (const polygon of feature.polygons) {
      if (pointInPolygon(point, polygon)) {
        return { feature, exact: true };
      }
    }
  }

  return null;
}

export function findZoneAt(point: LatLon): DatasetMatch | null {
  return findZoneIn(dataset.features, point);
}

/** Bounding boxok metszete alapján a közeli zónák — a "határon állsz" jelzéshez. */
export function findNearbyZones(
  point: LatLon,
  paddingDegrees = 0.004,
): ZoneFeature[] {
  const padded: LatLon[] = [
    { lat: point.lat - paddingDegrees, lon: point.lon - paddingDegrees },
    { lat: point.lat + paddingDegrees, lon: point.lon + paddingDegrees },
  ];

  return dataset.features.filter((feature) => {
    const [minLat, minLon, maxLat, maxLon] = feature.bbox;
    return (
      maxLat >= padded[0].lat &&
      minLat <= padded[1].lat &&
      maxLon >= padded[0].lon &&
      minLon <= padded[1].lon
    );
  });
}

/** Egy poligonkészlet befoglaló téglalapja. Az importáló is ezt használja. */
export function computeBbox(polygons: ZonePolygon[]): ZoneFeature["bbox"] {
  let minLat = Number.POSITIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;

  for (const polygon of polygons) {
    for (const ring of [...polygon.outers, ...polygon.inners]) {
      for (const point of ring) {
        if (point.lat < minLat) minLat = point.lat;
        if (point.lat > maxLat) maxLat = point.lat;
        if (point.lon < minLon) minLon = point.lon;
        if (point.lon > maxLon) maxLon = point.lon;
      }
    }
  }

  return [minLat, minLon, maxLat, maxLon];
}
