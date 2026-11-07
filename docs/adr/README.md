# Architekturális döntések (ADR)

Itt van naplózva minden architekturális döntés: mit, miért és milyen alternatívák helyett választottunk.
Új döntéshez másold a [template.md](template.md)-t a következő sorszámmal, és vedd fel az alábbi táblázatba.

| # | Döntés | Státusz | Dátum |
|---|---|---|---|
| [0001](0001-bongeszos-jatek-tiszta-html-javascript-canvas.md) | Böngészős játék tiszta HTML + JavaScript (Canvas 2D) alapon | Elfogadva | 2026-11-06 |
| [0002](0002-egyetlen-game-js-fajl-modulok-nelkul.md) | Egyetlen `game.js` fájl, modulok nélkül | Elfogadva | 2026-11-06 |
| [0003](0003-fustteszt-node-ban-kamu-bongeszokornyezettel-fuggoseg.md) | Füstteszt Node-ban, kamu böngészőkörnyezettel, függőség nélkül | Elfogadva | 2026-11-07 |
| [0004](0004-automatikus-publikalas-github-actions-teszt-github.md) | Automatikus publikálás: GitHub Actions teszt → GitHub Pages | Elfogadva | 2026-11-07 |
| [0005](0005-felulnezetes-autofizika-elore-oldaliranyu-bontassal-kozos.md) | Felülnézetes autófizika előre/oldalirányú bontással, közös a játékosnak és az AI-nak | Elfogadva | 2026-11-07 |
| [0006](0006-chunk-alapu-determinisztikus-menet-kozben-generalt.md) | Chunk-alapú, determinisztikus, menet közben generált világ | Elfogadva | 2026-11-07 |
| [0007](0007-utak-es-benzinkutak-analitikus-keplettel-szamolt.md) | Utak és benzinkutak analitikus (képlettel számolt) elhelyezése | Elfogadva | 2026-11-07 |
| [0008](0008-szereplok-megjelenitese-es-eltuntetese-a-jatekos.md) | Szereplők megjelenítése és eltüntetése a játékos körül | Elfogadva | 2026-11-07 |
| [0009](0009-ejszakai-fenyek-kulon-fenyterkeppel.md) | Éjszakai fények külön fénytérképpel | Elfogadva | 2026-11-06 |
| [0010](0010-valos-ido-es-jatekido-szetvalasztasa-a.md) | Valós idő és játékidő szétválasztása; a menü megállítja a játékot | Elfogadva | 2026-11-07 |
| [0011](0011-elorehaladas-mentese-localstorage-ban.md) | Előrehaladás mentése localStorage-ban | Elfogadva | 2026-11-07 |
| [0012](0012-determinisztikus-tesztek-kikapcsolhato-veletlen-rendszerekkel.md) | Determinisztikus tesztek, kikapcsolható véletlen rendszerekkel | Elfogadva | 2026-11-07 |
| [0013](0013-rendorseg-az-ai-autok-kozott-jelzokkel.md) | Rendőrség az AI autók között, jelzőkkel | Elfogadva | 2026-11-07 |
| [0014](0014-mertekegysegek-1-km-h-4-px.md) | Mértékegységek: 1 km/h = 4 px/s, 10 px = 1 m | Elfogadva | 2026-11-07 |
| [0015](0015-verziozas-version-allando-changelog-git-cimkek.md) | Verziózás: VERSION állandó + CHANGELOG + git-címkék, teszttel kikényszerítve | Elfogadva | 2026-11-07 |
| [0016](0016-jutalmazasi-rendszer-szerencsejatek-elemek-nelkul.md) | Jutalmazási rendszer szerencsejáték-elemek nélkül | Elfogadva | 2026-11-07 |
| [0017](0017-architekturalis-dontesek-naplozasa-adr-ekben.md) | Architekturális döntések naplózása ADR-ekben, teszttel ellenőrizve | Elfogadva | 2026-11-07 |
| [0018](0018-kodatnezes-es-refaktoralas-a-fejlesztesi-folyamatban.md) | Kódátnézés és refaktorálás a fejlesztési folyamatban | Elfogadva | 2026-11-07 |
| [0019](0019-vegtelen-palya.md) | Végtelen pálya | Elfogadva | 2026-11-07 |
| [0020](0020-autoversenyek-ellenorzopontokkal-a-racson.md) | Autóversenyek ellenőrzőpontokkal a rácson, versenyzők az aiCars-ban | Elfogadva | 2026-11-07 |
| [0021](0021-varosi-buszok-buszmegallok-es-utazas.md) | Városi buszok, buszmegállók és utazás a buszon | Elfogadva | 2026-11-07 |
| [0022](0022-autoberles-a-megallok-melletti-parkolokban.md) | Autóbérlés a megállók melletti parkolókban: a játékos autója bérautóvá válik | Elfogadva | 2026-11-07 |
| [0023](0023-teglalap-alaku-akadalyok-a-kor-alakuak-mellett.md) | Téglalap alakú akadályok (házak) a kör alakúak mellett | Elfogadva | 2026-11-07 |
| [0024](0024-tornado-es-lerombolhato-hazak.md) | Tornádó és lerombolható házak (kivétel a változatlan chunk-tartalom alól) | Elfogadva | 2026-11-07 |
| [0025](0025-hazak-belseje-kulon-koordinata-rendszeru-szoba.md) | Házak belseje: külön koordináta-rendszerű szoba | Elfogadva | 2026-11-07 |
