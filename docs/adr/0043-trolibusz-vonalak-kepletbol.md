# ADR-0043: Trolibuszok: képletből számolt vonalak és megállók, a busz-rendszeren

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó trolibuszokat kért megállókkal, $3-os jeggyel. Van már városi busz (ADR-0021, menetrend ADR-0027) és utas-rendszer (`player.riding`), a világ képletből épül (ADR-0006).

## Döntés
- Trolivonal minden 3. vízszintes úton van (`trolleyRoad`, a kezdőhely útján is), felsővezetékkel (`drawTrolleyWires`). A trolimegállók (`trolleyStopsIn`) a vonalakon 2500 px-enként, a buszmegállóktól 625 px-re (`TROLLEY_OFFSET`), mindkét oldalon – képletből, nincs tárolt állapot.
- A trolibusz a városi busz egy változata (`citybus: true`, `trolley: true`, `TROLLEY` modell): ugyanaz a megálló-logika (`aiCarInput`), csak a saját megállóinál áll meg, és a kereszteződésben nem fordul be (a vezeték mentén megy). Menetrend: `TROLLEY_INTERVAL` (40 mp) időközönként a játékoshoz legközelebbi trolimegálló felé indul egy (`dispatchTrolley`). Az utas-rendszer változatlan, a jegy `TROLLEY_FARE` ($3).

## Elvetett alternatívák
- Külön jármű-rendszer a trolinak: a busz minden szükséges viselkedést tud.
- A buszmegállók közös használata: a két jármű ugyanott torlódna, és nem lenne saját „vonal” érzés.

## Következmények
- (+) Kevés új kód, determinisztikus és tesztelhető.
- (−) Csak vízszintes utakon van trolivonal; a térképen külön nem jelenik meg.
