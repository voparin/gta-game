# ADR-0042: Fegyvertár: váltható fegyverek, újratöltődő lőszerrel, és a játékos saját bombázója

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó azt kérte, hogy a játékosnak is legyen atombombája, ballisztikus rakétája, többféle fegyvere és bombázó repülőgépe. Eddig a játékosnak egy pisztolya (bal klikk / F) és egy lerakható bombája (B) volt; atombombát és rakétát csak a háborús bombázóval tudott bevetni (ADR-0038), amit csak háborúban talált.

## Döntés
- **Fegyvertár** (`WEAPONS`, `arsenal`): pisztoly, sörétes puska (6 sörét legyezőben), gépfegyver, rakétavető (becsapódáskor `explode`), ballisztikus rakéta (a meglévő `missiles` listába `side: 'P'`, az egérrel megjelölt pontra, legfeljebb `MISSILE_MAX_RANGE`), atombomba (lerakott eszköz `nukeDevices`, `NUKE_FUSE` mp után a háborús `nuke`). Váltás: G vagy egérgörgő; tűz: a meglévő bal klikk / F (`updatePlayerShooting` → `fireWeapon`).
- A nehézfegyvereknek korlátos, **idővel újratöltődő** lőszere van (`max`, `regen`: rakétavető 10 / 15 mp, rakéta 3 / 60 mp, atombomba 1 / 300 mp); a rakétához és az atombombához minden lövéshez újra meg kell nyomni a gombot (`arsenal.latch`), hogy nyomva tartva ne ürüljön ki a tár. A rakéta és az atombomba ★★ körözést von maga után. A lőszer nincs a mentésben (újraindításkor tele).
- **Saját bombázó**: J – a játékos saját gépe (`planes[].own`, `side: 'P'`) mellé száll tele lőszerrel; egyszerre egy, `OWN_PLANE_CD` mp-enként hívható. A gép a meglévő repülő-rendszert használja (ADR-0038). Repülés közben a bal klikk géppuska, a bombák a B-n maradnak.

## Elvetett alternatívák
- Mentett, pénzért vehető lőszer: újabb bolt és mentési mező kellett volna; az újratöltődés egyszerű, és korlátozza a nehézfegyverek szórását.
- Számgombos fegyverváltás: az 1–2 a kocsmában italt vesz, a 1–9 a boltokban vásárol; a G / görgő nem ütközik semmivel.
- A saját bombázó a `CAR_MODELS`-ben: a repülő nem autó (ADR-0038).

## Következmények
- (+) A meglévő rendszerek (lövedékek, `explode`, `missiles`, `nuke`, repülők) újrahasznosítva, kevés új kód.
- (−) A nehézfegyverek erősek; az egyensúlyt a lőszer, az újratöltési idő és a körözés tartja.
