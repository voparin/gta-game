# Sivatagi GTA

Felülnézetes, GTA-szerű böngészős játék egy végtelen sivatagban: piros autó, lövöldözés, AI gyalogosok (járdán sétálnak, zebrán kelnek át), banditák és AI autók, nyálkafoltok az utakon, rendőrségi üldözés 145 km/h feletti gyorshajtásért, homokviharok, villanyoszlopok és nappal/éjszaka váltás (30 perc nappal, 30 perc éjszaka).

Élő verzió: https://voparin.github.io/gta-game/

Az utak mentén házak, buszmegállók (magyar zászlóval), parkolók és benzinkutak vannak.

## Indítás
Nyisd meg az `index.html`-t a böngészőben – nincs szükség telepítésre.

## Irányítás
| Gomb | Funkció |
|---|---|
| WASD / nyilak | mozgás / vezetés |
| Shift | futás |
| E | be- / kiszállás |
| Space | kézifék (drift, féknyom, füst) |
| Bal klikk / F | lövés (egérrel célzás) |
| H | homokvihar be/ki |
| T | gyorsított idő (60x) |
| Esc | menü: szünet, szkin- és autóváltás (a választás megmarad) |

## Rendőrség
- Az utakon (és járdán) **145 km/h** a sebességkorlát – a táblák is jelzik. Ha túlléped, körözni kezdenek (★), rendőrre lövésért ★★.
- **Lerázás:** ha 12 másodpercig egy rendőrautó sincs a közeledben, leszállnak rólad.
- **Letartóztatás:** ha megállsz és egy rendőrautó melléd ér, letartóztatnak, és a kezdőhelyen folytatod.

## Benzin és benzinkutak
- Az autó fogyasztja a benzint (a rakétaautó a legtöbbet, a taxi a legkevesebbet). Üres tankkal csak vánszorogni lehet.
- Tankolni a ⛽ benzinkutaknál lehet: állj meg a narancssárga sávban a kutak mellett. Ára: $1 / 1%.
- Kevés benzinnél a képernyő szélén nyíl mutatja a legközelebbi kutat; a térképen a kutak narancssárga négyzetek.

## Pénz, küldetések, fejlődés
- **Szállítás:** mindig van egy célpont (📦, sárga nyíl), időlimit nélkül. Minden sikeres szállítás után nő a sorozatszorzó (x1.25, x1.5…); halálnál vagy letartóztatásnál elvész.
- **Drift-kombó:** kézifékes driftelésért pénz jár; minél tovább driftelsz ütközés nélkül, annál nagyobb a szorzó (max x5).
- **Fejpénz:** bandita lelövése $50, a rendőrök lerázása $150 / csillag. Letartóztatáskor 10% bírság.
- **Szintek:** minden megkeresett dollár XP is; szintlépéskor bónusz jár.
- **Autóbolt (Esc):** a pénzből új autókat vehetsz. A pénz, a megvett autók és a rekordok (legjobb drift, leghosszabb sorozat) megmaradnak a böngészőben.

## Autóversenyek
- A közelben mindig felbukkan egy verseny (🏁, kék nyíl). Hajts be a rajtba: 3 mp visszaszámlálás, majd 3 ellenfél ellen 6 ellenőrzőponton át kell célba érni.
- Díj: 1. hely $600, 2. hely $250, 3. hely $100. Ha kiszállsz, feladod a versenyt.

## Buszok
- Az utak mentén buszmegállók vannak; a narancs városi buszok megállnak bennük.
- A megálló busz mellett **E**: felszállás ($2), **E** újra: leszállás, amikor a busz megáll.
- A **zöld busz** csak a tiéd – az Esc menüben választhatod ki.
- Minden megállóban ki van tűzve a 🇭🇺 magyar zászló.

## Autóbérlés
- Minden buszmegálló mellett van egy parkoló egy fehér **bérautóval**. Mellé állva **E**: kibérled **$15-ért** (tele tankkal).
- A saját autóidat az Esc menüben bármikor visszaválaszthatod.

## Csövesek
- A járdán csövesek ülnek („SEGÍTS” tábla, pohár). Mellettük **E**: adományozhatsz **$1 és $200** között.
- Az összes adományod az Esc menüben, a rekordok között látszik.
