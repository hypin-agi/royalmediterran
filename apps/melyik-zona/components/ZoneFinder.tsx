"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { evaluateHours, huWeekdayName, type HoursVerdict } from "@/lib/openingHours";

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
  outline: LatLon[][];
};

type ParkingSide = {
  label: string;
  placement: string | null;
  fee: string | null;
  restriction: string | null;
  zone: string | null;
  maxstay: string | null;
  interval: string | null;
};

type StreetLayer = {
  osmId: number;
  osmUrl: string;
  name: string | null;
  distanceMeters: number;
  sides: ParkingSide[];
  rawTags: Record<string, string>;
  verdict: {
    paid: boolean | null;
    evidence: string[];
    hoursExpression: string | null;
    zoneCode: string | null;
    charge: string | null;
    maxstay: string | null;
  };
};

type ParkingLot = {
  osmUrl: string;
  name: string | null;
  fee: string | null;
  charge: string | null;
  distanceMeters: number | null;
};

type Verdict = {
  paid: "paid" | "free" | "unknown";
  source: "zone" | "street" | "lot" | "none";
  code: string | null;
  confidence: "high" | "medium" | "low";
  hoursExpression: string | null;
  charge: string | null;
  maxstay: string | null;
  evidence: string[];
};

type ZoneResponse = {
  point: LatLon;
  verdict: Verdict;
  zones: ZoneMatch[];
  nearbyZones: ZoneMatch[];
  streetName: string | null;
  streets: StreetLayer[];
  lots: ParkingLot[];
  admin: { city: string | null; district: string | null };
  error?: string;
};

type Phase = "idle" | "locating" | "looking-up" | "done" | "error";
type Fix = { point: LatLon; accuracy: number | null };

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

const ACCURACY_WARN_M = 40;
const BORDER_WARN_M = 25;

const CONFIDENCE_LABEL: Record<Verdict["confidence"], string> = {
  high: "megbízható",
  medium: "közepes",
  low: "gyenge",
};

const SOURCE_LABEL: Record<Verdict["source"], string> = {
  zone: "zónahatár a térképadatból",
  street: "az úttestre rögzített adat",
  lot: "közeli parkoló adata",
  none: "nincs adat",
};

function geolocationMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Nem engedélyezted a helymeghatározást. Engedélyezd a böngésző címsorában (lakat ikon → Helyzet), majd nyomd meg újra a gombot.";
    case error.POSITION_UNAVAILABLE:
      return "A készülék most nem tudja megállapítani a pozíciót. Állj közelebb az ablakhoz vagy menj ki a szabadba, és próbáld újra.";
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

type Banner = {
  tone: "is-paid" | "is-free" | "is-unknown";
  title: string;
  detail: string;
};

/**
 * A verdikt és az idősáv összegyúrása egyetlen mondattá. Ez az, amit a
 * felhasználó két másodperc alatt elolvas az autóban, ezért itt nem
 * kertelünk, de nem is állítunk többet, mint amennyit az adat bír.
 */
function buildBanner(verdict: Verdict, hours: HoursVerdict): Banner {
  const dayNote = hours.isPublicHoliday
    ? "Ma munkaszüneti nap."
    : hours.weekday >= 5
      ? `Ma ${huWeekdayName(hours.weekday)}.`
      : "";

  if (verdict.paid === "paid") {
    if (hours.supported && hours.activeNow === true) {
      return {
        tone: "is-paid",
        title: "Most fizetős",
        detail: hours.nextChange
          ? `A díjfizetési kötelezettség ma ${hours.nextChange}-kor ér véget.`
          : "A díjfizetési kötelezettség jelenleg él.",
      };
    }
    if (hours.supported && hours.activeNow === false) {
      return {
        tone: "is-free",
        title: "Most ingyenes",
        detail: [
          dayNote,
          hours.nextChange
            ? `Fizetőssé ma ${hours.nextChange}-kor válik.`
            : "Ma már nem válik fizetőssé.",
          "Fizetős zónában állsz, csak épp az időszakon kívül.",
        ]
          .filter(Boolean)
          .join(" "),
      };
    }
    if (hours.isPublicHoliday || hours.weekday >= 5) {
      return {
        tone: "is-unknown",
        title: "Fizetős zóna — de ma valószínűleg nem kell fizetni",
        detail: `${dayNote} A fizetős időszakot a térképadat nem tartalmazza, viszont a magyar városok többségében hétvégén és munkaszüneti napon ingyenes a várakozás. Ellenőrizd a táblát.`,
      };
    }
    return {
      tone: "is-paid",
      title: "Fizetős zóna",
      detail:
        "A fizetős időszakot a térképadat nem tartalmazza, ezért nem tudjuk megmondani, hogy épp most kell-e fizetni. Nézd meg a táblát.",
    };
  }

  if (verdict.paid === "free") {
    return {
      tone: "is-free",
      title: "Az adat szerint nem fizetős",
      detail:
        "A legközelebbi úttest adata szerint itt nincs díjfizetési kötelezettség. Ez gyenge bizonyíték — ha van tábla, az számít.",
    };
  }

  return {
    tone: "is-unknown",
    title: "Nem tudjuk megállapítani",
    detail:
      "Erre a pontra nincs parkolási adat az OpenStreetMapben. A pozíciód és az utcanév alatt megvan — a hivatalos zónatérképen ellenőrizheted.",
  };
}

export default function ZoneFinder() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fix, setFix] = useState<Fix | null>(null);
  const [data, setData] = useState<ZoneResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  // Percenként újraértékeljük az idősávot, hogy a "most fizetős" ne álljon meg.
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const lookup = useCallback(async (point: LatLon, accuracy: number | null) => {
    setPhase("looking-up");
    setMessage("Zóna keresése a térképadatokban…");
    try {
      const response = await fetch(
        `/api/zone?lat=${point.lat.toFixed(6)}&lon=${point.lon.toFixed(6)}`,
        { headers: { Accept: "application/json" } },
      );
      const json = (await response.json()) as ZoneResponse;
      setFix({ point, accuracy });
      if (!response.ok) {
        setPhase("error");
        setMessage(json.error ?? "A zóna lekérdezése nem sikerült.");
        return;
      }
      setData(json);
      setPhase("done");
      setMessage(null);
    } catch {
      setFix({ point, accuracy });
      setPhase("error");
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
      await lookup(
        { lat: position.coords.latitude, lon: position.coords.longitude },
        position.coords.accuracy ?? null,
      );
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

  const verdict = data?.verdict ?? null;

  const hours = useMemo(
    () => evaluateHours(verdict?.hoursExpression ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verdict?.hoursExpression, tick],
  );

  const banner = useMemo(
    () => (verdict ? buildBanner(verdict, hours) : null),
    [verdict, hours],
  );

  const primaryZone = data?.zones?.[0] ?? null;
  const outline = useMemo(() => primaryZone?.outline ?? [], [primaryZone]);
  const neighbours = useMemo(
    () =>
      (data?.nearbyZones ?? [])
        .filter((z) => z.outline.length > 0)
        .slice(0, 4)
        .map((z) => ({ outline: z.outline, label: z.code ?? z.name })),
    [data],
  );

  const busy = phase === "locating" || phase === "looking-up";

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }, []);

  const place = [data?.admin.district, data?.admin.city].filter(Boolean).join(", ");

  return (
    <>
      <button className="locate" onClick={run} disabled={busy} type="button">
        {busy ? <span className="spinner" aria-hidden /> : <span aria-hidden>📍</span>}
        {busy ? "Keresés…" : "Melyik zónában állok?"}
      </button>

      {phase === "idle" && (
        <p className="hint">
          A böngésző egyszer rákérdez a helyadatra. Semmit nem telepítesz,
          nem regisztrálsz.
        </p>
      )}

      {message && (
        <div className={phase === "error" ? "note bad" : "hint"}>{message}</div>
      )}

      {phase === "done" && data && verdict && banner && (
        <>
          <section className="card">
            <div className={`statusbar ${banner.tone}`}>
              <span className="dot" aria-hidden />
              <span>
                {banner.title}
                <small>{banner.detail}</small>
              </span>
            </div>

            <div className="codeblock">
              <div>
                <div className="label">Zónakód</div>
                {verdict.code ? (
                  <div className="value">{verdict.code}</div>
                ) : (
                  <div className="value missing">
                    nincs az adatban
                  </div>
                )}
              </div>
              {verdict.code && (
                <button
                  className={copied ? "copy done" : "copy"}
                  onClick={() => copyCode(verdict.code!)}
                  type="button"
                >
                  {copied ? "✓ Másolva" : "Kód másolása"}
                </button>
              )}
            </div>

            {!verdict.code && verdict.paid === "paid" && (
              <div className="note warn">
                A hely fizetős, de a zónakódot a térképadat nem tartalmazza. A
                kód az utcai zónatáblán és a parkolóautomatán van kiírva — és
                lent a hivatalos zónatérképen is megnézheted.
              </div>
            )}

            <div className="chips">
              {place && (
                <span className="chip">
                  Hely: <strong>{place}</strong>
                </span>
              )}
              {data.streetName && (
                <span className="chip">
                  Utca: <strong>{data.streetName}</strong>
                </span>
              )}
              {fix?.accuracy != null && (
                <span className="chip">
                  GPS: <strong>±{Math.round(fix.accuracy)} m</strong>
                </span>
              )}
              <span className={`badge ${verdict.confidence}`}>
                {CONFIDENCE_LABEL[verdict.confidence]}
              </span>
            </div>

            <dl className="facts">
              {hours.supported && hours.todayRanges.length > 0 && (
                <>
                  <dt>Ma fizetős</dt>
                  <dd>{hours.todayRanges.join(", ")}</dd>
                </>
              )}
              {verdict.hoursExpression && (
                <>
                  <dt>Időszak (nyers)</dt>
                  <dd>
                    <code>{verdict.hoursExpression}</code>
                    {!hours.supported && " — ezt a kifejezést nem tudtuk értelmezni"}
                  </dd>
                </>
              )}
              {verdict.charge && (
                <>
                  <dt>Díj</dt>
                  <dd>{verdict.charge}</dd>
                </>
              )}
              {verdict.maxstay && (
                <>
                  <dt>Max. várakozás</dt>
                  <dd>{verdict.maxstay}</dd>
                </>
              )}
              {primaryZone?.operator && (
                <>
                  <dt>Üzemeltető</dt>
                  <dd>{primaryZone.operator}</dd>
                </>
              )}
              <>
                <dt>Forrás</dt>
                <dd>{SOURCE_LABEL[verdict.source]}</dd>
              </>
            </dl>

            {fix?.accuracy != null && fix.accuracy > ACCURACY_WARN_M && (
              <div className="note warn">
                A GPS pontossága most ±{Math.round(fix.accuracy)} méter. Ekkora
                hibahatárnál előfordulhat, hogy a szomszédos zónát mutatjuk.
              </div>
            )}
            {primaryZone?.distanceMeters != null &&
              primaryZone.distanceMeters < BORDER_WARN_M && (
                <div className="note warn">
                  Zónahatár közelében állsz (kb. {primaryZone.distanceMeters} m).
                  Nézd meg a szomszédos zónákat is.
                </div>
              )}

            <details className="raw" style={{ marginTop: 16 }}>
              <summary>Miből következtettünk erre?</summary>
              <ul className="reasons">
                {verdict.evidence.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
              {data.streets.length > 0 && (
                <ul className="reasons">
                  {data.streets.map((street) =>
                    street.sides.map((side, index) => (
                      <li key={`${street.osmId}-${index}`}>
                        {street.name ?? "névtelen út"} · {side.label}:{" "}
                        {[
                          side.placement,
                          side.fee ? `fee=${side.fee}` : null,
                          side.restriction,
                          side.zone ? `zóna ${side.zone}` : null,
                          side.interval,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </li>
                    )),
                  )}
                </ul>
              )}
            </details>
          </section>

          {fix && (
            <section className="card">
              <h2>Térkép</h2>
              <ZoneMap
                point={fix.point}
                accuracyMeters={fix.accuracy}
                outline={outline}
                neighbours={neighbours}
              />
              <div className="linkrow">
                <a
                  href="https://nemzetimobilfizetes.hu/parking_purchases/zonainfo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hivatalos zónatérkép
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${fix.point.lat},${fix.point.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pozíció a Google Mapsen
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

          {data.lots.length > 0 && (
            <section className="card">
              <h2>Parkolók a közelben</h2>
              <ul className="plain">
                {data.lots.map((lot) => (
                  <li key={lot.osmUrl}>
                    <strong>{lot.name ?? "Parkoló"}</strong>
                    {lot.distanceMeters != null && ` — kb. ${lot.distanceMeters} m`}
                    {lot.fee === "yes" ? " · fizetős" : lot.fee === "no" ? " · ingyenes" : ""}
                    {lot.charge ? ` · ${lot.charge}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2>Mielőtt elindítod a parkolást</h2>
            <p style={{ margin: 0, fontSize: 15, color: "var(--ink-soft)" }}>
              Vesd össze a kódot az utcai zónatáblával vagy a parkolóautomatával.
              Ez az oldal nyílt térképadatból dolgozik, nem a szolgáltató
              hivatalos nyilvántartásából.
            </p>
            <details className="raw" style={{ marginTop: 14 }}>
              <summary>Nyers válasz (hibabejelentéshez)</summary>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </details>
          </section>
        </>
      )}
    </>
  );
}
