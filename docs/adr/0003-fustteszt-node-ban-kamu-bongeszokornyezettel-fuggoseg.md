# ADR-0003: Füstteszt Node-ban, kamu böngészőkörnyezettel, függőség nélkül

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
Kell egy automatikus ellenőrzés, ami eldönti, hogy egy változás „működik-e”, de nem akarunk tesztkeretrendszert vagy fej nélküli böngészőt függőségként.

## Döntés
A `tests/smoke.test.js` a `game.js`-t `eval`-lal futtatja egy Proxy-alapú kamu canvas/window/document környezetben, képkockánként lépteti a játékot, és `check(...)` sorokkal ellenőrzi a viselkedést. Kilépési kód: 0 = siker.

## Elvetett alternatívák
- Jest/Vitest + jsdom: kényelmesebb, de npm-függőség.
- Playwright fej nélküli böngészővel: valódi rajzolást is látna, de lassú és nehéz függőség.

## Következmények
- (+) Gyors, függőség nélküli, CI-ben is fut.
- (−) A rajzolás helyességét nem ellenőrzi, csak azt, hogy hiba nélkül lefut.
- A tesztek determinisztikusak legyenek (lásd ADR-0012).
