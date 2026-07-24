# Brief — 2048 (számösszevonós logikai játék) oktatási appba

**Kategória:** Matematika
**Elérhető:** 2. évfolyamtól
**Játéktípus:** logikai / számfejlesztő puzzle (single player, offline)
**Platform:** böngésző-alapú, egyfájlos HTML (mobil + tablet + desktop, érintés és billentyű)

---

## 1. Egymondatos leírás
Csúsztasd össze az azonos számú csempéket a rácson — két egyforma szám összeadódik —,
és építs egyre nagyobb kettőhatványokat (2 → 4 → 8 → 16 …), miközben gyors fejszámolást,
tervezést és stratégiai gondolkodást gyakorolsz.

## 2. Miért a Matek kategóriába, és miért 2. évfolyamtól?
- **Kettőzés (duplázás) élménye:** a játék teljes mechanikája a „veszek két egyformát,
  és a kétszeresét kapom" művelet — ez a 2. évfolyamos szorzás/kétszerezés-előkészítés
  játékba ágyazott formája.
- **Fejszámolás számkörben:** 2. osztályban a 100-as számkörben mozgunk. A 3×3-as pálya
  kis célszámmal (32/64) végig e számkörön belül tart, így nem visz túl korai tartalmat.
- **Nincs szövegértési akadály:** a játék pusztán számokkal és irányokkal működik, olvasás
  nem szükséges — épp illik a 2. évfolyam olvasási szintjéhez.
- **Azonnali vizuális visszacsatolás:** a gyerek látja, ahogy két „4"-esből „8" lesz — a
  művelet eredménye kézzelfogható, nem absztrakt.

## 3. Tanulási célok / fejlesztett kompetenciák (NAT-hoz igazítva)
- **Számfogalom, mennyiségek:** kettőhatványok sorozatának megtapasztalása, számok
  összehasonlítása (melyik a nagyobb).
- **Műveletek:** összeadás és kétszerezés fejben, gyorsan, ismételten.
- **Kombinatív és stratégiai gondolkodás:** előretervezés, „mi lesz a következő lépés
  következménye", zsákutca elkerülése.
- **Téri tájékozódás:** a négy irány (fel / le / balra / jobbra) tudatos használata.
- **Kitartás, hibakezelés:** a visszavonás (undo) miatt a hibázás nem büntetés, hanem
  tanulási lehetőség — támogatja a próbálkozó, felfedező attitűdöt.
- **Figyelem és munkamemória:** a tábla állapotának fejben tartása lépések között.

## 4. Évfolyam szerinti nehézségi skálázás (a meglévő funkciókkal)
A játék rácsmérete és célszáma állítható. A skálázás **kumulatív**: minden magasabb
évfolyamon elérhető marad az összes kisebb pálya is, és felfelé bővül egy újabb mérettel.
Így a gyerek szabadon választhat a már ismert, könnyebb pályák és az új kihívás között.

| Szint | Évfolyam | Elérhető rácsok | Új ezen a szinten | Ajánlott cél-csempe |
|------|----------|-----------------|-------------------|---------------------|
| Kezdő | **2. évf.** | **3×3, 4×4** | 3×3 és 4×4 | 32 – 128 |
| Alap | 3–4. évf. | 3×3, 4×4, **5×5** | 5×5 | 128 – 512 |
| Haladó | 5–6. évf. | 3×3, 4×4, 5×5, **6×6** | 6×6 | 1024 – 2048 |

> **Alapértelmezett és cél évfolyamonként:**
> - 2. évfolyamon a **3×3 legyen az alapértelmezett**, és a cél egy elérhető kis szám
>   (pl. 64) — a 4×4 már választható, de a klasszikus „2048" cél alsóban ne jelenjen meg.
> - Feljebb az alapértelmezett pálya és a célszám lépcsőzetesen nő, de a kisebb pályák
>   végig elérhetők maradnak (differenciálás, ismétlés, sikerélmény).

## 5. Miért jó ez a verzió oktatásra (a beépített funkciók)
- **Visszavonás (undo):** hibázás után visszaléphet — kulcsfontosságú kisiskolásoknál,
  csökkenti a frusztrációt.
- **Automatikus mentés:** óra közben megszakítható, később folytatható ugyanonnan.
- **Kikapcsolható hang + rezgés:** osztálytermi használatnál némítható; egyénileg
  motiváló visszajelzést ad.
- **Egyszerű, nem zavaró színvilág:** a figyelem a számokon marad.
- **Választható rács a haladási szint szerint** — differenciálásra alkalmas.

## 6. Akadálymentesség / bevezetendő fejlesztések oktatási kontextusra
- **Reklám eltávolítása:** a jelenlegi alsó reklámsávot gyerek-/oktatási környezetben
  **ki kell venni vagy kikapcsolni** (kiskorúaknak szóló app → reklámmentes). A kód egy
  jól elkülönített `.ad-slot` blokk, egyszerűen kivehető vagy feltételhez köthető.
- **Célszám-beállítás felvétele:** jelenleg a győzelmi cél fixen 2048 — kérjük kiegészíteni
  évfolyamhoz igazítható cél-csempével (pl. tanári beállítás / szint szerint).
- **Számok mellett opcionális pöttyös (mennyiség-)megjelenítés** a 2. évfolyamnak, hogy a
  szám és a mennyiség összekapcsolódjon (későbbi bővítés).
- **Színvakbarát mód** és nagyobb kontraszt opció.

## 7. Haladáskövetés / mérőszámok (ha az app gyűjti)
- elért legnagyobb csempe és pontszám (rácsméretenként külön),
- befejezett játékok száma, játékidő,
- lépésenkénti „merge"-ek aránya (mennyire tudatosan játszik),
- undo-használat (nehézségi visszajelzés a differenciáláshoz).

## 8. Rövid megvalósítási megjegyzés
A játék kész, önálló HTML (`games/2048/index.html`), külső függőség nélkül fut. Oktatási
integrációhoz a fenti 6. pont (reklám ki, évfolyamhoz kötött célszám) az elsődleges teendő;
a rácsméret-alapú differenciálás már ma is elérhető.
