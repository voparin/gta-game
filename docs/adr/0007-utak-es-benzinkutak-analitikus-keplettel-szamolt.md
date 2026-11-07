# ADR-0007: Utak és benzinkutak analitikus (képlettel számolt) elhelyezése

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
Az utaknak, járdáknak, kereszteződéseknek és benzinkutaknak a teljes pályán konzisztensnek kell lenniük, chunkhatárokon átívelve is.

## Döntés
Az utak szabályos rácsban futnak (`ROAD_SPACING` = 5000 px, `ROAD_OFFSET` = 2500 px); hogy egy pont úton van-e, képlet dönti el (`nearestRoad`, `onRoad`, `roadsIn`). A benzinkutak kereszteződésenként, a kereszteződés indexéből seedelt RNG-vel dőlnek el (`stationFor(i, j)`), a kezdőhely mellett mindig van. A járda és a lámpák helyzete az útból számolódik (`EDGE`, `WALK_OFF`, `LAMP_OFF`).

## Elvetett alternatívák
- Utak tárolt geometriaként (szakaszlista): rugalmasabb úthálózat, de chunkhatáron bonyolult.
- Véletlenszerű úthálózat: érdekesebb, de az AI-navigáció sokkal nehezebb.

## Következmények
- (+) Olcsó lekérdezés bárhol; az AI sávkövetése és a gyalogosok járdán sétálása egyszerű.
- (−) Az úthálózat egyhangú rács; kanyargós utakhoz új ADR kell.
