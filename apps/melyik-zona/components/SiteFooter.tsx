export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <p>
          <strong>Nem hivatalos szolgáltatás.</strong> A zónakódot és a fizetős
          időszakot a parkolás megkezdése előtt vesd össze az utcai
          zónatáblával vagy a parkolóautomatával. A megadott adat alapján
          indított parkolásért felelősséget nem vállalunk.
        </p>
        <p>
          Az adatok forrása az{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          (ODbL licenc), az{" "}
          <a
            href="https://overpass-api.de/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Overpass API
          </a>
          -n keresztül lekérdezve. A térképadatot önkéntesek tartják karban:
          hiányos és elavult is lehet.
        </p>
        <p>
          A helyadatod nem kerül tárolásra. A koordinátát kizárólag a zóna
          kikeresésére használjuk, felhasználóhoz kötve nem naplózzuk. Nincs
          reklám és nincs analitika.
        </p>
      </div>
    </footer>
  );
}
