# ADR-0032: Lovak: vadlovak képletből, a ló ideiglenesen az autó helyére lép

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-13

## Kontextus
A felhasználó lovakat kért, amiken lovagolni lehet. A játékban egyetlen játékosjármű van (`car`, a fizika, az ütközés, a kamera és a HUD erre épül), a világ végtelen (ADR-0019), és a világ elemei képletből keletkeznek (ADR-0006).

## Döntés
- A vadlovak `horsesIn` függvénnyel, 1000 px-es cellánként determinisztikusan keletkeznek (az útra és a házba nem kerülnek), nem tároljuk őket; az elvitt vadló azonosítója a `usedHorses`-be kerül (játékmenet idejére).
- Felülés (E): a `car` pillanatképét elmentjük (`horseSnap`), és az `applyCarModel` a `HORSE_MODEL`-t ráteszi (`type: 'horse'`, nincs benzinfogyasztás, a bérautóhoz hasonlóan `rental: true`, ezért a szerelő nem dolgozik rajta). Így az ütközés, a kamera és a HUD változatlanul működik. A mozgás viszont nem autófizika: a `updateCarPhysics` a lóra az `updateHorse`-t hívja (a WASD közvetlenül irányt ad, mint gyaloglásnál; Shift: vágta; gyors fordulás és megállás, nincs csúszás vagy féknyom).
- Leszállás (E): a ló ott marad (`droppedHorses`, legfeljebb 12), az autó pillanatképe visszakerül oda, ahol hagytad. Autóválasztás vagy újraélesztés közben a ló megszűnik, az autó visszatér.
- A lovak nem kerülnek mentésbe.

## Elvetett alternatívák
- Ló a `CAR_MODELS` listában megvehető autóként: ingyenes vadlovat kértek, a mentés sorszámait is bővítené.
- Ló mint `npcs` elem: a gyalogosok sok közös rendszerben (bomba, tornádó, rendőrség, járda) részt vesznek; lóval minden helyen kivételt kellene írni.
- Második játékosjármű-objektum: a fizika, a kamera, a HUD és a tesztek mind a `car`-ra épülnek.

## Következmények
- (+) Kevés új kód, a meglévő jármű-rendszerek ingyen működnek a lóval.
- (−) Lovaglás közben az eredeti autó „elpihen” (pillanatkép); új, `car`-t módosító rendszernél ezt figyelembe kell venni (pl. `car.horse`).
