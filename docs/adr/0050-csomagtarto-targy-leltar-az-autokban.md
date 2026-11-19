# ADR-0050: Csomagtartó – tárgy-leltár az autókban

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-19

## Kontextus
Eddig a boltban vett tárgyak (csoki, elsősegély, benzin, bomba, sorsjegy) azonnal felhasználódtak –
nem volt hordozható tárgy-leltár. A felhasználó azt kérte, hogy az autóknak legyen csomagtartójuk,
amibe tárgyakat lehet rakni és onnan kivenni. Tisztázott döntések: minden saját autónak van
csomagtartója (bérautó, ló, bicikli, repülő nem), közös doboz korlátos hellyel, a hozzáférés az autó
hátuljánál E-vel, és a bolti tárgyak is a csomagtartóba vehetők.

## Döntés
- **Adatszerkezet (a mentésben, ADR-0047 formátum bővítése):** `progress.trunks` objektum, kulcs =
  `CAR_MODELS` sorszám (a csomagtartó az autómodellhez kötött, nem globális), érték = `[{ id, n }]`
  (id = tárgy azonosító, n = 1..99 darab). Autónként legfeljebb `TRUNK_SLOTS` (6) **fajta** tárgy, egy
  fajtából több darab. `sanitizeTrunks` szigorúan szűr (ismeretlen id, rossz darab, CAR_MODELS-en
  kívüli index eldobva), mint a `tuning`/`paint`.
- **Tárolható tárgyak:** `STORABLE` halmaz a bolti fogyóeszközökről (`choc, sandwich, medkit, coffee,
  fuel, bomb, ticket`). A tuning/fényezés/nitró/telefon nem tárgy, nem tárolható.
- **Közös hatás-függvény:** a tárgyhatások (`heal`, `sober`, `fuel`, `bomb`, telefon, tuning…) a
  `buyItem`-ből kiemelve egy közös `applyItem(it, roll)`-ba; ezt hívja a bolti vásárlás és a
  csomagtartóból kivétel is (nincs kódduplikáció).
- **Logika (tiszta, tesztelt):** `trunkOf`, `trunkAdd`, `trunkTake`, `trunkFullFor`. A kivétel a
  `shopBlocker`-rel ellenőrzi, hogy van-e most értelme a tárgynak (pl. tele életnél a medkit marad).
- **Elérés:** `atCarTrunk()` – gyalog, saját autó, az autó **hátsó pontjánál** (`carRear`, szoros, 26 px-es
  sugár, hogy a beszállás legyen az elsőbb). `toggleCar` ág és `interactionPrompt` sor. Külön modális
  ablak: `trunk`, `openTrunk`/`closeTrunk`/`trunkKey`/`trunkClick`/`drawTrunk` (a `shop` mintájára), a
  `shop.open` összes kísérő-listájába (keydown/mousedown/wheel/render/kurzor/frame) bekötve.
- **Boltban „csomagtartóba” gomb:** a tárolható tárgyak sorában egy 🧳 gomb (`drawShop`), a
  `buyItem(i, roll, toTrunk=true)` a pénz levonása után `trunkAdd`-del tárol (nem hat azonnal); az
  autónak a bolt előtt kell lennie (`carNearShop`), és kell szabad hely.
- A csomagtartó a profillal/mentéssel együtt utazik (ADR-0047); a `netState` nem viszi (csak helyzet
  utazik, ADR-0044).

## Elvetett alternatívák
- **Globális, autótól független leltár:** egyszerűbb, de a felhasználó kifejezetten az autó
  csomagtartóját kérte; a modellhez kötött tárolás illik a megvett autók rendszeréhez.
- **Minden tárgy tárolható (tuning, telefon is):** a tuning/fényezés nem tárgy, hanem az autó állapota;
  összezavarná a leltárt.
- **Külön jármű-slot a csomagtartóhoz / második autó:** fölösleges bonyolítás; a tároló a meglévő
  autómodellhez tartozik.
- **Hozzáférés bármikor, gombbal (vezetés közben is):** a felhasználó az autó hátuljánál adott E-t
  választotta; ez kézzelfoghatóbb és nem foglal új billentyűt.

## Következmények
- (+) Hordozható tárgyak; a bolti vétel és a kivétel közös hatás-kódot használ (karbantartható).
- (+) Szigorú mentés-szanálás: régi mentés üres csomagtartót kap, hibás adat eldobva.
- (−) A hátsó, szoros zóna (26 px) és a beszállás (75 px) egymás mellett van; ezért a teszt a
  beszálláshoz az autó oldalához áll. Ha a jövőben változik a beszállás-logika, erre figyelni kell.
- (−) A csomagtartó csak a bolti fogyóeszközöket és a bombát kezeli; a földről felvett dolgok (pl. a
  repedt telefon) egyelőre a saját rendszerükben maradnak (későbbi bővítés lehet).
