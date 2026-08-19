import Link from "next/link";
import ZoneFinder from "@/components/ZoneFinder";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="hero">
          <div className="wrap">
            <span className="eyebrow">Ingyenes · reklámmentes · regisztráció nélkül</span>
            <h1>Melyik parkolási zónában állsz?</h1>
            <p className="sub">
              Nyomd meg a gombot, és a telefon GPS-e alapján megmondjuk a
              zónakódot, azt hogy épp most kell-e fizetni, és meddig tart a
              fizetős időszak. A parkoló-applikációk ezért külön díjat kérnek.
            </p>
            <ZoneFinder />
          </div>
        </section>

        <section className="band" id="hogyan">
          <div className="wrap">
            <h2>Hogyan működik</h2>
            <p className="lead">
              Nincs mögötte fiók, felhő vagy előfizetés. Három lépés, és minden
              lépésnél megmondjuk, mire alapozzuk a választ.
            </p>
            <div className="steps">
              <div className="step">
                <div className="num">1</div>
                <h3>Pozíció</h3>
                <p>
                  A böngésző elkéri a GPS-koordinátát. Kiírjuk a mért
                  pontosságot is, mert egy ±60 méteres fix mellett könnyen a
                  szomszéd zóna jönne ki.
                </p>
              </div>
              <div className="step">
                <div className="num">2</div>
                <h3>Térképadat</h3>
                <p>
                  A koordináta köré lekérdezzük az OpenStreetMap parkolási
                  adatait: a zónahatárokat és az úttestre rögzített
                  információt is. Ez a kettő gyakran nem ugyanott van meg.
                </p>
              </div>
              <div className="step">
                <div className="num">3</div>
                <h3>Válasz</h3>
                <p>
                  Zónakód, díj, és a fizetős időszak kiértékelve a mostani
                  budapesti időre — a hétvégét és a munkaszüneti napokat is
                  beleszámolva.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="band sunk">
          <div className="wrap">
            <h2>Amit tud, és amit nem</h2>
            <p className="lead">
              Egy rossz zónakód büntetést ér, ezért inkább bevalljuk, ha nem
              tudjuk. Az oldal soha nem tippel díjat vagy kódot.
            </p>
            <div className="steps">
              <div className="step">
                <h3>✓ Amiben megbízhatsz</h3>
                <p>
                  Ha van zónahatár az adatban, a pont-a-poligonban számítás
                  pontos. A fizetős időszak kiértékelése is az: hétvége,
                  ünnepnap, éjfélen átnyúló sáv mind kezelve van.
                </p>
              </div>
              <div className="step">
                <h3>⚠ Ahol óvatos legyél</h3>
                <p>
                  A zónakód sok helyen egyszerűen hiányzik a térképadatból. A
                  díjak pedig gyakran elavultak — ezért csak akkor mutatjuk
                  őket, ha tényleg szerepelnek az adatban.
                </p>
              </div>
              <div className="step">
                <h3>✗ Amit nem csinál</h3>
                <p>
                  Nem indít parkolást, nem kér adatot, nem tárol semmit. Ha egy
                  helyről nincs adat, azt írja ki, hogy nincs — nem azt, hogy
                  ingyenes.
                </p>
              </div>
            </div>
            <div className="linkrow">
              <Link href="/lefedettseg">
                Nézd meg, az ország mely részén van adat →
              </Link>
            </div>
          </div>
        </section>

        <section className="band" id="gyik">
          <div className="wrap">
            <h2>Gyakori kérdések</h2>
            <div className="faq">
              <details>
                <summary>Miért ingyenes ez?</summary>
                <p>
                  Mert a mögötte lévő adat is ingyenes és nyilvános. Az
                  OpenStreetMapet önkéntesek építik, az Overpass API pedig
                  szabadon lekérdezhető. Nincs mit felszámolni érte.
                </p>
              </details>
              <details>
                <summary>Miért nem találja meg minden helyen a zónát?</summary>
                <p>
                  Mert a magyar parkolási zónák nincsenek egységesen
                  feltérképezve az OpenStreetMapben. Van, ahol pontos
                  zónapoligon van kóddal, máshol csak annyi szerepel az
                  utcán, hogy fizetős, és van, ahol semmi. A{" "}
                  <a href="/lefedettseg">lefedettségi térképen</a> pontosan
                  látszik, hol mi van.
                </p>
              </details>
              <details>
                <summary>Honnan tudja, hogy 18 óra után már nem kell fizetni?</summary>
                <p>
                  Az adatban szereplő időszak-kifejezésből (például{" "}
                  <code>Mo-Fr 08:00-18:00</code>), amit budapesti helyi időre
                  értékelünk ki. A magyar munkaszüneti napokat is ismerjük, a
                  húsvéthoz kötött mozgó ünnepekkel együtt. Ha a kifejezést nem
                  tudjuk biztosan értelmezni, inkább kiírjuk nyersen, mint hogy
                  rosszul mondjuk meg.
                </p>
              </details>
              <details>
                <summary>Mennyire pontos a GPS?</summary>
                <p>
                  Városban, házak között jellemzően 5–50 méter. Az oldal kiírja
                  a mért hibahatárt, és szól, ha az akkora, hogy a szomszéd
                  zónát is jelenthetné, illetve ha zónahatár közelében állsz.
                </p>
              </details>
              <details>
                <summary>Rossz adatot látok. Mit tegyek?</summary>
                <p>
                  Az eredmény alján a „Nyers válasz" alatt megtalálod pontosan
                  azt, amit a térképadat mond. Mivel a forrás az
                  OpenStreetMap, a hibát bárki javíthatja is benne — a javítás
                  egy napon belül megjelenik itt is.
                </p>
              </details>
              <details>
                <summary>Kell hozzá alkalmazás?</summary>
                <p>
                  Nem. Ez egy weboldal, böngészőben fut. Ha gyakran használnád,
                  a telefon menüjéből kiteheted a kezdőképernyőre, és onnantól
                  úgy indul, mint egy alkalmazás — de attól még weboldal marad.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
