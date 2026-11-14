# Változásnapló

A verziószám formája `FŐ.KISEBB.JAVÍTÁS`:
- **KISEBB** (pl. 0.8.0 → 0.9.0): új funkció
- **JAVÍTÁS** (pl. 0.8.0 → 0.8.1): hibajavítás, beállítás finomítása
- **FŐ** (pl. 0.9.0 → 1.0.0): nagy mérföldkő

## 0.35.0 – 2026-11-14
- **Trolibuszok** 🚎 (ADR-0043): minden 3. vízszintes úton (a kezdőhely útján is) trolivonal fut felsővezetékkel; a vonalakon piros trolimegállók vannak 2500 px-enként. A piros-krém trolibusz 40 mp-enként jár, a megállóban megáll, a vezeték mentén egyenesen megy. Felszállás a troli mellett **E**, a **jegy $3**; leszállás **E**, amikor megáll. A megállóban kiírja, mikor jön a következő troli

## 0.34.0 – 2026-11-14
- **Fegyvertár** (ADR-0042): **G** vagy egérgörgő – fegyverváltás, bal klikk / F – tűz. Hat fegyver: 🔫 pisztoly, 💥 sörétes puska (6 sörét legyezőben), 🔥 gépfegyver (nagyon gyors), 🎯 rakétavető (10 rakéta, becsapódáskor felrobban), 🚀 **ballisztikus rakéta** (3 db, oda csapódik be, ahová az egérrel célzol, max. 2500 px), ☢ **atombomba** (1 db: lerakod, 15 mp múlva felrobban – menekülj legalább 1000 px-re!). A nehézfegyverek lőszere idővel visszatöltődik (rakétavető 15 mp, rakéta 60 mp, atombomba 5 perc). A ballisztikus rakéta és az atombomba ★★, a rakétavető ★ körözést hoz; a saját rakétavető-lövés közelről legfeljebb 30 életet visz el. Ha meghalsz, a lerakott atombombát hatástalanítják. A HUD-on látszik a kiválasztott fegyver és a lőszer
- **Saját bombázó**: **J** – a saját bombázó repülőgéped melléd száll (tele: 30 bomba, 6 rakéta, 1 atombomba), 30 mp-enként hívható; E-vel felszállsz, B-vel bombázol, V-vel vált a fegyverek között

## 0.33.0 – 2026-11-14
- **Saját sereg** 🪖 (ADR-0036): amint a háború 900 px-es körzetébe érsz, azonnal megjelenik körülötted a saját seregeid (piros egyenruha): 14 katona és 1 tank. Követnek, minden ellenséget lőnek (a zöld és a kék sereg is rájuk lő), erősítést kapnak (5 mp-enként egy katona). A saját sereg golyója és tanklövedéke téged és a polgárokat nem bánt, a te lövésed és bombád őket nem. A HUD-on látszik a létszámuk. A háború végén hazamennek
- **Telefon-appok** (ADR-0041): a telefon főképernyővel indul, 4 appal: 💬 Robi (a csevegés), 🎮 **Játékok** (🐍 Kígyó – nyilak / WASD, 🛩 Repülő – Space / kattintás; rekordok a mentésben), 📺 **Videók** (6 rövid klip: híradó, Peppa a sárban, gólgála, nagydíj, tornádó-felvétel, atomgomba), 📰 **Hírek** (élő állapotsorok és a játék legfrissebb eseményei: háború, atombomba, megszállás, tornádó, homokvihar, űrlények, rakéta, repülőbaleset, szintlépés). Esc: egy szint vissza
- **Eldobható telefon** 📱💥 (ADR-0040): **O** – eldobod a telefont (előre esik), és **összetörik a kijelzője**. **E** – felveheted (a mentésben is megmarad a helye, ha újratöltöd a játékot). A repedt telefon használható, de Robi válaszainak egy része nem látszik (▒), és a kijelzőn repedés látszik. A telefonbolt $30-ért megjavítja, az új telefon vásárlása ép kijelzőt ad
- **Felhőkarcolók** 🏙 (ADR-0039): 14–49 emeletes tornyok, belvárosi fürtökben (a térkép kb. harmadán sok, máshol ritka). Magasnak látszanak (a tetejük elhajlik a kamerától, oldallapok, ablaksorok, helikopter-leszállóhely, villogó antenna). Szilárdak, bemenni nem lehet; a rakéta, az atombomba, a tornádó ledönti őket. **Bombázóval nekirepülve lezuhansz** (-70 élet, a gép elvész)

## 0.32.0 – 2026-11-14
- Bombázó repülők ✈ (ADR-0038): a háborúban kb. 38 másodpercenként AI bombázó húz el a csatatér fölött, és bombákat szór az ellenséges katonákra, tankokra (a saját oldalát kíméli). A háború kezdetén mindkét sereg mögött egy leparkolt bombázó áll
- **A játékos is vezetheti**: a gép mellett E – felszállsz; W/S: gáz és fék (nem tud megállni, 140–620 px/s), A/D: kormány, **B: bomba** (30 db, igazi bomba: házak is dőlnek, körözés jár), **E**: lassan leszállsz (a gép ott marad), gyorsan kiugrasz (ejtőernyő, -15 élet, a gép lezuhan). A gép a házak és autók fölött repül, a rendőrség nem üldöz a sebessége miatt
- **Három fegyver** a játékos gépén (**V**: váltás, **B**: tűz): 💣 bomba (30 db), 🚀 **ballisztikus rakéta** (6 db, a gép orra előtt 1700 px-re csapódik be, célkör jelzi, 4,5 mp-es repülés), ☢ **atombomba** (1 db, 2,5 mp-ig esik, aztán igazi atombomba robban: 1000 px-en belül te is meghalsz, ezért gyorsíts el!). A rakéta és az atombomba ★★ körözést von maga után. A lőszer a géppel marad (leszállva sem töltődik újra)
- A HUD-on látszik a fegyver, a bomba/rakéta/atom készlet és a sebesség

- **Ha a háborúban halsz meg, ott éledsz újra**: a csatatér szélén, a halálod irányában (az autód melletted áll), **3 mp védelemmel** (kék villogó gyűrű), így nem lősznek le azonnal. Ha messze (4000 px-nél távolabb) haltál meg, az atombomba-figyelmeztetés alatt, vagy háború nélkül, továbbra is a kezdőhelyen éledsz újra

## 0.31.0 – 2026-11-14
- Telefonok és telefonboltok (📱, a házak ~5%-a, kék tető, „TELEFONBOLT” tábla): a pultnál E – egyszerű telefon $60, okostelefon $200 (megmarad a mentésben)
- **P**: a telefon – csetelés Robival, a telefon beépített „MI”-jével (ADR-0037): kérdezhetsz tőle (hol a legközelebbi benzinkút, bank, bolt, étterem, kocsma, vonat…, mennyi pénzem van, van-e háború / vihar / tornádó / űrlény, hány óra van), kérhetsz tippet vagy viccet. Az okostelefonon „jelöld meg a bankot” (térképjelölés) és „hívj taxit” is megy
- Robi nem igazi nyelvi modell (nincs külső szolgáltatás), hanem a játék állapotát ismerő, kulcsszavas partner
- A telefonboltok a térképen (📱, 0-s gomb; a saját jelölések kapcsolója most a **P**) és a taxi úti céljai között is ott vannak

## 0.30.0 – 2026-11-13
- Háborúk (⚔, ADR-0036): néha (4 perc után, aztán 5–9 percenként) két sereg – zöld és kék, **20-20 katona** és 2-2 **tank** – csap össze a közeledben (1500–2200 px-re). Egymásra lőnek, tüzérségi gránátok csapkodnak; aki a csatatérre téved, a katonák és a golyók célpontja. A polgárok menekülnek, az autókat és embereket eltalálhatják a golyók. Nyíl mutatja a csatateret
- Tankok (oldalanként 2): lassan gurulnak, forgó toronnyal, ágyúval lőnek (repülő lövedék, ami becsapódáskor robban; a saját oldalt kíméli); 12 életük van, a puskagolyó alig sebzi őket (1/4), három tanklövedéktől megsemmisülnek; lelövésükért $100 jár; az elpusztultakat 40 mp múlva pótolják
- **Ballisztikus rakéták** 🚀: a háború alatt kb. 22 másodpercenként a seregek távolról (2800 px-ről) rakétát lőnek ki – a házakra (lakott területre), a csatatérre, néha rád; a rakéta 4,5 mp-ig repül, a becsapódás helyét piros pulzáló célkör jelzi (visszaszámlálással). A robbanás 220 px-en belül öl és autókat roncsol, 170 px-en belül romba dönti a házakat, a tankot is erősen sebzi (8 hp)
- **Megszállás** 🏴: a háború végén (az atombomba után) a győztes sereg (akinek kevesebb veszteség esett) megszállja a területet: zászló, 5 katonából álló helyőrség, 150 mp-ig; aki az 450 px-es körzetbe lép, tűz alá kerül. Ha mindet leverted, **felszabadítod** a területet (+$200)
- **Atombomba** ☢: a háború 4. percében, 12 mp-es figyelmeztetéssel (visszaszámlálás + piros felirat) atombomba robban a csatatér közepén. 1000 px-en belül meghalsz, 1800 px-ig megsebesülsz, házban 1100 px-en túl biztonságban vagy; romba dönti a 1100 px-en belüli házakat, elpusztítja az autókat, embereket; kráter marad, vakító villanás és lökéshullám látszik
- **Q**: azonnal háborút indít a közeledben (nem kell várni az időzítőre)
- A katonákat lelőheted (+$20 darabja) vagy bombázhatod; a háború **4 percig tart**: a fogyatkozó sereg erősítést kap (3 mp-enként egy katonát), a végén az nyer, akinek kevesebb katonája esett el. Házban biztonságban vagy

## 0.29.0 – 2026-11-13
- Élő város (ADR-0035): az AI autóknak is van benzinjük, fogy; amikor fogyóban van (45% alatt) és kútnál lévő kereszteződéshez érnek, behajtanak a kúthoz, megállnak a töltő mellett (⛽ látszik), tele tankkal mennek tovább
- A gyalogosok dolgoznak és szolgáltatást használnak: a boltokba, éttermekbe, kocsmákba, bankokba, szerelőkhöz ügyfélként, ezeken kívül az iskolába és a gyárba is dolgozni járnak. Az épület felé menet ikon látszik a fejük fölött (💼 munka, 🛒🍽🍺🏦🔧 szolgáltatás), bent van egy ideig (dolgozó 40–70 mp, ügyfél 12–25 mp), aztán kijön. Ha bemész az épületbe, látod a bent lévőket

## 0.28.0 – 2026-11-13
- Vonatok (🚆): a pusztán vasútvonalak futnak az utak között, vonalanként két sínnel (kelet és nyugat felé), a kettő között szigetperonnal. Vasútállomás **10 000 px-enként** van, és minden állomásra **30 másodpercenként** érkezik vonat (10 mp-ig áll). A peronon a vonat mellett **E** – jegy **$4**, bármelyik következő állomáson **E** – leszállás (ADR-0034)
- A peronon kiírja, hány mp múlva jön a következő vonat
- Ne állj a sínre: a mozgó vonat elgázol! (kb. 120 px/s fölött)
- A vasútállomások a térképen (🚆, 9-es gomb; a saját jelölések most a 0-s gombon) és a taxi úti céljai között is ott vannak

## 0.27.0 – 2026-11-13
- Űrlények (👽): 3 percenként 3 zöld űrlény bukkan fel és üldözőbe vesz (175 px/s: sétálót elérnek, futva vagy gyors autóval elmenekülhetsz; házban nem kapnak el; 75 mp után feladják). Ha elkapnak, a fénynyalábjuk felszív, és a Holdra visznek, ahol 40 mp-re börtönbe zárnak (ADR-0033); utána oda tesznek vissza, ahol elraboltak
- Szökés a Holdról: a cella sarkában egy résen (E) át a Fordított Világba jutsz, ahol démogorgonok támadnak – ha 3-at lelősz (3 lövés darabonként), visszakerülsz a Földre; ha elkapnak, vissza a cellába, újra a teljes büntetéssel
- A démogorgonok fölött életcsík látszik (zöld → sárga → piros, ahogy lövöd őket)
- Az űrlényeket lehet lőni (3 találat, +$50) vagy bombázni
- Csalókód: Ctrl+S (Mac-en Cmd+S) – +$10 000 (és nem jön fel a böngésző „oldal mentése” ablaka)

## 0.26.0 – 2026-11-13
- Lovak: a pusztán vadlovak legelnek (különböző színűek); mellettük E – felülsz (ingyen, benzin sem kell hozzá), újra E – leszállsz, a ló ott marad, az autód pedig visszakerül oda, ahol hagytad (ADR-0032)
- Sok ló van (kb. 1000 px-enként egy), nem kell sokat keresni
- A ló nem autóként megy: a WASD közvetlenül az irányt adja (mint gyaloglásnál), gyorsan fordul és megáll, nincs csúszás; Shift: vágta (kb. 85 km/h), enélkül ügetés (kb. 42 km/h); közben ott van rajta a szkined

## 0.25.0 – 2026-11-13
- A tornádók a játékosra vadásznak: felé tartanak (150 px/s), házban is – ilyenkor a házat viszik el. Sétálva (130 px/s) utolérnek, futva (220 px/s) vagy autóval el lehet menekülni

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
