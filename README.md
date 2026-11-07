# Sivatagi GTA

Felülnézetes, GTA-szerű böngészős játék egy végtelen sivatagban: piros autó, lövöldözés, AI gyalogosok (járdán sétálnak, zebrán kelnek át) és AI autók, nyálkafoltok az utakon, rendőrségi üldözés 145 km/h feletti gyorshajtásért, homokviharok, villanyoszlopok és nappal/éjszaka váltás (30 perc nappal, 30 perc éjszaka).

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
| Esc | menü: szünet, szkin- és autóváltás, szkin- és autóbolt (a választás megmarad) |

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
- **Jutalom:** a rendőrök lerázása $150 / csillag. Letartóztatáskor 10% bírság.
- **Szintek:** minden megkeresett dollár XP is; szintlépéskor bónusz jár.
- **Autóbolt (Esc):** a pénzből új autókat vehetsz. A pénz, a megvett autók és a rekordok (legjobb drift, leghosszabb sorozat) megmaradnak a böngészőben.

## Autóversenyek
- A közelben mindig felbukkan egy verseny (🏁, kék nyíl). Hajts be a rajtba: 3 mp visszaszámlálás, majd 3 ellenfél ellen 6 ellenőrzőponton át kell célba érni.
- Díj: 1. hely $600, 2. hely $250, 3. hely $100. Ha kiszállsz, feladod a versenyt.

## Buszok
- Az utak mentén buszmegállók vannak. **Percenként** jön egy narancs városi busz a hozzád legközelebbi megállóba; a megállóban kiírja, hány mp múlva jön a következő.
- A megálló busz mellett **E**: felszállás ($2), **E** újra: leszállás, amikor a busz megáll.
- A **zöld busz** csak a tiéd – az Esc menüben választhatod ki.
- Minden megállóban ki van tűzve a 🇭🇺 magyar zászló.

## Autóbérlés
- Minden buszmegálló mellett van egy parkoló egy fehér **bérautóval**. Mellé állva **E**: kibérled **$15-ért** (tele tankkal).
- A saját autóidat az Esc menüben bármikor visszaválaszthatod.

## Csövesek
- A járdán csövesek ülnek („SEGÍTS” tábla, pohár). Mellettük **E**: adományozhatsz **$1 és $200** között.
- Az összes adományod az Esc menüben, a rekordok között látszik.

## Tornádó
- Erős homokviharban tornádó támadhat (🌪, piros nyíl és pötty a térképen). Beszív és megpörget; a közepén felszippantja a házakat, autókat, embereket – téged is. Menekülj előle!

## Házak
- A ház ajtajánál **E**: bemész. Bent nem talál meg a rendőrség (12 mp után leráztad őket), és gyorsabban gyógyulsz. Kimenni az ajtónál **E**-vel lehet.
- Vigyázz: ha a tornádó elviszi a házat, téged is elvisz.
- Minden házban van **rádió**: bemenéskor egy véletlen, a játék által generált szám szól. **R**: következő szám, **M**: rádió ki/be.

## Szkinek
- Az Esc menüben választhatsz szkint. A **Pókhős** (piros-kék, hálómintás) **$900**-ba kerül; a többi ingyenes.

## Kocsmák
- A házak egy része **kocsma** (zöld tető, „KOCSMA” tábla). A pultnál **1: sör ($2)**, **2: bor ($3)**.
- Ha sokat iszol, imbolyogsz, és himbálózik a kép. **Ittasan ne vezess:** már egy ital után is üldöz a rendőrség, amíg ki nem józanodsz. Túl sok italtól elájulsz, és a kocsma előtt térsz magadhoz.

## Bankok
- A házak egy része **bank** (kék tető, „BANK” tábla). A pultnál **E**: **hitel** $100–$2000 (20% díjjal, egyszerre egy) vagy **törlesztés**.
- Amíg tartozol, minden keresetedből 25% automatikusan törleszti a hitelt. A tartozás a HUD-on, a pénzed mellett látszik.

## Gyárak
- A házak egy része **gyár** (szürke tető, „GYÁR” tábla). Bent futószalagon jönnek a sós zacskók: **Space**: felveszed, **Space** egy doboz mellett: berakod.
- **Fizetés: $500 percenként** – ha abban a percben legalább egy zacskót bepakoltál. A le nem szedett zacskók a szalag végén leesnek.
