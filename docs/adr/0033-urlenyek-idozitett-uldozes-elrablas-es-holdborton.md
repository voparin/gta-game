# ADR-0033: Űrlények: időzített üldözés, elrablás, a Hold-börtön külön állapot

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-13

## Kontextus
A felhasználó űrlényeket kért, amik 3 percenként üldözőbe veszik a játékost, és ha elkapják, elrabolják, a Holdra viszik és börtönbe zárják. A játékban már van letartóztatás (`player.arrested`), ház belseje (külön koordináta-rendszerű szoba, ADR-0025) és több modális/állapot-ág az `update`-ben.

## Döntés
- Az űrlények külön listában élnek (`aliens`), nem az `npcs`-ben (ott a gyalogosok sok közös rendszerben – bomba, tornádó, rendőrség, járda – részt vesznek). Az időzítő (`alienClock`, `ALIEN_INTERVAL` = 180 mp, a játékidővel, tehát menüben áll) 3 űrlényt hoz 900–1100 px-re. Egyenesen a játékos felé repülnek (`ALIEN_SPEED` 175 px/s: sétálót elérik, futót – 220 px/s – és gyors autót nem), `ALIEN_CHASE_TIME` mp után feladják. Házban, buszon nem lehet elkapni; autóban csak lassú (`ALIEN_CAR_SLOW`) autót. Lövéssel (3 találat) és bombával kiirthatók (`ALIEN_BOUNTY`).
- Elkapás → `player.abduct` (rövid jelenet, `ABDUCT_TIME`) → `player.moon` (a Hold-börtön: külön, a `drawInterior`-hoz hasonló rajz és mozgás a cellában, `MOON_TERM` mp). A `controllable()` mindkettő alatt hamis, így a meglévő rendszerek (lövés, bomba, E) nem működnek. Letelte után a játékos oda kerül vissza, ahol elrabolták; a lóról leszállítják (ADR-0032).
- Szökés: a cella sarkában egy résen (`ESCAPE_SPOT`, E) át a játékos a „Fordított Világba” jut (`player.moon.horror`): külön arénában (`HORROR_W`×`HORROR_H`, saját lövedék-lista, nem a világ `bullets`-e) démogorgonokat kell lelőnie (`HORROR_KILLS` = 3, egyenként `DEMO_HP` találat). Győzelem → a Földre kerül vissza, ahol elrabolták (`leaveMoon`); ha az élete elfogy, vissza a cellába, újra a teljes `MOON_TERM`-mel. A szökés alatt a büntetési idő áll.
- Az állapotok nincsenek a mentésben.

## Elvetett alternatívák
- Űrlény mint `npcs` elem: sok helyen kivételt kellene kezelni.
- A börtön valódi világ-terület a Holdon: a világ végtelen és képletből épül (ADR-0006, ADR-0019); egy kis külön jelenet egyszerűbb és biztonságos.
- Büntetés pénzben vagy tárgyvesztéssel: a felhasználó csak a börtönt kérte, ezért idő a büntetés.

## Következmények
- (+) Önálló rendszer, a meglévőkhöz csak a `controllable()` és az `update` ágai kapcsolódnak.
- (−) Új, a játékost mozgató rendszernél figyelni kell az `abduct` / `moon` állapotra (a `controllable()` ezt lefedi).
