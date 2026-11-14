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
| [0026](0026-radio-menet-kozben-generalt-zene-web-audioval.md) | Rádió: menet közben generált zene Web Audio-val, hangfájlok nélkül | Elfogadva | 2026-11-07 |
| [0027](0027-buszmenetrend-percenkent-a-legkozelebbi-megalloba.md) | Buszmenetrend: percenként egy busz a legközelebbi megállóba | Elfogadva | 2026-11-07 |
| [0028](0028-bank-egy-hitel-fix-dijjal-automatikus-torlesztes.md) | Bank: egyszerre egy hitel fix díjjal és automatikus törlesztéssel | Elfogadva | 2026-11-07 |
| [0029](0029-taxi-hivhato-uti-cel-valasztassal.md) | Taxi: hívható, úti cél választással, az utazás átugorható | Elfogadva | 2026-11-07 |
| [0030](0030-terkep-elemzett-poi-k-es-mentett-jelolesek.md) | Térkép: képletből számolt nevezetes helyek és mentett saját jelölések | Elfogadva | 2026-11-07 |
| [0031](0031-tuning-es-fenyezes-autonkent-a-mentesben.md) | Tuning és fényezés autómodellenként, a mentésben | Elfogadva | 2026-11-07 |
| [0032](0032-lovak-az-auto-helyere-lepo-jarmu.md) | Lovak: vadlovak képletből, a ló ideiglenesen az autó helyére lép | Elfogadva | 2026-11-13 |
| [0033](0033-urlenyek-idozitett-uldozes-elrablas-es-holdborton.md) | Űrlények: időzített üldözés, elrablás, a Hold-börtön külön állapot | Elfogadva | 2026-11-13 |
| [0034](0034-vonatok-kepletbol-szamolt-ingajaratok.md) | Vonatok: képletből számolt, 30 mp-enként érkező járatok, a busz utas-rendszerén | Elfogadva | 2026-11-13 |
| [0035](0035-varoslakok-ai-autok-tankolnak-gyalogosok-dolgoznak.md) | Élő város: az AI autók tankolnak, a gyalogosok dolgoznak és szolgáltatást használnak | Elfogadva | 2026-11-13 |
| [0036](0036-haboruk-idozitett-esemeny-sajat-katona-listaval.md) | Háborúk: időzített esemény, külön katonalistával | Elfogadva | 2026-11-13 |
| [0037](0037-telefon-robi-beepitett-mi-kulso-szolgaltatas-nelkul.md) | Telefon és Robi: beépített, szabályalapú „MI” külső szolgáltatás nélkül | Elfogadva | 2026-11-14 |
| [0038](0038-repulok-ai-bombazok-es-a-jatekos-gepe.md) | Repülők: AI bombázók a háborúban, a játékos is vezetheti | Elfogadva | 2026-11-14 |
| [0039](0039-felhokarcolok-belvarosban-parallaxissal.md) | Felhőkarcolók: a házak egy típusa, belvárosi fürtökben, parallaxissal rajzolva | Elfogadva | 2026-11-14 |
| [0040](0040-eldobhato-telefon-es-mentett-heverő-targyak.md) | Eldobható telefon: a földön heverő tárgyak a mentésben | Elfogadva | 2026-11-14 |
| [0041](0041-telefon-appok-jatekok-videok-hirek.md) | Telefon-appok: főképernyő, mini játékok, videók és a játék hírcsatornája | Elfogadva | 2026-11-14 |
| [0042](0042-fegyvertar-valthato-fegyverek-ujratoltodo-loszerrel.md) | Fegyvertár: váltható fegyverek, újratöltődő lőszerrel, és a játékos saját bombázója | Elfogadva | 2026-11-14 |
| [0043](0043-trolibusz-vonalak-kepletbol.md) | Trolibuszok: képletből számolt vonalak és megállók, a busz-rendszeren | Elfogadva | 2026-11-14 |
