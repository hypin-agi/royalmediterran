import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CoverageView from "@/components/CoverageView";

export const metadata: Metadata = {
  title: "Lefedettség — Melyik Zóna?",
  description:
    "Hol tudunk parkolási zónát mondani Magyarországon? Élő lekérdezés az OpenStreetMap adataiból, térképen és településenkénti bontásban.",
};

export default function CoveragePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="band" style={{ borderTop: "none" }}>
          <div className="wrap">
            <h2 style={{ fontSize: "clamp(26px, 5.5vw, 34px)" }}>
              Az ország mely részét tudjuk értelmezni?
            </h2>
            <p className="lead">
              Ez az oldal nem becslés: élőben lekérdezi az összes magyarországi
              parkolási zónát az OpenStreetMapből, és megmutatja, hol van
              belőlük annyi adat, hogy zónakódot is tudjunk mondani. Ahol üres
              a térkép, ott nem az oldal romlott el — ott egyszerűen nincs
              feltérképezve a zóna.
            </p>
            <CoverageView />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
