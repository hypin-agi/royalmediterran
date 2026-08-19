import ZoneFinder from "@/components/ZoneFinder";

export default function Home() {
  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" aria-hidden />
        <h1>Melyik Zóna?</h1>
      </div>
      <p className="lede">
        Egy gomb, és megmondja, melyik parkolási zónában áll az autód — a
        telefonod GPS-e alapján, ingyen. Nincs regisztráció, nincs
        &bdquo;kényelmi díj&rdquo;.
      </p>

      <ZoneFinder />

      <footer>
        <p>
          Az adatok forrása az{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          (ODbL licenc), lekérdezve az Overpass API-n keresztül. A zónahatárok és
          a díjak közösségi térképadatból származnak, ezért lehetnek hiányosak
          vagy elavultak.
        </p>
        <p>
          <strong>Ez nem hivatalos szolgáltatás.</strong> A parkolás
          megkezdése előtt mindig ellenőrizd az utcai zónatáblát vagy a
          parkolóautomatát. A megadott kód alapján indított parkolásért
          felelősséget nem vállalunk.
        </p>
        <p>
          A böngésződ helyadata nem kerül tárolásra: a koordinátát csak a zóna
          kikeresésére használjuk, és nem naplózzuk felhasználóhoz kötve.
        </p>
      </footer>
    </main>
  );
}
