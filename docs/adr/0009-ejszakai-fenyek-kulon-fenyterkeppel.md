# ADR-0009: Éjszakai fények külön fénytérképpel

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-06

## Kontextus
30 percenként nappal/éjszaka váltás kell, éjszaka világító villanyoszlopokkal.

## Döntés
Egy képernyőméretű, külön canvasra (`light`) sötét réteget rajzolunk, és `destination-out` művelettel „kilyukasztjuk” a lámpák, fényszórók, torkolattüzek helyén; ezt a fő képre rajzoljuk, majd `lighter` művelettel meleg fényudvart adunk hozzá. Az éjszaka mértékét a `nightAmount(time)` adja (2 perces alkonyat/hajnal).

## Elvetett alternatívák
- Minden objektum színének sötétítése egyenként: sok kód, és nem ad valódi fénykört.
- WebGL shaderek: szebb, de ellentmond az ADR-0001 egyszerűségének.

## Következmények
- (+) Egyszerű, gyors, bármilyen fényforrás hozzáadható.
- (−) A fény nem vet árnyékot az akadályok mögé.
