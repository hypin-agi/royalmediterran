# 2048 — választható rácsmérettel

Önálló, egyfájlos 2048 játék. Nincs függősége, nyisd meg a `index.html`-t böngészőben.

## Funkciók

- **Választható rács:** 3×3, 4×4, 5×5, 6×6 — a gombokkal váltható, minden méret új játékot indít.
- **Egyszerű, nem zavaró színek:** homokszínből meleg felé haladó, visszafogott skála.
- **Reklámhely:** a képernyő alján fix, 90 px magas `REKLÁM` sáv van fenntartva (`.ad-slot`).
- **Pontozás:** aktuális pont + méretenként külön elmentett legjobb eredmény (`localStorage`).
- **Vezérlés:** nyilak vagy WASD billentyűk, illetve érintőn swipe.
- **Reszponzív:** a tábla a képernyőhöz igazodik.

## Szabály

Húzással a csempék egy irányba tolódnak; két azonos érték összeér és összeadódik.
Minden lépés után új csempe (2 vagy 4) jelenik meg. A cél a 2048 elérése; a játék
véget ér, ha megtelik a rács és nincs több lehetséges lépés.

## Testreszabás

- Új méret: bővítsd a `.size-picker` gombjait (`data-size`).
- Színek: a `.v2` … `.v2048` / `.vhigh` CSS-osztályok.
- Reklám beillesztése: az `.ad-slot` `<div>` tartalmát cseréld a hirdetéskódra.
