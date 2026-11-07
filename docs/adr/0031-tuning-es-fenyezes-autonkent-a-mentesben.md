# ADR-0031: Tuning és fényezés autómodellenként, a mentésben

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó autószerelőket kért. A szerelőnél vett fejlesztésnek (tuning) és új színnek meg kell maradnia a játék újraindítása és az autóváltás után is, különben értelmetlen fizetni érte. A mentés (`progress`) eddig az autókat csak sorszámmal tárolta (`owned`, `activeCar`).

## Döntés
Két új mentett mező: `progress.tuning[i]` (0–`TUNE_MAX` szint) és `progress.paint[i]` (a `PAINTS` paletta sorszáma vagy `null`), ahol `i` a `CAR_MODELS` sorszáma – ugyanaz az index, amit a mentés már használ (ezért a `CAR_MODELS` továbbra is csak a végén bővülhet). A modell alapadatai nem változnak: az `applyCarModel` a játékos autójára alkalmazza a szorzót (`TUNE_SPEED` a végsebességre, `TUNE_ACCEL` a gyorsulásra) és a színt; az AI autók érintetlenek. A `sanitizeProgress` a hibás értékeket kiszűri (szint 0–3, érvényes palettaszín), a régi mentés üres listát kap. A szerelőnél csak akkor lehet fizetni, ha a saját autód a műhely előtt áll (`MECHANIC_REACH`), bérautón nem.

## Elvetett alternatívák
- A tuning beírása a `CAR_MODELS` elemeibe: a modell közös (AI és bolt is használja), és mentéskor nem lenne elválasztható az alapértéktől.
- Objektum autónévvel kulcsolva: az autók eddig is sorszámmal azonosítódnak a mentésben; a név átírása elveszítené a fejlesztést.
- Fényezés tetszőleges színkóddal: a paletta egyszerűbb, és könnyen ellenőrizhető mentéskor.

## Következmények
- (+) A fejlesztés autónként megmarad, a régi mentések működnek.
- (+) Új tuningolható tulajdonság az `applyCarModel`-ben egy szorzóval felvehető.
- (−) A `PAINTS` palettát is csak a végén szabad bővíteni (a mentés sorszámot tárol).
