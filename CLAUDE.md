# Sivatagi GTA – fejlesztési útmutató

Felülnézetes, GTA-szerű böngészős játék. Tiszta HTML + JavaScript (Canvas 2D), nincs build lépés és nincs függőség.

- Repó: https://github.com/voparin/gta-game (nyilvános)
- Élő játék: https://voparin.github.io/gta-game/

## Felépítés

| Fájl | Szerep |
|---|---|
| `index.html` | betölti a canvas-t és a `game.js`-t |
| `game.js` | a teljes játék: világ, karakter, autó, nappal/éjszaka, fények, HUD |
| `tests/smoke.test.js` | füstteszt kamu böngészőkörnyezetben (Node, függőség nélkül) |
| `.github/workflows/deploy.yml` | CI: teszt, majd publikálás GitHub Pages-re |

Fontos állandók a `game.js` elején: `WORLD` (pályaméret), `HALF_CYCLE` (30 perc nappal / 30 perc éjszaka), `FADE` (alkonyat hossza).

## Szokásos fejlesztési flow

1. **Megértés** – olvasd el az érintett részt a `game.js`-ben, mielőtt módosítasz. Kövesd a meglévő stílust (magyar kommentek, rövid függvények, `ctx.save()/restore()` párok).
2. **Fejlesztés** – kis, egy célú változtatások. Új funkció esetén bővítsd a `tests/smoke.test.js`-t is egy `check(...)` sorral, ami az új viselkedést ellenőrzi.
3. **Ellenőrzés helyben** – kötelező, mielőtt bármit publikálsz:
   ```bash
   node --check game.js && node tests/smoke.test.js
   ```
   Csak akkor „működik”, ha mindkettő 0-s kilépési kóddal fut le és minden sor `✓`.
4. **Kipróbálás** – `open index.html`, hogy a felhasználó a böngészőben is lássa.
5. **Publikálás (automatikus)** – ha a 3. lépés sikeres, kérdezés nélkül:
   ```bash
   git add -A
   git commit -m "<rövid, magyar leírás a változásról>"
   git push
   ```
   A push után a GitHub Actions újra lefuttatja a tesztet, és csak siker esetén teszi ki a játékot a GitHub Pages-re. Ellenőrizd az eredményt:
   ```bash
   gh run watch --exit-status $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
   ```
   Ha a CI elbukik, javítsd és pushold újra – ne hagyd piros állapotban.
6. **Jelentés** – írd meg a felhasználónak magyarul: mi változott, a tesztek eredménye, és az élő link.

## Szabályok

- Ha a helyi teszt elbukik, **nem szabad** commitolni vagy pusholni – előbb javítsd.
- Csak a `main` ágra dolgozunk; force push tilos.
- A `.claude/` mappa helyi beállítás, nem kerül a repóba (`.gitignore`).
- Git-identitás repó-szinten be van állítva (`voparin`, GitHub noreply e-mail) – ne módosítsd.
- A felhasználóval magyarul kommunikálj, egyszerűen, szakzsargon nélkül.
