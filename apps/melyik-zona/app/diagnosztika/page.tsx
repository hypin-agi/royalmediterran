import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DiagnosticsView from "@/components/DiagnosticsView";

export const metadata: Metadata = {
  title: "Diagnosztika — Melyik Zóna?",
  description:
    "Méri, hogy a koordináta → parkolási zóna leképezés tényleg működik-e: ismert pontokra lefuttatja ugyanazt a lekérdezést, amit a gomb használ.",
};

export default function DiagnosticsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="band" style={{ borderTop: "none" }}>
          <div className="wrap">
            <h2 style={{ fontSize: "clamp(26px, 5.5vw, 34px)" }}>
              Működik egyáltalán a zóna-felismerés?
            </h2>
            <p className="lead">
              Az egész oldal egyetlen dolgon áll vagy bukik: meg tudjuk-e
              mondani egy koordinátáról, melyik parkolási zónában van. Ez az
              oldal nem magyarázza, hanem <strong>megméri</strong> — ismert
              budapesti és vidéki pontokra lefuttatja ugyanazt a lekérdezést,
              amit a gomb is használ, és kiírja, mit kapott vissza.
            </p>
            <DiagnosticsView />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
