import { NextResponse } from "next/server";
import { buildQuery, OverpassError, runOverpass } from "@/lib/overpass";
import { parseLookup, type ZoneLookup } from "@/lib/zone";
import { findZoneAt, getDataset, hasOfficialData } from "@/lib/zoneDataset";
import { applyOfficial, emptyLookup } from "@/lib/officialLayer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Az Overpass lekérdezés lassú tud lenni; a Vercel alapértelmezett 10s kevés lenne.
export const maxDuration = 60;

const ATTRIBUTION =
  "Adatforrás: OpenStreetMap közreműködők (ODbL) — lekérdezve az Overpass API-n keresztül.";

/**
 * Instance-szintű memória-cache. A koordinátát ~11 méteres rácsra kerekítjük,
 * így az ugyanarról a helyről érkező ismételt lekérdezések nem terhelik az
 * Overpass API-t (aminek szigorú fair-use korlátai vannak).
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, { at: number; value: ZoneLookup }>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function readCache(key: string): ZoneLookup | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: ZoneLookup): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Hiányzó vagy érvénytelen `lat` / `lon` paraméter." },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "A koordináta kívül esik az értelmezési tartományon." },
      { status: 400 },
    );
  }

  // Kereső sugár a zóna-geometriához. Az `around` a zóna határához mér, ezért
  // az alapérték nagyvonalú: kisebb sugárral egy nagy zóna közepén állva nem
  // találnánk meg a saját zónánkat.
  const radiusParam = Number(url.searchParams.get("radius"));
  const radius = Number.isFinite(radiusParam)
    ? Math.min(3000, Math.max(100, Math.round(radiusParam)))
    : 1500;

  const key = `${cacheKey(lat, lon)}@${radius}`;
  const cached = readCache(key);
  if (cached) {
    return NextResponse.json(
      { ...cached, cached: true, attribution: ATTRIBUTION },
      {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  }

  const point = { lat, lon };

  // 0. réteg: hivatalos zónakészlet. Ha ez talál, minden mást felülír, és
  // akkor is tudunk válaszolni, ha az Overpass épp nem elérhető.
  const official = findZoneAt(point);

  try {
    const raw = await runOverpass(buildQuery(point, radius));
    const lookup = applyOfficial(parseLookup(raw, point), official);
    writeCache(key, lookup);

    const body: Record<string, unknown> = {
      ...lookup,
      cached: false,
      attribution: ATTRIBUTION,
    };

    body.dataset = {
      loaded: hasOfficialData(),
      version: getDataset().version,
      source: getDataset().source,
    };

    if (url.searchParams.get("debug") === "1") {
      body.debug = {
        radius,
        officialMatch: official ? official.feature.code : null,
        elementCount: raw.elements.length,
        byType: raw.elements.reduce<Record<string, number>>((acc, element) => {
          acc[element.type] = (acc[element.type] ?? 0) + 1;
          return acc;
        }, {}),
        zoneTagSamples: raw.elements
          .filter((e) => e.tags?.zone)
          .slice(0, 8)
          .map((e) => ({ type: e.type, id: e.id, tags: e.tags })),
      };
    }

    return NextResponse.json(body, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    if (error instanceof OverpassError) {
      // Ha van hivatalos zónatalálat, az Overpass kiesése nem akadály:
      // a lényegi választ (zónakód, időszak) enélkül is meg tudjuk adni.
      if (official) {
        return NextResponse.json(
          {
            ...applyOfficial(emptyLookup(point), official),
            degraded:
              "Az OpenStreetMap lekérdezés most nem elérhető, ezért utcanév és térkép nélkül válaszolunk. A zónaadat a hivatalos készletből származik.",
            attribution: ATTRIBUTION,
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        {
          error:
            "Az OpenStreetMap lekérdező szolgáltatás (Overpass) most nem elérhető. Próbáld újra pár másodperc múlva.",
          attempts: error.attempts,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "Váratlan hiba a zóna lekérdezése közben.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

