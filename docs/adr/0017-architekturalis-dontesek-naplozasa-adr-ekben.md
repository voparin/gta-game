# ADR-0017: Architekturális döntések naplózása ADR-ekben, teszttel ellenőrizve

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó kérte, hogy minden architekturális döntés legyen naplózva. A döntések addig csak a commit-üzenetekben és a beszélgetésben voltak meg.

## Döntés
Minden architekturális döntés a `docs/adr/` mappába kerül, sorszámozott, magyar nyelvű fájlként (Kontextus, Döntés, Elvetett alternatívák, Következmények), a `docs/adr/README.md` táblázatában listázva. Elfogadott ADR-t nem írunk át; változáskor új ADR váltja fel. A füstteszt ellenőrzi: minden fájl szerepel a listában és fordítva, folytonos a sorszám, egyezik a státusz, megvannak a kötelező részek, és nincs kitöltetlen minta. Hogy mi számít architekturális döntésnek, azt a `CLAUDE.md` írja le.

## Elvetett alternatívák
- Döntések csak a commit-üzenetekben: nehezen kereshető, nincs benne az elvetett alternatíva.
- Egyetlen hosszú döntési dokumentum: átírásnál elvész a történet.
- Teszt nélküli szabály: könnyen elfelejthető (a kódátnézés is talált ilyet).

## Következmények
- (+) Új munkamenetben vagy más fejlesztőnek is visszakereshető, miért ilyen a kód.
- (+) A teszt miatt a hiányos naplózás a publikálást is megállítja.
- (−) Minden döntésnél dokumentálni kell, ami lassítja a fejlesztést.
