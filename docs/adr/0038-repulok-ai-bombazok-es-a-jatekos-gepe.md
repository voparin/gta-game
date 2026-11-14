# ADR-0038: Repülők: AI bombázók a háborúban, a játékos is vezetheti

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó bombázó repülőket kért a háborúkba, amiket a játékos is használhat. A játékban egyetlen játékosjármű van (`car`; a fizika, a kamera és a HUD erre épül), a lovak már megmutatták, hogyan lehet ezt ideiglenesen lecserélni (ADR-0032), a háborúnak pedig saját állapota van (ADR-0036).

## Döntés
- **Játékos-repülő:** a leparkolt gépek (`planes`) mellett E-re a `car` pillanatképét elmentjük (`planeSnap`), és a `PLANE_MODEL` lép a helyére (`car.plane`, a lóhoz hasonlóan `rental: true`, `fuelUse: 0`). A mozgás nem autófizika: `updatePlane` (W/S gáz–fék `PLANE_MIN`–`PLANE_MAX` között, a gép nem tud megállni; A/D kanyar), a földi dolgokkal (házak, autók, `carCollisions`) nincs ütközés, a gyorshajtás-körözés nem érvényes rá. B: tűz, V: fegyverváltás (`cyclePlaneWeapon`, `dropAirBomb`): légibomba (`PLANE_AMMO` darab; `AIRBOMB_FALL` mp-ig esik, aztán igazi `explode`: házak is dőlnek, körözés jár), ballisztikus rakéta (`PLANE_MISSILES` darab; a gép orra előtt `PLAYER_MISSILE_RANGE` px-re csapódik be, a háborús rakétákkal közös `missiles` listában `side: 'P'`, ezért a háború vége nem törli) és atombomba (`PLANE_ATOMS` darab; `ATOM_FALL` mp-ig esik, aztán a háború végén használt `nuke`, a halálos kör miatt a játékosnak el kell menekülnie). A rakéta és az atombomba ★★ körözést von maga után (a körözésnek két szintje van). A lőszer a géppel marad (`planes[].ammo`), a repülőn ülőt a földi robbanás (bomba, rakéta, gránát) nem éri, az atombomba igen. E: `PLANE_LAND` alatti sebességnél leszállsz (a gép leparkol, később újra felszállhatsz), fölötte kiugrasz (ejtőernyő, kis sérülés, a gép lezuhan). Halál, autóváltás és elrablás közben a gép leparkol / lezuhan, és az autó visszatér (mint a lónál).
- **AI bombázók:** a háború alatt `BOMBER_EVERY` időközönként egy bombázó (`bombers`) átrepül a csatatér fölött, és a csatatér közepén bombákat szór (`airBombs`, `side` oldali; a `shell` a saját oldalt kíméli, sugara `AIRBOMB_RADIUS`). A háború kezdetén mindkét sereg mögött egy leparkolt gép áll, ezekre a játékos is felülhet.
- Az állapotok nincsenek a mentésben.

## Elvetett alternatívák
- A repülő a `CAR_MODELS` listában megvehető autó: a mentés sorszámait bővítené, és a repülő nem autó (nincs benzin, ütközés, sáv).
- A repülő a háború `soldiers` listájában: a gép nem a földi harc része, más a mozgása és a sebzése.
- Valódi magasság és leszállópálya: több állapot és ütközés; a „nem tud megállni, lassan leszállhatsz” szabály egyszerű és játszható.

## Következmények
- (+) Az ütközés, kamera, HUD és az E-ág változatlanul működik; az új rendszer csak a `car.plane` ágakon kapcsolódik.
- (−) Új, a `car`-t cserélő rendszernél a lovat és a repülőt is figyelembe kell venni (`car.horse`, `car.plane`).
