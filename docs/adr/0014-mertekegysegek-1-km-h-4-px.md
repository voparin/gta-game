# ADR-0014: Mértékegységek: 1 km/h = 4 px/s, 10 px = 1 m

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A kijelzőn km/h és méter jelenik meg, a játék pixelekben számol; a sebességkorlát és az autók végsebessége ehhez kötött.

## Döntés
`KMH = 4`: a km/h értéket a px/s sebesség néggyel osztva kapjuk. Távolságnál 10 px = 1 m. Minden játékos felé mutatott érték ezekből számolódik.

## Elvetett alternatívák
- Valósághű méretarány (egy 72 px-es autó kb. 4,5 m → 16 px/m): a sebességek túl kicsinek tűnnének.

## Következmények
- (+) Egységes kijelzés.
- (−) Ha a skála változik, a `SPEED_LIMIT` és a `CAR_MODELS` sebességei is újrahangolandók.
