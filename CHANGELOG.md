# Változásnapló

A verziószám formája `FŐ.KISEBB.JAVÍTÁS`:
- **KISEBB** (pl. 0.8.0 → 0.9.0): új funkció
- **JAVÍTÁS** (pl. 0.8.0 → 0.8.1): hibajavítás, beállítás finomítása
- **FŐ** (pl. 0.9.0 → 1.0.0): nagy mérföldkő

## 0.24.0 – 2026-11-07
- Alexek: a járókelők egy része Alex (zöld póló, narancs haj, „Alex” névtábla); mellette E – beszélget veled
- 8 új autó: Fehér limuzin, Narancs sportkocsi, Rózsaszín kisautó, Szürke furgon, Mentőautó (villogó fénnyel), Fekete versenyautó, Barna dzsip, Arany autó – és egy Bicikli ($100, nem kell bele benzin)
- 8 új ingyenes szkin: Alex, Rendőr, Szakács, Focista, Bohóc, Űrhajós, Kalóz, Zombi
- Autószerelők (🔧, a házak ~5%-a): tuning 3 szintig (+8% sebesség, +10% gyorsulás szintenként, $400/$800/$1200), új fényezés ($40), nitró feltöltés ($15) – az autódnak a műhely előtt kell állnia; a tuning és a szín megmarad (ADR-0031)
- Éttermek (🍽, a házak ~6%-a): kóla, leves, torta, hamburger, gulyásleves (józanít is), pizza (teljes élet)
- Tévé: a házakban a tévénél E – 4 csatorna: hírek, mese (malac ugrál a sárban), foci, autóverseny; minden lakóházban van tévé
- Az éttermek és a szerelők a térképen és a taxi úti céljai között is ott vannak; a térkép kategóriái 1–9 gombbal kapcsolhatók
- Javítva: ha a ház egy nyitott ablak (pl. tévé) közben dőlt össze, a játék megállt

## 0.23.1 – 2026-11-07
- A gonosz tanár azt ordítja: „IDIÓTA VAGY!” – rossz vagy késő válasznál nagy piros felirattal a tábla fölött, üldözés közben a feje fölött, kidobáskor is; recsegő kiabáló hanggal

## 0.23.0 – 2026-11-07
- Gonosz tanár az iskolákban (lila ruha, ősz konty, szemüveg): ha rohangálsz (Shift), üldöz, és ha elkap, kidob az iskolából és elkoboz $5-t
- Az órán a tanár siettet (10 mp / feladat, idősáv), rossz vagy késő válaszért $2 büntetés és csúnya megjegyzés („Ezt még egy óvodás is tudja!”); a büntetés sosem visz mínuszba

## 0.22.0 – 2026-11-07
- Iskolák (a házak ~5%-a, sárga tető, „ISKOLA” tábla): be lehet menni, a táblánál E – matekóra: 5 feladat (összeadás, kivonás, szorzás), 3 válaszból kell választani; jó válaszonként $5, hibátlan óráért +$25; óra után 60 mp szünet
- Új szkin: Peppa malac (ingyenes) – rózsaszín malac piros ruhában, ormánnyal és fülekkel
- Az iskolák a térképen (🏫, 6-os gomb) és a taxi úti céljai között is ott vannak; a taxi menü sok célnál is kifér a képernyőre

## 0.21.0 – 2026-11-07
- Boltok (a házak ~8%-a, lila tető, „BOLT” tábla): a pultnál E – csoki ($2, +20 élet), szendvics ($5, +50 élet), elsősegélycsomag ($15, teljes élet), kávé ($3, kijózanít), benzinkanna ($30, +50% benzin), bomba ($50), sorsjegy ($5, 20% eséllyel $20)
- Amire nincs szükséged (pl. teljes élettel étel, tele tankkal benzin), azt nem adja el – nem fizetsz feleslegesen
- A boltok a térképen (🛒, 5-ös gomb) és a taxi úti céljai között is ott vannak

## 0.20.0 – 2026-11-07
- Térkép: K – nagy térkép a benzinkutakkal ⛽, gyárakkal 🏭, bankokkal 🏦 és kocsmákkal 🍺 (kategóriánként ki-be kapcsolható: 1–5); kattintással saját pontokat jelölhetsz 📍 (max. 10, megmaradnak), újra kattintva törlöd, Delete: mindet törli (ADR-0030)
- A jelölt pontok a radaron és a világban is látszanak, nyíl mutat a legközelebbire, és a taxi is elvisz oda (a taxi-listában a 3 legközelebbi)
- A radaron a közeli nevezetes helyek színes pöttyként látszanak

## 0.19.0 – 2026-11-07
- Taxi: X – hívás (pár mp alatt odajön), E – úti cél (kezdőhely, autód, legközelebbi benzinkút / bank / kocsma / gyár, verseny rajt), $5 bárhova (ADR-0029); házból és buszról nem hívható be, autóba ülve lemondod, 45 mp után lemond, ha nem ért oda, a tönkrement taxi nem visz
- Javítva: ha bérautó és csöves is a közelben volt, az E nem azt csinálta, amit a felirat mutatott
- Nincsenek többé nyálkafoltok az utakon (a hozzájuk tartozó kód is törölve)

## 0.18.1 – 2026-11-07
- Javítva: ha a saját bombád ölt meg, a rendőrségi üzenet eltakarta a „FELROBBANTÁL!” feliratot (és halottként is körözést kaptál); a házzal együtt felrobbanva az általános felirat jelent meg

## 0.18.0 – 2026-11-07
- Bomba: B – lerakod (autóból hátra ejted), 3 mp múlva robban: roncs lesz a közeli autókból, ledönti a házakat, elsodorja az embereket, téged is megsebez; ★★ körözés; legfeljebb 5 bombád lehet, percenként kapsz egy újat

## 0.17.0 – 2026-11-07
- Bankok (a házak ~6%-a): a pultnál E – hitel $100–$2000 (20% díj, egyszerre egy), törlesztés; amíg tartozol, minden kereset 25%-a automatikusan törleszt (ADR-0028)
- Gyárak (a házak ~6%-a): futószalagon jönnek a sós zacskók, Space: felveszed, Space: berakod egy dobozba; fizetés $500 percenként, ha abban a percben dolgoztál
- Kódátnézés után javítva (kiadás előtt): nagy pénzösszegnél / hitelnél a HUD feliratai egymásra csúsztak

## 0.16.0 – 2026-11-07
- Buszmenetrend: percenként jön egy busz a hozzád legközelebbi megállóba; a megállóban látszik, hány mp múlva jön a következő (ADR-0027)
- Kódátnézés után javítva (kiadás előtt): a busz nem indul foglalt helyről (ilyenkor egy másik közeli megállóba jön); széles képernyőn messzebbről indul, hogy ne a szemed előtt jelenjen meg

## 0.15.1 – 2026-11-07
- Ittas vezetés: már egy ital után is üldöz a rendőrség (eddig csak 50% részegség felett), és nem csak az úton, hanem bárhol

## 0.15.0 – 2026-11-07
- Kocsmák (a házak egy része, zöld tető, „KOCSMA” tábla): a pultnál 1: sör $2, 2: bor $3
- Részegség: imbolyogsz, himbálózik a kép, húz a kormány; erősen részegen az úton vezetni ittas vezetés (rendőrség); túl sok italtól elájulsz, és a kocsma előtt térsz magadhoz
- Javítva: frissítés után a böngésző akár 10 percig a régi, tárolt game.js-t futtatta (ezért nem látszott pl. a rádió) – most minden kiadás egyedi címen tölti be a játékot
- Rádió: hangosabb, és ha a böngésző lenémította a hangot, bármely gomb / kattintás feloldja (a szobában ki is írja)
- Kódátnézés után javítva: ájultan is látszott az italfelirat; a kocsma fejlécében beégetett árak; részegen az éjszakai fények nem himbálóztak a világgal

## 0.14.0 – 2026-11-07
- Rádió minden házban: bemenéskor egy véletlen, menet közben generált szám szól (saját címmel); R: következő szám, M: ki/be; kilépéskor elhallgat (ADR-0026)
- Kódátnézés után javítva (kiadás előtt): háttérből visszatérve hangrobbanás; kikapcsolás után még szóló hangok, R-nél két szám egymásra; a rádió szünetben is szólt

## 0.13.0 – 2026-11-07
- Új autó: Nitró Villám ($2500) – 140 km/h, nitróval (Shift / N) 200 km/h; a nitró kb. 4 mp-ig tart, használat nélkül visszatöltődik
- A végsebesség fölötti autó (pl. nitró után, homokba érve) fokozatosan lassul vissza, nem hirtelen
- Nincsenek többé banditák (a hozzájuk tartozó kód – AI, fejpénz, ellenséges lövések – is törölve)

## 0.12.1 – 2026-11-07
- Javítva: ha egy busz állt melletted egy ajtó / bérautó / csöves közelében, a felirat mást mutatott, mint amit az E csinált (felszállt a buszra)

## 0.12.0 – 2026-11-07
- Tornádók erős homokviharban: beszívják és megpörgetik a közelben lévőket, a közepükön felszippantják a házakat (rom marad), az autókat és az embereket – a játékost is (ADR-0024)
- Be lehet menni a házakba: az ajtónál E, bútorozott szoba; bent nem talál meg a rendőrség, nem érnek el a banditák, gyorsabban gyógyulsz (ADR-0025)
- Új szkin: Pókhős (piros-kék, hálómintás) $900-ért; a szkineket is meg lehet venni a menüben, a megvettek megmaradnak
- Kódátnézés után javítva: házban rossz felirat jelent meg, ha az autó az ajtónál állt (a felirat most pontosan az E gomb sorrendjét követi); függőleges út melletti házból kilépve rossz irányba néztél; alacsony ablakban a szoba ajtaja lelógott a képernyőről; a tornádó által elvitt versenyző versenyben maradt

## 0.11.0 – 2026-11-07
- Parkoló minden buszmegálló mellett, bennük bérautó: E-vel $15-ért kibérelhető (ADR-0022)
- Magyar zászló (piros-fehér-zöld) minden buszmegállóban
- Csövesek a járdán: E-vel $1–$200 közötti adományt adhatsz nekik (←→ ±1, ↑↓ ±10, egérrel is); az összes adomány a rekordok között
- Házak az utak mentén, mindkét oldalon (változatos tetők, kémény, bejárat; szilárd akadályok)
- Kódátnézés után javítva: bérléssel olcsón (tele tankkal) lehetett tankolni a saját autót
- Kódátnézés után javítva: a csöveseket a homokvihar és a lassú autó leszorította a helyükről az úttestre
- Kódátnézés után javítva: a házak sarkai nem voltak szilárdak (téglalap-ütközés, ADR-0023); csöves ülhetett a buszváróba; bérlés közbeni újraéledésnél a saját autó nem kapta meg a 40% benzint
- Tesztek: a rendőrség közeledését rögzített helyzetben mérjük; a homokvihar csak a saját tesztjében jön

## 0.10.0 – 2026-11-07
- Végtelen pálya: nincs pályaszél, bármerre lehet menni (ADR-0019)
- Autóversenyek: rajt a közelben, visszaszámlálás, 3 AI ellenfél, 6 ellenőrzőpont, díj a helyezésért (ADR-0020)
- Buszmegállók és járó narancs városi buszok; E-vel fel- és leszállás, a jegy $2 (ADR-0021)
- Zöld busz: csak a játékosé, alapból a garázsban
- A szállítási dobozokat nem kell időre megtalálni; a sorozat csak halálnál vagy letartóztatásnál vész el
- Javítva: az AI autók a járdán álló gyalogosokra is fékeztek
- Javítva: a legközelebbi benzinkút keresése nem mindig a legközelebbit adta
- Kódátnézés után javítva: a megállón kicsit túlfutó busz kihagyta a megállót; halálnál/letartóztatáskor a holttest a buszon utazott tovább; mozgó buszon is le lehetett tartóztatni; verseny közbeni halálnál eltűnt a „MEGHALTÁL” üzenet; a benzinkút-tároló korlát nélkül nőtt

## 0.9.2 – 2026-11-07
- Kódátnézés és refaktorálás bekerült a fejlesztési folyamatba (CLAUDE.md, ADR-0017, ADR-0018)
- Javítva: pénz nélkül ingyen lehetett tankolni; most csak annyi benzin jár, amennyit ki tudsz fizetni
- Javítva: több szint egyszerre átlépésekor elveszett a köztes szintek bónusza
- Javítva: félbehagyott tankolásnál a levont pénz nem mentődött
- Javítva: sérült vagy régi mentés miatt nem indult el a játék
- Javítva: a pályadarab-tárolóból a játékos alatti darab is kieshetett (most a legrégebben használt esik ki)
- Tesztek: szigorúbb ADR-ellenőrzés, nem akadhat végtelen ciklusba a rendőrös teszt

## 0.9.1 – 2026-11-07
- Architekturális döntések naplója (`docs/adr/`, 16 ADR), a CLAUDE.md szabályaival

## 0.9.0 – 2026-11-07
- Verziózás: verziószám a játékban (Esc menü alján), változásnapló, git-címkék minden kiadáshoz

## 0.8.1 – 2026-11-07
- A rendőrség csak 145 km/h feletti gyorshajtásnál kezd üldözni (eddig 60)

## 0.8.0 – 2026-11-07
- Benzinkutak, benzinfogyasztás és tankolás
- Pénz, szintek, szállítási küldetések sorozatszorzóval, drift-kombó, fejpénz
- Autóbolt az Esc menüben, mentett előrehaladás és rekordok
- Javítva: álló autónál végtelenül ismétlődő tankolás; a rendőr túl messze állt meg a letartóztatáshoz

## 0.7.0 – 2026-11-07
- Rendőrség: gyorshajtásért üldözés, körözési szint, lerázás, letartóztatás

## 0.6.0 – 2026-11-07
- Járdák és zebrák; a gyalogosok a járdán sétálnak, a sarkon befordulnak

## 0.5.0 – 2026-11-07
- Esc menü: szünet, szkin- és autóváltás

## 0.4.0 – 2026-11-07
- Lövöldözés, AI gyalogosok, banditák és AI autók
- 30-szor nagyobb pálya (menet közben generált), nyálkafoltok, homokvihar

## 0.3.1 – 2026-11-07
- A féknyomok 5 másodperc alatt eltűnnek

## 0.3.0 – 2026-11-07
- Kézifékes drift féknyommal és füsttel, nagyobb pálya

## 0.2.0 – 2026-11-07
- Fejlesztési útmutató (CLAUDE.md), automatikus teszt és publikálás GitHub Pages-re

## 0.1.0 – 2026-11-07
- Első verzió: karakter, piros autó, sivatag, villanyoszlopok, nappal/éjszaka váltás
