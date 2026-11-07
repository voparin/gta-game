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
| `CHANGELOG.md` | változásnapló, verziónként |

Fontos állandók a `game.js` elején: `WORLD` (pályaméret, a régi 10 000 px-es pálya 30-szoros területe), `CHUNK`, `ROAD_SPACING`, `HALF_CYCLE` (30 perc nappal / 30 perc éjszaka), `FADE` (alkonyat hossza).

Felépítés a `game.js`-en belül:
- **Világ chunkokban**: a pálya 1000×1000 px-es darabokból áll (`getChunk`), amelyek menet közben, determinisztikusan generálódnak (akadályok, villanyoszlopok, dűnék, nyálkafoltok). Ütközésnél és rajzolásnál mindig csak a közeli chunkokat nézd (`chunksAround`, `chunksIn`) – soha ne járd be az egész világot.
- **Utak**: rácsban, `ROAD_SPACING` távolságra (`nearestRoad`, `onRoad`, `roadsIn`).
- **Autók**: egy közös fizika (`updateCarPhysics`) a játékos és az AI autók számára; az AI a `aiCarInput`-ban dönt (sáv követése, kereszteződésben fordulás).
- **Szereplők**: `npcs` (gyalogos / bandita), `aiCars`, `bullets`; a játékostól messze lévőket a `spawnAround` eltünteti, a közelben újakat hoz létre.
- **Időjárás**: `storm` (homokvihar), napszak: `nightAmount`.
- **Benzinkutak**: `stationFor(i, j)` kereszteződésenként determinisztikusan; `stationsIn`, `nearPump`, `nearestStation`. Benzin: `car.fuel`, `updateFuel`.
- **Előrehaladás**: `progress` (pénz, XP, megvett autók, rekordok – localStorage), `earn()` minden jutalomhoz, `levelOf`. Küldetés: `mission`, `updateMission`; drift-kombó: `drift`, `updateDrift`; autóbolt: `buyCar`.
- **Rendőrség**: `wanted` (körözési szint), `updateWanted` (gyorshajtás `SPEED_LIMIT` felett, lerázás, letartóztatás), `policeInput` (üldözés). A rendőrautók az `aiCars`-ban vannak `police`/`chasing` jelzővel. Tesztben a `policeEnabled` kikapcsolható.
- Tesztekben a `spawnEnabled`, `slimeEnabled`, `policeEnabled` és `missionsEnabled` kikapcsolható, hogy determinisztikus legyen a futás; a teszt szereplőit a játékos közelében, akadálymentes helyen (az úton) helyezd el. Ne írj olyan tesztet, ami véletlen szóráson vagy időzítési szerencsén múlik.

## Szokásos fejlesztési flow

1. **Megértés** – olvasd el az érintett részt a `game.js`-ben, mielőtt módosítasz. Kövesd a meglévő stílust (magyar kommentek, rövid függvények, `ctx.save()/restore()` párok).
2. **Fejlesztés** – kis, egy célú változtatások. Új funkció esetén bővítsd a `tests/smoke.test.js`-t is egy `check(...)` sorral, ami az új viselkedést ellenőrzi.
3. **Ellenőrzés helyben** – kötelező, mielőtt bármit publikálsz:
   ```bash
   node --check game.js && node tests/smoke.test.js
   ```
   Csak akkor „működik”, ha mindkettő 0-s kilépési kóddal fut le és minden sor `✓`.
4. **Kipróbálás** – `open index.html`, hogy a felhasználó a böngészőben is lássa.
5. **Verzióléptetés** – minden kiadás előtt:
   - új funkció → a középső szám nő (0.8.0 → 0.9.0); hibajavítás / beállítás → az utolsó (0.8.0 → 0.8.1)
   - írd át a `VERSION` állandót a `game.js` elején, és tegyél a `CHANGELOG.md` tetejére egy új bejegyzést (verzió, dátum, változások magyarul)
   - a teszt ellenőrzi, hogy a kettő egyezik
6. **Publikálás (automatikus)** – ha a 3. lépés sikeres, kérdezés nélkül:
   ```bash
   git add -A
   git commit -m "v<verzió>: <rövid, magyar leírás a változásról>"
   git tag v<verzió>
   git push && git push origin v<verzió>
   ```
   A push után a GitHub Actions újra lefuttatja a tesztet, és csak siker esetén teszi ki a játékot a GitHub Pages-re. Ellenőrizd az eredményt:
   ```bash
   gh run watch --exit-status $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
   ```
   Ha a CI elbukik, javítsd és pushold újra – ne hagyd piros állapotban.
7. **Jelentés** – írd meg a felhasználónak magyarul: mi változott, az új verziószám, a tesztek eredménye, és az élő link.

## Szabályok

- Ha a helyi teszt elbukik, **nem szabad** commitolni vagy pusholni – előbb javítsd.
- Csak a `main` ágra dolgozunk; force push tilos.
- A `.claude/` mappa helyi beállítás, nem kerül a repóba (`.gitignore`).
- Git-identitás repó-szinten be van állítva (`voparin`, GitHub noreply e-mail) – ne módosítsd.
- A felhasználóval magyarul kommunikálj, egyszerűen, szakzsargon nélkül.
