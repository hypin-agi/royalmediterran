"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { HUNGARY_BOUNDS } from "@/lib/cities";

type Point = { lat: number; lon: number; code: string | null; name: string | null };

/**
 * Az ország térképe a megtalált parkolási zónákkal. Minden pötty egy valódi
 * OSM-objektum középpontja — a kitöltött kék pöttynek van zónakódja is, az
 * üresnek csak határa. Így ránézésre látszik, hol tudunk kódot mondani.
 */
export default function CoverageMap({ points }: { points: Point[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
        }).fitBounds([
          [HUNGARY_BOUNDS.south, HUNGARY_BOUNDS.west],
          [HUNGARY_BOUNDS.north, HUNGARY_BOUNDS.east],
        ]);
        mapRef.current = map;

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap közreműködők",
        }).addTo(map);

        for (const point of points) {
          const hasCode = Boolean(point.code);
          L.circleMarker([point.lat, point.lon], {
            radius: hasCode ? 6 : 5,
            color: "#0b4fd6",
            weight: 2,
            fillColor: hasCode ? "#0b4fd6" : "#ffffff",
            fillOpacity: hasCode ? 0.85 : 0.9,
          })
            .addTo(map)
            .bindTooltip(
              [point.code ? `Zónakód: ${point.code}` : "Nincs zónakód", point.name]
                .filter(Boolean)
                .join(" · "),
            );
        }
      })
      .catch(() => {
        /* A térkép kiegészítő — a számok a táblázatban akkor is megvannak. */
      });

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove?: () => void } | null;
      if (map && typeof map.remove === "function") map.remove();
      mapRef.current = null;
    };
  }, [points]);

  return (
    <div
      className="map tall"
      ref={containerRef}
      aria-label="Magyarország térképe a feltérképezett parkolási zónákkal"
    />
  );
}
