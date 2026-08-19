import { NextResponse } from "next/server";
import { buildCoverageQuery, OverpassError, runOverpass } from "@/lib/overpass";
import { extractCode } from "@/lib/zone";
import { haversineMeters } from "@/lib/geo";
import { CITIES } from "@/lib/cities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Ilyen távolságon belül soroljuk a zónát egy városhoz. */
const CITY_RADIUS_M = 15_000;

export type CoveragePoint = {
  lat: number;
  lon: number;
  code: string | null;
  name: string | null;
};

export type CoverageCity = {
  name: string;
  lat: number;
  lon: number;
  zones: number;
  withCode: number;
};

export type CoveragePayload = {
  zoneCount: number;
  zonesWithCode: number;
  feeTaggedStreets: number | null;
  points: CoveragePoint[];
  cities: CoverageCity[];
  /** Olyan zónák száma, amelyek egyik ismert városunkhoz sem estek közel. */
  outsideKnownCities: number;
  attribution: string;
  cachedAt: string;
};

const ATTRIBUTION =
  "Adatforrás: OpenStreetMap közreműködők (ODbL) — lekérdezve az Overpass API-n keresztül.";

let cached: { at: number; value: CoveragePayload } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.value, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  try {
    const raw = await runOverpass(buildCoverageQuery());

    const points: CoveragePoint[] = [];
    let feeTaggedStreets: number | null = null;

    for (const element of raw.elements) {
      if (element.type === "count") {
        const total =
          element.tags?.total ??
          element.tags?.ways ??
          element.tags?.nodes ??
          null;
        if (total !== null) feeTaggedStreets = Number(total);
        continue;
      }
      const center = element.center ?? (element.lat != null && element.lon != null
        ? { lat: element.lat, lon: element.lon }
        : null);
      if (!center) continue;
      const tags = element.tags ?? {};
      if (!tags.zone || !tags.zone.includes("parking")) continue;

      points.push({
        lat: Number(center.lat.toFixed(5)),
        lon: Number(center.lon.toFixed(5)),
        code: extractCode(tags),
        name: tags.name ?? null,
      });
    }

    const counters = new Map<string, { zones: number; withCode: number }>();
    let outsideKnownCities = 0;

    for (const point of points) {
      let best: { name: string; distance: number } | null = null;
      for (const city of CITIES) {
        const distance = haversineMeters(point, city);
        if (distance > CITY_RADIUS_M) continue;
        if (!best || distance < best.distance) {
          best = { name: city.name, distance };
        }
      }
      if (!best) {
        outsideKnownCities += 1;
        continue;
      }
      const entry = counters.get(best.name) ?? { zones: 0, withCode: 0 };
      entry.zones += 1;
      if (point.code) entry.withCode += 1;
      counters.set(best.name, entry);
    }

    const cities: CoverageCity[] = CITIES.filter((city) => counters.has(city.name))
      .map((city) => ({
        name: city.name,
        lat: city.lat,
        lon: city.lon,
        zones: counters.get(city.name)!.zones,
        withCode: counters.get(city.name)!.withCode,
      }))
      .sort((a, b) => b.zones - a.zones);

    const payload: CoveragePayload = {
      zoneCount: points.length,
      zonesWithCode: points.filter((p) => p.code).length,
      feeTaggedStreets,
      points,
      cities,
      outsideKnownCities,
      attribution: ATTRIBUTION,
      cachedAt: new Date().toISOString(),
    };

    cached = { at: Date.now(), value: payload };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    if (error instanceof OverpassError) {
      return NextResponse.json(
        {
          error:
            "Az országos lekérdezés most nem futott le — az Overpass API terhelt. Próbáld újra pár perc múlva.",
          attempts: error.attempts,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "Váratlan hiba a lefedettség lekérdezésekor.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
