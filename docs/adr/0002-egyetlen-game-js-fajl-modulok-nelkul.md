# ADR-0002: Egyetlen `game.js` fájl, modulok nélkül

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-06

## Kontextus
Build lépés nélkül (ADR-0001) az ES-modulok `file://` alól nem töltődnek be megbízhatóan, a játéknak pedig dupla kattintással is futnia kell.

## Döntés
A teljes játék egy `game.js` fájlban van, szakaszokra bontva (`// ===== … =====`), globális állapottal (`player`, `car`, `aiCars`, `npcs` …). A függvények kicsik és egy célúak.

## Elvetett alternatívák
- ES-modulok több fájlban: átláthatóbb, de `file://` alatt CORS-hiba miatt nem indul.
- Több `<script>` fájl globális névtérben: nem nyújt valódi elkülönítést, csak a sorrendre kell figyelni.

## Következmények
- (+) Egyszerű betöltés, egyszerű tesztelés (`eval` a füsttesztben).
- (−) A fájl nagy; a `CLAUDE.md` „Felépítés” szakasza és ezek az ADR-ek segítik a tájékozódást.
- Ha a fájl kezelhetetlenné válik, új ADR-ben kell dönteni a szétbontásról.
