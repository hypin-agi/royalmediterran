"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import probeData from "@/data/probe-points.json";

type ProbePoint = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  expectation: "paid" | "free";
};

type Verdict = {
  paid: "paid" | "free" | "unknown";
  source: "official" | "street-table" | "zone" | "street" | "lot" | "none";
  code: string | null;
  confidence: string;
  hoursExpression: string | null;
};

type Row = {
  point: ProbePoint;
  state: "pending" | "running" | "done" | "error";
  verdict: Verdict | null;
  district: string | null;
  city: string | null;
  streetName: string | null;
  ms: number;
  error: string | null;
};

type Status = {
  official: {
    loaded: boolean;
    version: string;
    source: string;
    zoneCount: number;
    withCode: number;
    withHours: number;
  };
  streetTable: {
    loaded: boolean;
    version: string;
    source: string;
    entries: number;
    uniqueStreets: number;
  };
};

const POINTS = (probeData as { points: ProbePoint[] }).points;

const SOURCE_LABEL: Record<Verdict["source"], string> = {
  official: "hivatalos poligon",
  "street-table": "utcajegyzék",
  zone: "OSM zóna",
  street: "OSM utca",
  lot: "parkoló",
  none: "nincs",
};

const PAID_LABEL: Record<Verdict["paid"], string> = {
  paid: "fizetős",
  free: "ingyenes",
  unknown: "nem tudni",
};

export default function DiagnosticsView() {
  const [status, setStatus] = useState<Status | null>(null);
  const [rows, setRows] = useState<Row[]>(
    POINTS.map((point) => ({
      point,
      state: "pending",
      verdict: null,
      district: null,
      city: null,
      streetName: null,
      ms: 0,
      error: null,
    })),
  );
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const run = useCallback(async () => {
    abortRef.current = false;
    setRunning(true);
    setCopied(false);
    setRows((prev) =>
      prev.map((row) => ({ ...row, state: "pending", verdict: null, error: null })),
    );

    for (let index = 0; index < POINTS.length; index++) {
      if (abortRef.current) break;
      const point = POINTS[index];
      setRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, state: "running" } : row)),
      );

      const started = Date.now();
      try {
        const response = await fetch(
          `/api/zone?lat=${point.lat}&lon=${point.lon}`,
          { headers: { Accept: "application/json" } },
        );
        const json = await response.json();
        const ms = Date.now() - started;
        setRows((prev) =>
          prev.map((row, i) =>
            i === index
              ? {
                  ...row,
                  state: response.ok ? "done" : "error",
                  verdict: json.verdict ?? null,
                  district: json.admin?.district ?? null,
                  city: json.admin?.city ?? null,
                  streetName: json.streetName ?? null,
                  ms,
                  error: json.error ?? null,
                }
              : row,
          ),
        );
      } catch (error) {
        setRows((prev) =>
          prev.map((row, i) =>
            i === index
              ? {
                  ...row,
                  state: "error",
                  ms: Date.now() - started,
                  error: String(error),
                }
              : row,
          ),
        );
      }

      // Az Overpass fair-use korlátja miatt nem lövünk párhuzamosan.
      await new Promise((r) => window.setTimeout(r, 900));
    }

    setRunning(false);
  }, []);

  const done = rows.filter((row) => row.state === "done" || row.state === "error");
  const withCode = done.filter((row) => row.verdict?.code);
  const expectedPaid = rows.filter((row) => row.point.expectation === "paid");
  const expectedPaidDone = done.filter((row) => row.point.expectation === "paid");
  const expectedPaidWithCode = expectedPaidDone.filter((row) => row.verdict?.code);
  const expectedPaidRecognised = expectedPaidDone.filter(
    (row) => row.verdict?.paid === "paid",
  );
  const controls = done.filter((row) => row.point.expectation === "free");
  const controlsWrong = controls.filter((row) => row.verdict?.paid === "paid");
  // A lánc GPS-oldali fele: utcanév + kerület. Az utcajegyzék-réteg ezen áll.
  const withStreet = done.filter((row) => row.streetName);
  const withArea = done.filter((row) => row.district || row.city);

  const report = useCallback(() => {
    const lines = [
      `Melyik Zóna? — diagnosztika`,
      `Futtatva: ${new Date().toISOString()}`,
      `Hivatalos poligonok: ${
        status?.official.loaded
          ? `betöltve, ${status.official.zoneCount} zóna (${status.official.source})`
          : "NINCS betöltve"
      }`,
      `Hivatalos utcajegyzék: ${
        status?.streetTable.loaded
          ? `betöltve, ${status.streetTable.uniqueStreets} közterület (${status.streetTable.source})`
          : "NINCS betöltve"
      }`,
      ``,
      `pont | forrás | kód | fizetős | időszak | kerület | ms`,
      ...done.map((row) =>
        [
          row.point.label,
          row.verdict ? SOURCE_LABEL[row.verdict.source] : "HIBA",
          row.verdict?.code ?? "—",
          row.verdict?.paid ?? "—",
          row.verdict?.hoursExpression ?? "—",
          row.district ?? row.city ?? "—",
          row.ms,
        ].join(" | "),
      ),
      ``,
      `Zónakódot kapott: ${withCode.length}/${done.length}`,
      `Utcanév megvan: ${withStreet.length}/${done.length} · kerület/település: ${withArea.length}/${done.length}`,
      `Várhatóan fizetős pontok: ${expectedPaidDone.length}, ebből fizetősnek felismert: ${expectedPaidRecognised.length}, kóddal: ${expectedPaidWithCode.length}`,
      `Kontrollpont tévesen fizetős: ${controlsWrong.length}/${controls.length}`,
    ];
    return lines.join("\n");
  }, [
    done,
    status,
    withCode.length,
    withStreet.length,
    withArea.length,
    expectedPaidDone.length,
    expectedPaidRecognised.length,
    expectedPaidWithCode.length,
    controls.length,
    controlsWrong.length,
  ]);

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(report());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [report]);

  return (
    <>
      <div className="card">
        <h2>Adatforrás állapota</h2>
        {status === null ? (
          <p style={{ margin: 0 }}>Betöltés…</p>
        ) : (
          <>
            <div
              className={`statusbar ${status.official.loaded ? "is-free" : "is-unknown"}`}
            >
              <span className="dot" aria-hidden />
              <span>
                Hivatalos zóna-poligonok:{" "}
                {status.official.loaded ? "betöltve" : "nincsenek betöltve"}
                <small>
                  {status.official.loaded
                    ? `${status.official.zoneCount.toLocaleString("hu-HU")} zóna, ebből ${status.official.withCode.toLocaleString("hu-HU")} kóddal · ${status.official.source} (${status.official.version})`
                    : "Ez adná a legpontosabb választ: pont-a-poligonban számítással, zónahatárra pontosan."}
                </small>
              </span>
            </div>

            <div
              className={`statusbar ${status.streetTable.loaded ? "is-free" : "is-unknown"}`}
            >
              <span className="dot" aria-hidden />
              <span>
                Hivatalos utcajegyzék:{" "}
                {status.streetTable.loaded ? "betöltve" : "nincs betöltve"}
                <small>
                  {status.streetTable.loaded
                    ? `${status.streetTable.uniqueStreets.toLocaleString("hu-HU")} közterület, ${status.streetTable.entries.toLocaleString("hu-HU")} sor · ${status.streetTable.source} (${status.streetTable.version})`
                    : "Ez poligon nélkül is megadná a zónakódot: utcanév + kerület alapján. Táblázatként jóval könnyebb beszerezni."}
                </small>
              </span>
            </div>

            {!status.official.loaded && !status.streetTable.loaded && (
              <div className="note warn">
                Egyik hivatalos forrás sincs betöltve, így az oldal most csak az
                OpenStreetMapre támaszkodik — abban pedig a magyar zónakódok
                hiányosak. A lenti mérés pontosan megmutatja, ez mit jelent a
                gyakorlatban.
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Koordináta → zóna mérés</h2>
        <p style={{ marginTop: 0, fontSize: 15, color: "var(--ink-soft)" }}>
          {POINTS.length} ismert közterületre lekérdezzük ugyanazt az API-t,
          amit a gomb is használ, és kiírjuk, mit kaptunk vissza. A „várt"
          oszlop emberi feltételezés — nem hiteles adat, csak azért van ott,
          hogy a gyanús eltérések kiugorjanak.
        </p>
        <div className="linkrow">
          <button className="copy" onClick={run} disabled={running} type="button">
            {running
              ? `Mérés fut… (${done.length}/${POINTS.length})`
              : "Mérés indítása"}
          </button>
          {done.length > 0 && !running && (
            <button className="copy" onClick={copyReport} type="button">
              {copied ? "✓ Jelentés a vágólapon" : "Jelentés másolása"}
            </button>
          )}
        </div>

        {done.length > 0 && (
          <>
            <div className="stats" style={{ marginTop: 18 }}>
              <div className="stat">
                <div className="n">
                  {withCode.length}/{done.length}
                </div>
                <div className="t">kapott zónakódot</div>
              </div>
              <div className="stat">
                <div className="n">
                  {expectedPaidRecognised.length}/{expectedPaidDone.length}
                </div>
                <div className="t">várhatóan fizetős pont felismerve</div>
              </div>
              <div className="stat">
                <div className="n">
                  {controlsWrong.length}/{controls.length}
                </div>
                <div className="t">kontrollpont tévesen fizetős</div>
              </div>
              <div className="stat">
                <div className="n">
                  {withStreet.length}/{done.length}
                </div>
                <div className="t">utcanév megvan (ez kell az utcajegyzékhez)</div>
              </div>
              <div className="stat">
                <div className="n">
                  {withArea.length}/{done.length}
                </div>
                <div className="t">kerület vagy település megvan</div>
              </div>
            </div>

            {withCode.length === 0 && (
              <div className="note warn">
                <strong>Egyetlen ponton sem tudtunk zónakódot mondani.</strong>{" "}
                Ez nem szoftverhiba: a nyílt térképadat nem tartalmazza a magyar
                zónakódokat.
                {withStreet.length >= done.length * 0.8 && (
                  <>
                    {" "}
                    Az utcanév és a kerület viszont a pontok többségén megvan —
                    vagyis a lánc GPS-oldali fele működik. Ehhez már elég egy
                    hivatalos <strong>utcajegyzéket</strong> betölteni,
                    zóna-poligon nem is kell hozzá.
                  </>
                )}
              </div>
            )}
          </>
        )}

        <div className="tablescroll" style={{ marginTop: 16 }}>
          <table className="coverage">
            <thead>
              <tr>
                <th>Pont</th>
                <th>Várt</th>
                <th>Forrás</th>
                <th>Kód</th>
                <th>Eredmény</th>
                <th>Időszak</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.point.id}>
                  <td>{row.point.label}</td>
                  <td>{row.point.expectation === "paid" ? "fizetős" : "ingyenes"}</td>
                  <td>
                    {row.state === "pending" && "—"}
                    {row.state === "running" && "…"}
                    {row.verdict && SOURCE_LABEL[row.verdict.source]}
                    {row.state === "error" && !row.verdict && "hiba"}
                  </td>
                  <td>
                    <strong>{row.verdict?.code ?? "—"}</strong>
                  </td>
                  <td>{row.verdict ? PAID_LABEL[row.verdict.paid] : "—"}</td>
                  <td>
                    {row.verdict?.hoursExpression ? (
                      <code>{row.verdict.hoursExpression}</code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
