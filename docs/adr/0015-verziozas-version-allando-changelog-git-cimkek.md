# ADR-0015: Verziózás: VERSION állandó + CHANGELOG + git-címkék, teszttel kikényszerítve

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó kérte, hogy minden kiadásnál legyen verzióléptetés.

## Döntés
`FŐ.KISEBB.JAVÍTÁS` számozás: új funkció → KISEBB, javítás/beállítás → JAVÍTÁS, mérföldkő → FŐ. A verzió a `game.js` `VERSION` állandójában és a `CHANGELOG.md` legfelső bejegyzésében van; a füstteszt ellenőrzi, hogy egyeznek. Minden kiadás `v<verzió>` git-címkét kap. A verzió az Esc menü alján látszik.

## Elvetett alternatívák
- Csak git-címkék: a játékban nem látszana a verzió.
- `package.json` verzió: nincs npm projekt (ADR-0001).

## Következmények
- (+) Elfelejtett verzióléptetésnél a teszt, így a publikálás is elbukik.
- (−) Minden kiadásnál két helyen kell írni (VERSION és CHANGELOG).
