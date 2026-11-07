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
| `docs/adr/` | architekturális döntések naplója (ADR), lásd lent |

Fontos állandók a `game.js` elején: `WORLD` (pályaméret, a régi 10 000 px-es pálya 30-szoros területe), `CHUNK`, `ROAD_SPACING`, `HALF_CYCLE` (30 perc nappal / 30 perc éjszaka), `FADE` (alkonyat hossza).

Felépítés a `game.js`-en belül:
- **Világ chunkokban**: a pálya 1000×1000 px-es darabokból áll (`getChunk`), amelyek menet közben, determinisztikusan generálódnak (akadályok, villanyoszlopok, dűnék, nyálkafoltok). Ütközésnél és rajzolásnál mindig csak a közeli chunkokat nézd (`chunksAround`, `chunksIn`) – soha ne járd be az egész világot.
- **Utak**: rácsban, `ROAD_SPACING` távolságra (`nearestRoad`, `onRoad`, `roadsIn`).
- **Autók**: egy közös fizika (`updateCarPhysics`) a játékos és az AI autók számára; az AI a `aiCarInput`-ban dönt (sáv követése, kereszteződésben fordulás).
- **Szereplők**: `npcs` (gyalogos / bandita), `aiCars`, `bullets`; a játékostól messze lévőket a `spawnAround` eltünteti, a közelben újakat hoz létre.
- **Időjárás**: `storm` (homokvihar), napszak: `nightAmount`.
- **Benzinkutak**: `stationFor(i, j)` kereszteződésenként determinisztikusan; `stationsIn`, `nearPump`, `nearestStation`. Benzin: `car.fuel`, `updateFuel`.
- **Előrehaladás**: `progress` (pénz, XP, megvett autók, rekordok – localStorage), `earn()` minden jutalomhoz, `levelOf`. Küldetés: `mission`, `updateMission`; drift-kombó: `drift`, `updateDrift`; autóbolt: `buyCar`.
- **Végtelen pálya** (ADR-0019): nincs `WORLD` határ; „egész pályás” keresés helyett mindig korlátos sugarú keresés (pl. `nearestStation`).
- **Versenyek** (ADR-0020): `race` állapot, `planRace`, `startRace`, `updateRace`, `racerInput`; versenyzők az `aiCars`-ban `racer` jelzővel.
- **Buszok** (ADR-0021): `busStopsIn` (analitikus megállók), `spawnCityBus` (`citybus` jelző), `player.riding` (utas), `BUS_FARE`. A zöld busz (`BUS`) csak a játékosé.
- **Parkolók, bérlés** (ADR-0022): `parkingLot`, `lotsIn`, `rentCar`, `RENT_PRICE`, `rentedLots`; zászló: `HU_FLAG`. Bérléskor a `car` veszi fel a `RENTAL_MODEL`-t (nincs második játékosautó).
- **Házak**: `housesIn` (analitikus, 420 px-enként, nincs a kereszteződések/kutak 650 px-es körzetében és a parkolóknál), ütközés: téglalap-akadály (`rect`, ADR-0023, `pushOutOfRect`, `OB_REACH`), `insideHouse`.
- **Tornádó** (ADR-0024): `tornado`, `spawnTornado`, `updateTornado`; lerombolt házak: `destroyedHouses` (az egyetlen kivétel a változatlan chunk-tartalom alól). Tesztben a `tornadoEnabled` kikapcsolható.
- **Házak belseje** (ADR-0025): `player.inHouse`, `doorOf`, `furnitureOf`, `updateInterior`, `drawInterior`. Új világszintű rendszernél döntsd el, hat-e a házban lévő játékosra.
- **Csövesek** (`homeless` NPC): `homelessSpot`, `donate` (modális ablak, mint a menü), `DONATE_MIN`–`DONATE_MAX`; az összeg a `progress.donated`-ben.
- **Rendőrség**: `wanted` (körözési szint), `updateWanted` (gyorshajtás `SPEED_LIMIT` felett, lerázás, letartóztatás), `policeInput` (üldözés). A rendőrautók az `aiCars`-ban vannak `police`/`chasing` jelzővel. Tesztben a `policeEnabled` kikapcsolható.
- Tesztekben a `spawnEnabled`, `slimeEnabled`, `policeEnabled`, `missionsEnabled`, `racesEnabled` és `tornadoEnabled` kikapcsolható, hogy determinisztikus legyen a futás; a teszt szereplőit a játékos közelében, akadálymentes helyen (az úton) helyezd el. Ne írj olyan tesztet, ami véletlen szóráson vagy időzítési szerencsén múlik. A homokvihar a tesztben ki van kapcsolva (`storm.timer = 1e9`), mert a szél minden járművet sodor. Ha egy hely vagy döntés helyességét kell ellenőrizni, ne véletlen szimulációval teszteld, hanem emeld ki tiszta függvénybe (pl. `homelessSpot`), és azt teszteld.

## Architekturális döntések (ADR)

Minden architekturális döntést a `docs/adr/` mappában naplózunk. A meglévők listája: [docs/adr/README.md](docs/adr/README.md).
**Mielőtt a kódban egy meglévő döntéssel ellentétes irányba mennél, olvasd el a vonatkozó ADR-t.**

Mi számít architekturális döntésnek (ilyenkor ADR kell):
- technológia, könyvtár, fájlszerkezet, build vagy futtatási mód megválasztása vagy cseréje
- adatszerkezet, állapotkezelés, mentés formátuma (pl. `progress` mezők jelentése)
- világgenerálás, koordináták, mértékegységek, időkezelés
- közös rendszerek kialakítása (fizika, AI, spawnolás, fények, rendőrség, jutalmak)
- teszt-, CI-, publikálási vagy verziózási folyamat
- olyan termék- vagy tervezési elv, ami a későbbi fejlesztéseket korlátozza

Nem kell ADR: hangolás és beállítás (pl. sebességkorlát értéke, árak), szöveg, apró hibajavítás, új funkció, ami a meglévő döntéseket követi.

Szabályok:
1. Másold a `docs/adr/template.md`-t a következő sorszámmal (`NNNN-rovid-cim.md`), töltsd ki magyarul: Kontextus, Döntés, Elvetett alternatívák, Következmények.
2. Vedd fel a `docs/adr/README.md` táblázatába.
3. Elfogadott ADR tartalmát **nem írjuk át**. Ha egy döntés megváltozik, új ADR készül, a régi státusza pedig `Felváltva: [ADR-XXXX](…)` lesz (a táblázatban is).
4. Az ADR ugyanabban a commitban kerüljön a repóba, mint a döntést megvalósító kód.
5. Ha a felhasználó egy irányt kér, de félbehagyatja (pl. elkezdett, majd leállított átalakítás), és nem került kódba, nem kell ADR.

## Szokásos fejlesztési flow

1. **Megértés** – olvasd el az érintett részt a `game.js`-ben, mielőtt módosítasz. Kövesd a meglévő stílust (magyar kommentek, rövid függvények, `ctx.save()/restore()` párok).
2. **Fejlesztés** – kis, egy célú változtatások. Új funkció esetén bővítsd a `tests/smoke.test.js`-t is egy `check(...)` sorral, ami az új viselkedést ellenőrzi. Ha a változás architekturális döntést tartalmaz, írd meg hozzá az ADR-t (lásd fent).
3. **Ellenőrzés helyben** – kötelező, mielőtt bármit publikálsz:
   ```bash
   node --check game.js && node tests/smoke.test.js
   ```
   Csak akkor „működik”, ha mindkettő 0-s kilépési kóddal fut le és minden sor `✓`.
4. **Kódátnézés (code review)** – minden kiadás előtt nézd át a saját változtatásodat (`git diff`) a `code-review` skill-lel (vagy egy független reviewer subagenttel), legalább ezekre: logikai hibák, határesetek (0, üres, nagyon nagy érték, NaN), elfelejtett régi kódhívások, teljesítmény (soha ne járd be az egész világot, ADR-0006), meglévő ADR-ek megsértése. A megerősített hibákat javítsd, és írj rájuk tesztet; utána újra a 3. lépés.
5. **Refaktorálás** – ha a kódátnézés vagy a fejlesztés közben ismétlődő, túl hosszú vagy nehezen érthető kód derül ki, refaktoráld (lásd lent a „Refaktorálás” szakaszt).
6. **Kipróbálás** – `open index.html`, hogy a felhasználó a böngészőben is lássa.
7. **Verzióléptetés** – minden kiadás előtt:
   - új funkció → a középső szám nő (0.8.0 → 0.9.0); hibajavítás / beállítás → az utolsó (0.8.0 → 0.8.1)
   - írd át a `VERSION` állandót a `game.js` elején, és tegyél a `CHANGELOG.md` tetejére egy új bejegyzést (verzió, dátum, változások magyarul)
   - a teszt ellenőrzi, hogy a kettő egyezik
8. **Publikálás (automatikus)** – ha a 3. és 4. lépés sikeres, kérdezés nélkül:
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
9. **Jelentés** – írd meg a felhasználónak magyarul: mi változott, mit talált a kódátnézés és mit javítottál, az új verziószám, a tesztek eredménye, és az élő link.

## Refaktorálás

- A refaktorálás **nem változtat a játék viselkedésén**: előtte és utána is minden tesztnek zöldnek kell lennie, és nem írhatsz át meglévő `check(...)` elvárást azért, hogy átmenjen.
- Külön commitban (és külön verzióban, JAVÍTÁS szám) legyen, ne keverd új funkcióval – így ha valami elromlik, könnyű visszakeresni.
- Tipikus esetek: ismétlődő kód közös függvénybe (pl. sáv/járda koordináták, billentyű-bemenet), mágikus számok elnevezett állandóba, túl hosszú függvény szétbontása, halott kód törlése.
- Ha a refaktorálás szerkezeti döntés (pl. a `game.js` több fájlra bontása, ADR-0002), előbb ADR kell.
- Nagyobb refaktorálás után a kódátnézést is futtasd újra.

## Szabályok

- Ha a helyi teszt elbukik, **nem szabad** commitolni vagy pusholni – előbb javítsd.
- Csak a `main` ágra dolgozunk; force push tilos.
- A `.claude/` mappa helyi beállítás, nem kerül a repóba (`.gitignore`).
- Git-identitás repó-szinten be van állítva (`voparin`, GitHub noreply e-mail) – ne módosítsd.
- A felhasználóval magyarul kommunikálj, egyszerűen, szakzsargon nélkül.
