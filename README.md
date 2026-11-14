# Sivatagi GTA

Felülnézetes, GTA-szerű böngészős játék egy végtelen sivatagban: piros autó, lövöldözés, AI gyalogosok (járdán sétálnak, zebrán kelnek át) és AI autók, rendőrségi üldözés 145 km/h feletti gyorshajtásért, homokviharok, villanyoszlopok és nappal/éjszaka váltás (30 perc nappal, 30 perc éjszaka).

Élő verzió: https://voparin.github.io/gta-game/

Az utak mentén házak, buszmegállók (magyar zászlóval), parkolók és benzinkutak vannak.

## Indítás
Nyisd meg az `index.html`-t a böngészőben – nincs szükség telepítésre.

## Többjátékos mód 🌐
1. A játék mappájában indítsd el a szervert: `node server.js` (Node 22 kell, más telepítés nem).
2. Nyisd meg a böngészőben: **http://localhost:8080** – a többiek ugyanazon a hálózaton (pl. otthoni wifi) a **http://&lt;a géped IP-címe&gt;:8080** címen csatlakozhatnak.
3. Mindenki ugyanabban a világban van, és **látjátok egymást** (gyalog vagy járműben, a szkinetekkel, névtáblával). A többi szereplő (forgalom, háború, időjárás) mindenkinél külön fut.
- A **https://voparin.github.io/gta-game/** oldalon a játék egyjátékos (ott nincs szerver). Az interneten való közös játékhoz a `server.js`-t egy mindig futó tárhelyre kell telepíteni.

## Irányítás
| Gomb | Funkció |
|---|---|
| WASD / nyilak | mozgás / vezetés |
| Shift | futás |
| E | be- / kiszállás |
| Space | kézifék (drift, féknyom, füst) |
| Bal klikk / F | lövés (egérrel célzás) |
| G / egérgörgő | fegyverváltás (pisztoly, sörétes, gépfegyver, rakétavető, ballisztikus rakéta, atombomba) |
| J | saját bombázó repülőgép hívása |
| H | homokvihar be/ki |
| X | taxi hívása ($5 bárhova) |
| B | bomba lerakása (3 mp múlva robban) |
| K | térkép (pontok jelölése kattintással) |
| T | gyorsított idő (60x) |
| Q | háború indítása (azonnal, a környéken) |
| P | telefon (ha van): csetelés Robival |
| Ctrl+S | csalókód: +$10 000 |
| Esc | menü: szünet, szkin- és autóváltás, szkin- és autóbolt (a választás megmarad) |

## Tenger 🌊
- A pálya közepén, a **kezdőhelytől délre** (kb. 11 km-re) egy nagy **tenger** van, hullámos parttal és homokos stranddal. A nagy térképen (K) kéken látszik.
- Az utak és a vasút **hidakon** kelnek át rajta. A vízben **úszni** lehet (lassabban), az autó alig halad – a hídon viszont rendesen mehetsz.

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

## Trolibuszok
- Minden 3. vízszintes úton (a kezdőhely útján is) **trolivonal** fut, felsővezetékkel. A vonalakon **piros trolimegállók** vannak („🚎”, „TROLI” felfestés).
- A piros-krém **trolibusz 40 másodpercenként** jár, a megállóban megáll, a vezeték mentén egyenesen halad.
- A troli mellett **E**: felszállás, a **jegy $3**. **E** újra: leszállás, amikor megáll. A megállóban kiírja, mikor jön a következő.

## Autóbérlés
- Minden buszmegálló mellett van egy parkoló egy fehér **bérautóval**. Mellé állva **E**: kibérled **$15-ért** (tele tankkal).
- A saját autóidat az Esc menüben bármikor visszaválaszthatod.

## Csövesek
- A járdán csövesek ülnek („SEGÍTS” tábla, pohár). Mellettük **E**: adományozhatsz **$1 és $200** között.
- Az összes adományod az Esc menüben, a rekordok között látszik.

## Tornádó
- Erős homokviharban tornádó támadhat (🌪, piros nyíl és pötty a térképen). Beszív és megpörget; a közepén felszippantja a házakat, autókat, embereket – téged is. Menekülj előle! A tornádó **utánad ered**: sétálva utolér, futva (Shift) vagy autóval elmenekülhetsz előle, és a házban sem vagy biztonságban.

## Házak
- A ház ajtajánál **E**: bemész. Bent nem talál meg a rendőrség (12 mp után leráztad őket), és gyorsabban gyógyulsz. Kimenni az ajtónál **E**-vel lehet.
- Vigyázz: ha a tornádó elviszi a házat, téged is elvisz.
- Minden házban van **rádió**: bemenéskor egy véletlen, a játék által generált szám szól. **R**: következő szám, **M**: rádió ki/be.

## Szkinek
- Az Esc menüben választhatsz szkint. A **Pókhős** (piros-kék, hálómintás) **$900**-ba kerül; a többi – köztük a **Peppa malac**, **Alex**, Rendőr, Szakács, Focista, Bohóc, Űrhajós, Kalóz és Zombi – ingyenes.

## Kocsmák
- A házak egy része **kocsma** (zöld tető, „KOCSMA” tábla). A pultnál **1: sör ($2)**, **2: bor ($3)**.
- Ha sokat iszol, imbolyogsz, és himbálózik a kép. **Ittasan ne vezess:** már egy ital után is üldöz a rendőrség, amíg ki nem józanodsz. Túl sok italtól elájulsz, és a kocsma előtt térsz magadhoz.

## Bankok
- A házak egy része **bank** (kék tető, „BANK” tábla). A pultnál **E**: **hitel** $100–$2000 (20% díjjal, egyszerre egy) vagy **törlesztés**.
- Amíg tartozol, minden keresetedből 25% automatikusan törleszti a hitelt. A tartozás a HUD-on, a pénzed mellett látszik.

## Gyárak
- A házak egy része **gyár** (szürke tető, „GYÁR” tábla). Bent futószalagon jönnek a sós zacskók: **Space**: felveszed, **Space** egy doboz mellett: berakod.
- **Fizetés: $500 percenként** – ha abban a percben legalább egy zacskót bepakoltál. A le nem szedett zacskók a szalag végén leesnek.

## Boltok
- A házak egy része **bolt** (lila tető, „BOLT” tábla). A pultnál **E**: megnyílik a bolt, **1–7** gombbal vagy kattintással vásárolsz:

| Áru | Ár | Hatás |
|---|---|---|
| 🍫 Csoki | $2 | +20 élet |
| 🥪 Szendvics | $5 | +50 élet |
| 🩹 Elsősegélycsomag | $15 | teljes élet |
| ☕ Kávé | $3 | kijózanít |
| ⛽ Benzinkanna | $30 | +50% benzin az autódba |
| 💣 Bomba | $50 | +1 bomba (max 5) |
| 🎟 Sorsjegy | $5 | 20% eséllyel $20 |

- Amire nincs szükséged (pl. teljes élettel étel), azt nem adja el.

## Iskolák
- A házak egy része **iskola** (sárga tető, „ISKOLA” tábla) – be lehet menni. A táblánál **E**: **matekóra**, 5 feladat (összeadás, kivonás, szorzás).
- **1–3** gombbal vagy kattintással válaszolsz. Jó válaszonként **$5**, hibátlan óráért **+$25** jár. Óra után **60 mp szünet** van.
- 👩‍🏫 **Vigyázz a gonosz tanárral!** Ha rohangálsz (Shift), üldözni kezd – ha elkap, kidob és elkoboz **$5**-t. Az órán siettet (**10 mp** feladatonként), és rossz vagy késő válaszért **$2** büntetést ad, és azt ordítja: **„IDIÓTA VAGY!”**

## Éttermek
- A házak egy része **étterem** (narancs tető, „ÉTTEREM” tábla). A pultnál **E**: kóla ($2), leves ($4), torta ($4), hamburger ($6), **gulyásleves** ($7, józanít is), pizza ($9, teljes élet).

## Autószerelők
- A házak egy része **autószerelő** (szürke tető, „AUTÓSZERELŐ” tábla). Állj az autóddal a műhely elé, menj be, és a pultnál **E**:
  - 🔧 **Tuning**: +8% sebesség és +10% gyorsulás szintenként, legfeljebb 3 szint ($400 / $800 / $1200)
  - 🎨 **Új fényezés**: új szín ($40)
  - 🚀 **Nitró feltöltés** ($15, nitrós autóba)
- A tuning és a szín autónként megmarad.

## Tévé
- Minden lakóházban van tévé: mellette **E** – 4 csatorna (**1–4** vagy nyilak): 📰 hírek, 🐷 mese, ⚽ foci, 🏎 autóverseny. **E / Esc**: kikapcsolás.

## Alexek
- Az utcán sok **Alex** sétál (zöld póló, narancs haj, névtábla). Mellette **E**: beszélget veled.

## Lovak
- A pusztán **vadlovak** legelnek (barna, fekete, világos – kb. 1000 px-enként találsz egyet, bőven vannak). Mellettük **E**: felülsz, és lovagolhatsz – ingyen van, és **benzin sem kell** hozzá. **Nem autóként megy:** a WASD közvetlenül az irányt adja, mint gyaloglásnál, a ló gyorsan fordul és megáll. Ügetés kb. 42 km/h, **Shift**: vágta kb. 85 km/h.
- **E** újra: leszállsz, a ló ott marad (később újra felülhetsz rá), az autód pedig visszakerül oda, ahol hagytad.

## Űrlények
- **3 percenként** 3 zöld 👽 **űrlény** bukkan fel a közeledben, és üldözőbe vesz. Sétálva elérnek, **futva (Shift)** vagy **gyors autóval** elmenekülhetsz; házban nem kapnak el, 75 mp után feladják.
- Ha **elkapnak**, a fénynyalábjuk felszív és a **Holdra** visznek, ahol **40 mp-re börtönbe zárnak** (WASD: sétálgatás a cellában). Utána oda tesznek vissza, ahol elraboltak.
- **Szökés:** a cella sarkában van egy **rés** – menj oda, és nyomj **E**-t. A **Fordított Világba** jutsz, ahol **démogorgonok** támadnak rád: **WASD** mozgás, **egér / F** lövés, mindegyikhez 3 találat kell – a fejük fölött **életcsík** mutatja, mennyi élete maradt. Ha **3 démogorgont lelősz**, visszakerülsz a normál világba. Ha elkapnak (elfogy az életed), vissza a cellába, újra a teljes 40 mp-re.
- Az űrlényt le lehet lőni (3 találat, **+$50**) vagy fel lehet robbantani (B).

## Vonatok
- A pusztán **vasútvonalak** futnak az utak között, vonalanként **két sínnel** (kelet és nyugat felé), a kettő között **szigetperonnal**. **Vasútállomás 10 000 pixelenként** van („🚆 VASÚTÁLLOMÁS” tábla).
- **Minden állomásra 30 másodpercenként érkezik vonat**, és 10 mp-ig áll. Utána sima gyorsulással indul a következő állomásra (max. ~270 km/h).
- Állj a peronra a vonat mellé, **E**: felszállsz, a **jegy $4**. Bármelyik következő állomáson, amikor a vonat megáll, **E**: leszállsz. A peronon kiírja, hány mp múlva jön a következő vonat.
- ⚠️ **Ne állj a sínre**, amikor a vonat jön: a mozgó vonat elgázol! Az utakat keresztezi, vigyázz az átjárókon.

## Élő város
- Az **AI autóknak** is van benzinjük: ha fogyóban van, és kútnál lévő kereszteződéshez érnek, behajtanak a **benzinkúthoz**, megállnak a töltő mellett (⛽), tele tankkal mennek tovább.
- A **gyalogosok** dolgoznak és szolgáltatást használnak: a boltokba, éttermekbe, kocsmákba, bankokba és szerelőkhöz ügyfélként járnak, az iskolába és a gyárba dolgozni. Útközben ikon látszik a fejük fölött (💼 munka, 🛒🍽🍺🏦🔧 szolgáltatás), bent vannak egy ideig, aztán kijönnek. Ha bemész az épületbe, látod a bent lévőket.

## Háborúk
- **Q gomb:** azonnal háborút indít a közeledben. Egyébként **néha magától is kitör** a környéken (az első kb. 4 perc után, aztán 5–9 percenként): két sereg – zöld és kék, **20-20 katona** – csap össze 1500–2200 pixelre tőled. Egy narancs nyíl (⚔) mutatja a csatateret.
- Egymásra lőnek, **gránátok** csapkodnak, és mindkét oldalon **2-2 tank** gurul: az ágyújuk repülő lövedéket lő, ami becsapódáskor robban. A tank 12 életű, a puskagolyó alig sebzi (1/4), 3 tanklövedéktől megsemmisül, **$100** jár érte, 40 mp múlva újat küldenek. Aki a csatatérre téved (te is), a katonák és a golyók célpontja. A polgárok menekülnek. **Házban biztonságban vagy.**
- A katonákat le lehet lőni (3 találat, **+$20**) vagy fel lehet robbantani. A háború **4 percig tart**: ha egy sereg fogyatkozik, erősítést kap (3 mp-enként egy katonát).
- **Ha a háborúban halsz meg, ott éledsz újra:** a csatatér szélén, a halálod irányában (az autód melletted áll), **3 másodperc védelemmel** (kék villogó gyűrű). A kezdőhelyen éledsz újra, ha messze haltál meg (4000 px-nél távolabb), ha az atombomba-figyelmeztetés már megy, vagy ha nincs háború.
- 🚀 **Ballisztikus rakéták:** kb. 22 másodpercenként a seregek távolról rakétát lőnek ki – a házakra, a csatatérre, néha rád. A rakéta 4,5 mp-ig repül, a becsapódás helyét **piros pulzáló célkör** és visszaszámláló jelzi: menekülj ki belőle! A robbanás 220 px-en belül öl, a házakat romba dönti, a tankot is erősen sebzi.
- 🏴 **Megszállás:** a háború végén a győztes sereg (akinek kevesebb vesztesége volt) **megszállja a területet**: zászló és 5 katona 150 másodpercig. Aki közel megy, azt lövik. Ha mindet leveri, **felszabadítja** a területet (**+$200**).
- ☢ **Atombomba:** a háború végén, **12 mp-es figyelmeztetés** után (nagy piros visszaszámlálás) atombomba robban a csatatér közepén! **1000 px-en belül meghalsz, 1800 px-ig megsebesülsz.** Házba bújva a csatatértől 1100 px-nél messzebb biztonságban vagy. Romba dönti a közeli házakat, kráter marad. **Menekülj messzire, vagy ne menj a háború közelébe!**

## Telefonok és Robi
- A házak egy része **telefonbolt** (kék tető, „TELEFONBOLT” tábla): a pultnál **E** – **egyszerű telefon $60**, **okostelefon $200**. A telefon megmarad a mentésben.
- **P**: megnyílik a telefon **főképernyője**, 4 appal (**1–4** vagy kattintás; **Esc**: egy szint vissza, a főképernyőn bezár; közben a játék áll):
  - 💬 **Robi** – csetelés a telefon beépített „MI”-jével (gépelj, **Enter** a küldés)
  - 🎮 **Játékok** – 🐍 **Kígyó** (nyilak / WASD, Enter: újra) és 🛩 **Repülő** (Space / kattintás: repülj át a csövek között); a rekordjaid megmaradnak
  - 📺 **Videók** – 6 rövid klip (híradó, Peppa a sárban, gólgála, nagydíj, tornádó-felvétel, az utolsó atombomba); 1–6 vagy ←→ a váltás
  - 📰 **Hírek** – a játék hírcsatornája: élő állapotsorok (háború, tornádó, űrlények, pénzed) és a legfrissebb események (háború, atombomba, megszállás, tornádó, rakéta, űrlény-elrablás, szintlépés…)
  - A **Robi**-csevegésről: Robi **nem igazi nagy nyelvi modell** (nincs külső szolgáltatás) – a játék állapotát ismeri, és kulcsszavakból érti a kérdéseket:
  - „hol van a legközelebbi benzinkút / bank / bolt / étterem / kocsma / szerelő / iskola / vonat?” – megmondja, merre és hány méterre
  - „mennyi pénzem van?”, „van háború?”, „van vihar / tornádó / űrlény?”, „hány óra van?”, „mit tudsz?”
  - „adj tippet”, „mondj egy viccet”
  - **okostelefonon még**: „jelöld meg a bankot” (felteszi a térképre, K) és „hívj taxit”

- **Eldobható telefon:** az **O** gombbal eldobhatod a telefont (előre esik, gyalog), és **a földre esve összetörik a kijelzője** 💥. **E**-vel felveheted (a hely a mentésben is megmarad). A repedt telefon használható, de Robi válaszainak egy része nem látszik (▒), és repedés látszik a kijelzőn. A telefonbolt **$30**-ért megjavítja; az új telefon ép.

## Fegyverek
- **G** vagy az **egérgörgő**: fegyverváltás; **bal klikk / F**: tűz. A kiválasztott fegyver és a lőszere a képernyő tetején látszik.
  - 🔫 **Pisztoly**, 💥 **sörétes puska** (6 sörét, közelre), 🔥 **gépfegyver** (nagyon gyors) – korlátlan lőszer
  - 🎯 **Rakétavető** – 10 rakéta, becsapódáskor felrobban (15 mp-enként +1)
  - 🚀 **Ballisztikus rakéta** – 3 db, oda csapódik be, ahová az egérrel célzol (max. 2500 px), piros célkör jelzi (60 mp-enként +1)
  - ☢ **Atombomba** – 1 db: lerakod, **15 mp** múlva felrobban – **menekülj legalább 1000 px-re!** (5 percenként +1)
  - A ballisztikus rakéta és az atombomba ★★, a rakétavető ★ körözést hoz. A saját rakétád közelről legfeljebb 30 életet visz el.
- **J**: a **saját bombázód** melléd száll, tele bombával, rakétával és egy atombombával (30 mp-enként hívható). E: felszállás, B: bomba, V: fegyverváltás.

## Saját sereg
- Amint a **háború 900 pixeles körzetébe érsz**, azonnal megjelenik körülötted a **saját sereged** (piros egyenruha): **14 katona és 1 tank**. Követnek, minden ellenséget lőnek – a zöld és a kék sereg is rájuk lő –, és erősítést kapnak (5 mp-enként egy katona). A képernyő tetején látszik a létszámuk.
- A saját sereged golyója és tanklövedéke **téged és a polgárokat nem bántja**, és a te lövésed, bombád sem bántja őket. A háború végén hazamennek.

## Felhőkarcolók
- A világban **felhőkarcolók** is állnak (14–49 emeletesek), főleg **belvárosi fürtökben**, máshol ritkán. Magasnak látszanak: a tetejük elhajlik a kamerától, oldalfalakkal, ablaksorokkal; a magasabbakon helikopter-leszállóhely, villogó antenna.
- Szilárdak, **bemenni nem lehet**. A rakéta, az atombomba és a tornádó ledönti őket.
- ⚠️ **Bombázóval ne repülj nekik:** a gép lezuhan (-70 élet).

## Repülők
- A háborúban **bombázó repülők** húznak el a csatatér fölött: kb. 38 másodpercenként egy, és bombákat szór az ellenséges katonákra és tankokra (a saját oldalát kíméli).
- **Te is vezethetsz egyet:** a háború kezdetén mindkét sereg mögött áll egy leparkolt bombázó. Állj mellé, **E**: felszállsz.
  - **W / S**: gáz és fék (a gép nem tud megállni, kb. 35–155 km/h között repül), **A / D**: kormány.
  - **B**: tűz, **V**: fegyverváltás – három fegyver: 💣 **bomba** (30 db, a házakat is romba dönti, körözés jár érte), 🚀 **ballisztikus rakéta** (6 db, a gép orra előtt 1700 pixelre csapódik be, piros célkör jelzi, 4,5 mp-ig repül) és ☢ **atombomba** (csak 1 db! 2,5 mp-ig esik, aztán igazi atombomba robban: **1000 pixelen belül te is meghalsz, ezért gyorsíts el: W!**). A rakéta és az atombomba ★★ körözést von maga után. A lőszer a géppel marad. Repülés közben a saját bombád, rakétád nem sebez, az atombomba azonban igen.
  - **E**: ha lassú vagy (kb. 65 km/h alatt), **leszállsz**, a gép ott marad; ha gyors, **kiugrasz** (ejtőernyő, -15 élet, a gép lezuhan).
  - A gép átrepül a házak és az autók fölött.

## Bomba
- **B**: lerakod (autóból hátra ejted), **3 mp** múlva felrobban: a közeli autókból roncs lesz, a házak ledőlnek, az emberek meghalnak – és téged is megsebez, ha túl közel vagy. Robbantásért ★★ körözés jár.
- Legfeljebb 5 bombád lehet, percenként kapsz egy újat (a HUD-on: 💣 3/5).

## Taxi
- **X**: hívsz egy taxit, pár másodperc alatt odajön. Mellette **E**: választhatsz úti célt (kezdőhely, az autód, a legközelebbi benzinkút / bank / kocsma / gyár / bolt / iskola / étterem / autószerelő, verseny rajt, saját 📍 jelölés) – **$5**-ért bárhova elvisz.
- Ha beülsz az autódba, vagy a taxi 45 mp alatt nem ér oda, lemond. A tönkrement taxi nem visz. A szállítási célpontra nem visz el (a szállítást vezetned kell).

## Térkép
- **K**: megnyílik a nagy térkép a környékkel: ⛽ benzinkutak, 🏭 gyárak, 🏦 bankok, 🍺 kocsmák, 🛒 boltok, 🏫 iskolák, 🍽 éttermek, 🔧 autószerelők, 🚆 vasútállomások, 📱 telefonboltok. Az **1–9** és **0** (a saját jelölések: **P**) gombokkal (vagy a jelmagyarázatra kattintva) elrejtheted / megmutathatod őket.
- **Kattints a térképre:** saját pontot jelölsz 📍 (legfeljebb 10, megmaradnak). Egy jelölésre kattintva törlöd, a **Delete** gomb mindet törli.
- A jelölések a radaron és a világban is látszanak, a képernyő szélén nyíl mutat a legközelebbire, és a **taxi** is elvisz oda (a 3 legközelebbihez).
