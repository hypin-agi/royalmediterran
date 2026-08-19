"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

const ZoneMap = dynamic(() => import("./ZoneMap"), { ssr: false });

type LatLon = { lat: number; lon: number };

type ZoneMatch = {
  osmType: string;
  osmId: number;
  osmUrl: string | null;
  code: string | null;
  name: string | null;
  containsPoint: boolean;
  distanceMeters: number | null;
  fee: string | null;
  charge: string | null;
  openingHours: string | null;
  maxstay: string | null;
  operator: string | null;
  website: string | null;
  tags: Record<string, string>;
  outline: LatLon[][];
};

type StreetInfo = {
  name: string;
  distanceMeters: number | null;
  parkingTags: Record<string, string>;
};

type ZoneResponse = {
  point: LatLon;
  zones: ZoneMatch[];
  nearbyZones: ZoneMatch[];
  street: StreetInfo | null;
  streets: StreetInfo[];
  admin: {
    city: string | null;
    district: string | null;
    areas: { name: string; adminLevel: number | null }[];
  };
  cached?: boolean;
  attribution?: string;
  error?: string;
};

type Phase = "idle" | "locating" | "looking-up" | "done" | "error";

type Fix = { point: LatLon; accuracy: number | null; at: number };

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

/** 40 méter fölött már reális, hogy a szomszédos zónát mutatjuk. */
const ACCURACY_WARN_M = 40;
/** Ha a zónahatár ilyen közel van, érdemes szólni a felhasználónak. */
const BORDER_WARN_M = 25;

function geolocationMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Nem engedélyezted a helymeghatározást. Engedélyezd a böngésző címsorában (lakat ikon → Helyzet), majd nyomd meg újra a gombot.";
    case error.POSITION_UNAVAILABLE:
      return "A készülék most nem tudja megállapítani a pozíciót. Menj ki a szabadba vagy az ablak közelébe, és próbáld újra.";
    case error.TIMEOUT:
      return "Túl sokáig tartott a helymeghatározás. Próbáld újra.";
    default:
      return "Nem sikerült lekérni a pozíciót.";
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Ez a böngésző nem támogatja a helymeghatározást."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}

function formatFee(value: string | null): string | null {
  if (!value) return null;
  if (value === "yes") return "Igen, fizetős";
  if (value === "no") return "Nem, ingyenes";
  return value;
}

export default function ZoneFinder() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fix, setFix] = useState<Fix | null>(null);
  const [data, setData] = useState<ZoneResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const lookup = useCallback(async (point: LatLon, accuracy: number | null) => {
    setPhase("looking-up");
    setMessage("Zóna keresése a térképadatokban…");
    try {
      const response = await fetch(
        `/api/zone?lat=${point.lat.toFixed(6)}&lon=${point.lon.toFixed(6)}`,
        { headers: { Accept: "application/json" } },
      );
      const json = (await response.json()) as ZoneResponse;
      if (!response.ok) {
        setPhase("error");
        setMessage(json.error ?? "A zóna lekérdezése nem sikerült.");
        setFix({ point, accuracy, at: Date.now() });
        return;
      }
      setData(json);
      setFix({ point, accuracy, at: Date.now() });
      setPhase("done");
      setMessage(null);
    } catch {
      setPhase("error");
      setFix({ point, accuracy, at: Date.now() });
      setMessage(
        "Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatot, és próbáld újra.",
      );
    }
  }, []);

  const run = useCallback(async () => {
    setCopied(false);
    setData(null);
    setPhase("locating");
    setMessage("GPS-pozíció kérése…");
    try {
      const position = await getCurrentPosition();
      const point = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
      await lookup(point, position.coords.accuracy ?? null);
    } catch (error) {
      setPhase("error");
      setMessage(
        typeof error === "object" && error !== null && "code" in error
          ? geolocationMessage(error as GeolocationPositionError)
          : error instanceof Error
            ? error.message
            : "Nem sikerült lekérni a pozíciót.",
      );
    }
  }, [lookup]);

  // Kézi koordináta a címsorból (?lat=…&lon=…) — teszteléshez, GPS nélkül.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      void lookup({ lat, lon }, null);
    }
  }, [lookup]);

  const primary = data?.zones?.[0] ?? null;
  const busy = phase === "locating" || phase === "looking-up";

  const neighbours = useMemo(
    () =>
      (data?.nearbyZones ?? [])
        .filter((z) => z.outline.length > 0)
        .slice(0, 4)
        .map((z) => ({ outline: z.outline, label: z.code ?? z.name })),
    [data],
  );

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  const place = [data?.admin.district, data?.admin.city]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <button className="locate" onClick={run} disabled={busy}>
        {busy ? <span className="spinner" aria-hidden /> : <span aria-hidden>📍</span>}
        {busy ? "Keresés…" : "Melyik zónában állok?"}
      </button>

      {message && (
        <p className={phase === "error" ? "note bad" : "status"}>{message}</p>
      )}

      {phase === "done" && data && (
        <>
          {primary ? (
            <section className="card">
              <h2>A zónád</h2>
              <div className="zone-code">
                <strong>{primary.code ?? "—"}</strong>
                {primary.code && (
                  <button className="copy" onClick={() => copyCode(primary.code!)}>
                    {copied ? "✓ Másolva" : "Kód másolása"}
                  </button>
                )}
              </div>
              {primary.name && <p className="zone-name">{primary.name}</p>}
              {!primary.code && (
                <div className="note warn">
                  A térképadat ismeri a zóna határát, de zónakódot nem tárol hozzá.
                  A kódot a parkolóautomatán vagy a zónatáblán találod.
                </div>
              )}

              <div className="chips">
                {place && (
                  <span className="chip">
                    Hely: <strong>{place}</strong>
                  </span>
                )}
                {data.street && (
                  <span className="chip">
                    Utca: <strong>{data.street.name}</strong>
                  </span>
                )}
                {fix?.accuracy != null && (
                  <span className="chip">
                    GPS-pontosság: <strong>±{Math.round(fix.accuracy)} m</strong>
                  </span>
                )}
              </div>

              <dl className="facts">
                {formatFee(primary.fee) && (
                  <>
                    <dt>Fizetős</dt>
                    <dd>{formatFee(primary.fee)}</dd>
                  </>
                )}
                {primary.charge && (
                  <>
                    <dt>Díj</dt>
                    <dd>{primary.charge}</dd>
                  </>
                )}
                {primary.openingHours && (
                  <>
                    <dt>Fizetős időszak</dt>
                    <dd>
                      <code>{primary.openingHours}</code>
                    </dd>
                  </>
                )}
                {primary.maxstay && (
                  <>
                    <dt>Max. várakozás</dt>
                    <dd>{primary.maxstay}</dd>
                  </>
                )}
                {primary.operator && (
                  <>
                    <dt>Üzemeltető</dt>
                    <dd>{primary.operator}</dd>
                  </>
                )}
              </dl>

              {fix?.accuracy != null && fix.accuracy > ACCURACY_WARN_M && (
                <div className="note warn">
                  A GPS pontossága most ±{Math.round(fix.accuracy)} méter. Ekkora
                  hibahatárnál előfordulhat, hogy a szomszédos zónát mutatjuk —
                  vesd össze az utcán lévő zónatáblával.
                </div>
              )}
              {primary.distanceMeters != null &&
                primary.distanceMeters < BORDER_WARN_M && (
                  <div className="note warn">
                    Zónahatár közelében állsz (kb. {primary.distanceMeters} m).
                    Nézd meg a lenti szomszédos zónákat is.
                  </div>
                )}
            </section>
          ) : (
            <section className="card">
              <h2>Nincs zónatalálat</h2>
              <p style={{ margin: 0, lineHeight: 1.55 }}>
                Ezen a ponton nem találtunk fizetős parkolási zónát az
                OpenStreetMap adataiban. Ez kétfélét jelenthet: vagy tényleg
                ingyenes a parkolás itt, vagy a zóna még nincs feltérképezve.
                Mindenképp nézd meg az utcai táblát.
              </p>
              <div className="chips">
                {place && (
                  <span className="chip">
                    Hely: <strong>{place}</strong>
                  </span>
                )}
                {data.street && (
                  <span className="chip">
                    Utca: <strong>{data.street.name}</strong>
                  </span>
                )}
              </div>
              {data.street && Object.keys(data.street.parkingTags).length > 0 && (
                <>
                  <p className="zone-name">Amit az utcáról tudunk</p>
                  <dl className="facts">
                    {Object.entries(data.street.parkingTags).map(([key, value]) => (
                      <div key={key} style={{ display: "contents" }}>
                        <dt>
                          <code>{key}</code>
                        </dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </section>
          )}

          {fix && (
            <section className="card">
              <h2>Térkép</h2>
              <ZoneMap
                point={fix.point}
                accuracyMeters={fix.accuracy}
                outline={primary?.outline ?? []}
                neighbours={neighbours}
              />
              <div className="linkrow">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${fix.point.lat},${fix.point.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Megnyitás Google Maps-ben
                </a>
                <a
                  href="https://nemzetimobilfizetes.hu/parking_purchases/zonainfo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hivatalos zónatérkép
                </a>
              </div>
            </section>
          )}

          {data.nearbyZones.length > 0 && (
            <section className="card">
              <h2>Szomszédos zónák</h2>
              <ul className="plain">
                {data.nearbyZones.map((zone) => (
                  <li key={`${zone.osmType}-${zone.osmId}`}>
                    <strong>{zone.code ?? zone.name ?? "névtelen zóna"}</strong>
                    {zone.distanceMeters != null && ` — kb. ${zone.distanceMeters} m`}
                    {zone.code && zone.name ? ` · ${zone.name}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2>Ellenőrzés</h2>
            <p style={{ margin: 0, lineHeight: 1.55, fontSize: 14 }}>
              A zónakódot mindig vesd össze az utcai táblával vagy a
              parkolóautomatával, mielőtt elindítod a parkolást. Ez az oldal
              nyílt térképadatból dolgozik, nem hivatalos nyilvántartásból.
            </p>
            <details className="raw" style={{ marginTop: 12 }}>
              <summary>Nyers adat (hibabejelentéshez)</summary>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </details>
          </section>
        </>
      )}
    </>
  );
}
