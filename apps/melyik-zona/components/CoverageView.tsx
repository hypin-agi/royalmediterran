"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

const CoverageMap = dynamic(() => import("./CoverageMap"), { ssr: false });

type Point = { lat: number; lon: number; code: string | null; name: string | null };
type City = { name: string; lat: number; lon: number; zones: number; withCode: number };

type Payload = {
  zoneCount: number;
  zonesWithCode: number;
  feeTaggedStreets: number | null;
  points: Point[];
  cities: City[];
  outsideKnownCities: number;
  cachedAt: string;
  error?: string;
};

export default function CoverageView() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/coverage", {
        headers: { Accept: "application/json" },
      });
      const json = (await response.json()) as Payload;
      if (!response.ok) {
        setError(json.error ?? "A lekérdezés nem sikerült.");
      } else {
        setData(json);
      }
    } catch {
      setError("Nem sikerült elérni a szervert.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="card">
        <div className="statusbar is-unknown">
          <span className="dot" aria-hidden />
          <span>
            Országos lekérdezés fut…
            <small>
              Ez az első betöltésnél akár egy percig is eltarthat: minden
              magyarországi parkolási zónát egyszerre kérünk le. Utána egy
              napig gyorsítótárból jön.
            </small>
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card">
        <div className="note bad">{error ?? "Nincs adat."}</div>
        <div className="linkrow">
          <button className="copy" onClick={() => void load()} type="button">
            Újrapróbálom
          </button>
        </div>
      </div>
    );
  }

  const withoutCode = data.zoneCount - data.zonesWithCode;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="n">{data.zoneCount.toLocaleString("hu-HU")}</div>
          <div className="t">feltérképezett parkolási zóna az országban</div>
        </div>
        <div className="stat">
          <div className="n">{data.zonesWithCode.toLocaleString("hu-HU")}</div>
          <div className="t">ezek közül zónakóddal</div>
        </div>
        <div className="stat">
          <div className="n">
            {data.feeTaggedStreets === null
              ? "—"
              : data.feeTaggedStreets.toLocaleString("hu-HU")}
          </div>
          <div className="t">utcaszakasz parkolási adattal</div>
        </div>
        <div className="stat">
          <div className="n">{data.cities.length}</div>
          <div className="t">település, ahol találtunk zónát</div>
        </div>
      </div>

      <CoverageMap points={data.points} />

      <div className="note">
        Tömör kék pötty = van zónakód, ilyen helyen meg tudjuk mondani, mit
        írj be a parkolóautomatába. Üres karika = ismerjük a zóna határát, de
        kód nincs hozzá az adatban. Ahol egyáltalán nincs pötty, ott az utcára
        rögzített adatra tudunk csak támaszkodni — abból kiderül, hogy fizetős-e
        a szakasz, de a kód általában nem.
      </div>

      {data.cities.length > 0 && (
        <div className="card">
          <h2>Települések bontásban</h2>
          <div className="tablescroll">
            <table className="coverage">
              <thead>
                <tr>
                  <th>Település</th>
                  <th className="num">Zóna</th>
                  <th className="num">Kóddal</th>
                </tr>
              </thead>
              <tbody>
                {data.cities.map((city) => (
                  <tr key={city.name}>
                    <td>{city.name}</td>
                    <td className="num">{city.zones.toLocaleString("hu-HU")}</td>
                    <td className="num">{city.withCode.toLocaleString("hu-HU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-faint)", marginTop: 12 }}>
            A besorolás a zóna középpontjának a legközelebbi ismert
            városközponthoz mért távolsága alapján készül, 15 km-es sugárral —
            nem közigazgatási határ szerint.
            {data.outsideKnownCities > 0 &&
              ` További ${data.outsideKnownCities} zóna egyik listázott településhez sem esett elég közel; ezek a térképen látszanak.`}
          </p>
        </div>
      )}

      <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 18 }}>
        Az adat lekérdezve: {new Date(data.cachedAt).toLocaleString("hu-HU")} ·
        forrás: OpenStreetMap (ODbL), Overpass API.
      </p>
    </>
  );
}
