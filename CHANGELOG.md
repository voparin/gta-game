# Változásnapló

A verziószám formája `FŐ.KISEBB.JAVÍTÁS`:
- **KISEBB** (pl. 0.8.0 → 0.9.0): új funkció
- **JAVÍTÁS** (pl. 0.8.0 → 0.8.1): hibajavítás, beállítás finomítása
- **FŐ** (pl. 0.9.0 → 1.0.0): nagy mérföldkő

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
