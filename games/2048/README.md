# 2048 — választható rácsmérettel

Önálló, egyfájlos 2048 játék. Nincs függősége, nyisd meg a `index.html`-t böngészőben.

## Funkciók

- **Választható rács:** 3×3, 4×4, 5×5, 6×6. A választó **csak új játék indításakor és a
  játék végén** jelenik meg (az „Új játék" gomb, ill. a „Vége" képernyő) — játék közben
  nem látszik, így nem lehet véletlenül nullázni.
- **Rekordok a választóban:** minden pályaméret mellett ott a hozzá tartozó rekord.
- **Sima animációk:** az eredeti 2048 mintájára a pozíció (`translate`) és a megjelenés
  (`scale`) külön elemen fut; az összeolvadó csempe is odacsúszik a célcellába.
- **Egyszerű, nem zavaró színek:** homokszínből meleg felé haladó, visszafogott skála.
- **Reklámhely:** a képernyő alján fix, 90 px magas `REKLÁM` sáv van fenntartva (`.ad-slot`).
- **Pontozás:** aktuális pont + méretenként külön elmentett legjobb eredmény (`localStorage`).
  A fejléc „Legjobb" mezője mindig az aktuális pálya rekordját mutatja.
- **Vezérlés:** nyilak vagy WASD billentyűk, illetve érintőn swipe.
- **Reszponzív:** a tábla a képernyőhöz igazodik.

## Szabály

Húzással a csempék egy irányba tolódnak; két azonos érték összeér és összeadódik.
Minden lépés után új csempe (2 vagy 4) jelenik meg. A cél a 2048 elérése; a játék
véget ér, ha megtelik a rács és nincs több lehetséges lépés.

## Testreszabás

- Új méret: bővítsd a `SIZES` tömböt a JS-ben (pl. `[3,4,5,6,7]`).
- Színek: a `.v2` … `.v2048` / `.vhigh` CSS-osztályok.
- Reklám beillesztése: az `.ad-slot` `<div>` tartalmát cseréld a hirdetéskódra.
