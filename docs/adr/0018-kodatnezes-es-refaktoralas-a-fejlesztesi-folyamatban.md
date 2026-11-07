# ADR-0018: Kódátnézés és refaktorálás a fejlesztési folyamatban

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó kérte, hogy legyen kódátnézés és refaktorálás is. Az első teljes átnézés 10 találatot hozott, köztük valódi hibákat (ingyenes tankolás pénz nélkül, elvesző szintbónusz, sérült mentésnél elinduló hiba).

## Döntés
Minden kiadás előtt a változtatást át kell nézni a `code-review` skill-lel vagy egy független reviewer subagenttel. A találatokat egyenként ellenőrizni kell a kódban; a megerősített hibákra regressziós teszt kerül, amiről ellenőrizzük, hogy a régi kóddal elbukik. A refaktorálás viselkedést nem változtat, a meglévő teszteket nem írhatja át, és külön commitban és verzióban kerül ki.

## Elvetett alternatívák
- Csak automatikus tesztek: a logikai és egyensúlyhibákat (pl. ingyenes tankolás) nem fogják meg.
- Refaktorálás a funkciókkal együtt: ha valami elromlik, nehéz megtalálni az okát.

## Következmények
- (+) Több hiba derül ki publikálás előtt; a regressziós tesztek megakadályozzák a visszatérésüket.
- (−) Hosszabb kiadási folyamat.
- (−) A reviewer téves találatokat is adhat, ezért minden találatot ellenőrizni kell, mielőtt javítunk.
