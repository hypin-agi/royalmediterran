import { NextResponse } from "next/server";
import { getDataset, hasOfficialData } from "@/lib/zoneDataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Az alkalmazás adat-állapota. A diagnosztika oldal ebből mondja meg, hogy
 * a koordináta → zónakód leképezés egyáltalán milyen forrásra támaszkodhat.
 */
export async function GET() {
  const dataset = getDataset();
  const withCode = dataset.features.filter((f) => f.code).length;
  const withHours = dataset.features.filter((f) => f.openingHours).length;
  const withRate = dataset.features.filter((f) => f.hourlyRateHUF !== null).length;

  const cities = new Map<string, number>();
  for (const feature of dataset.features) {
    const key = feature.city ?? feature.district ?? "ismeretlen";
    cities.set(key, (cities.get(key) ?? 0) + 1);
  }

  return NextResponse.json({
    official: {
      loaded: hasOfficialData(),
      version: dataset.version,
      source: dataset.source,
      license: dataset.license,
      fetchedAt: dataset.fetchedAt,
      zoneCount: dataset.features.length,
      withCode,
      withHours,
      withRate,
      byArea: [...cities.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30),
    },
    layers: [
      {
        id: "official",
        label: "Hivatalos zónakészlet",
        available: hasOfficialData(),
        gives: "zónakód, díj, fizetős időszak, pontos határ",
      },
      {
        id: "zone",
        label: "OSM zóna-poligon (zone=parking)",
        available: true,
        gives: "zónakód, ha az OSM tárolja",
      },
      {
        id: "street",
        label: "OSM úttest-tagek (parking:*)",
        available: true,
        gives: "fizetős-e a szakasz, néha zónakód",
      },
    ],
  });
}
