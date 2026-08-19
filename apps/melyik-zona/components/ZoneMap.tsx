"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type LatLon = { lat: number; lon: number };

type Props = {
  point: LatLon;
  accuracyMeters?: number | null;
  /** A megtalált zóna külső gyűrűi. */
  outline?: LatLon[][];
  /** Szomszédos zónák körvonalai (halványabban). */
  neighbours?: { outline: LatLon[][]; label: string | null }[];
};

/**
 * Könnyű Leaflet-térkép. Csak a böngészőben fut (dinamikus import), és
 * szándékosan nem használ marker-ikont, hogy ne kelljen képfájlokat
 * kiszolgálni — a pozíciót kör jelöli.
 */
export default function ZoneMap({
  point,
  accuracyMeters,
  outline = [],
  neighbours = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
        }).setView([point.lat, point.lon], 16);
        mapRef.current = map;

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap közreműködők",
        }).addTo(map);

        const layers: { getBounds: () => unknown }[] = [];

        for (const neighbour of neighbours) {
          for (const ring of neighbour.outline) {
            if (ring.length < 3) continue;
            const polygon = L.polygon(
              ring.map((p) => [p.lat, p.lon] as [number, number]),
              { color: "#8b949e", weight: 1, fillOpacity: 0.06, dashArray: "4 4" },
            ).addTo(map);
            if (neighbour.label) polygon.bindTooltip(neighbour.label);
          }
        }

        for (const ring of outline) {
          if (ring.length < 3) continue;
          const polygon = L.polygon(
            ring.map((p) => [p.lat, p.lon] as [number, number]),
            { color: "#3fb950", weight: 2, fillOpacity: 0.18 },
          ).addTo(map);
          layers.push(polygon);
        }

        if (accuracyMeters && accuracyMeters > 0) {
          L.circle([point.lat, point.lon], {
            radius: accuracyMeters,
            color: "#58a6ff",
            weight: 1,
            fillOpacity: 0.12,
          }).addTo(map);
        }

        L.circleMarker([point.lat, point.lon], {
          radius: 7,
          color: "#ffffff",
          weight: 2,
          fillColor: "#58a6ff",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip("Itt vagy");

        if (layers.length > 0) {
          const group = L.featureGroup(layers as never);
          map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 17 });
        }
      })
      .catch(() => {
        /* A térkép nem kritikus — ha nem tölt be, a zónaadat önmagában is használható. */
      });

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove?: () => void } | null;
      if (map && typeof map.remove === "function") map.remove();
      mapRef.current = null;
    };
  }, [point.lat, point.lon, accuracyMeters, outline, neighbours]);

  return <div className="map" ref={containerRef} aria-label="Térkép a pozícióval és a zóna határával" />;
}
