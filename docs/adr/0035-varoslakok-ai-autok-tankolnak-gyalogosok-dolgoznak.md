# ADR-0035: Élő város: az AI autók tankolnak, a gyalogosok dolgoznak és szolgáltatást használnak

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-13

## Kontextus
A felhasználó azt kérte, hogy minden autó használja a benzinkutat, és minden ember dolgozzon és használja a szolgáltatásokat – vagyis a város éljen, ne csak a játékos használja az épületeket. A világ végtelen (ADR-0019) és képletből épül (ADR-0006), a szereplők csak a játékos közelében élnek (`spawnAround`), a gyalogosok a járdán sétálnak, az AI autók az útrács sávjait követik.

## Döntés
- **AI autók:** a forgalmi autóknak (nem busz, taxi, rendőr, versenyző) van benzinjük (`c.fuel`, 25–100%-ról indulnak). Mozgás közben fogy (`AI_FUEL_USE`), de sosem megy `AI_FUEL_FLOOR` alá (különben elakadnának és eltorlaszolnák az utat). Ha `AI_REFUEL_BELOW` alá esik, és a kereszteződés, amelyen épp áthaladnak, kútnál van (`stationFor`), a kút töltője *mellé* hajtanak (nem a töltőre: ott nem tudnának kitolatni), megállnak, `AI_FILL_RATE` sebességgel tankolnak, majd visszatérnek a sávjukba. Az állapot (`ai.pit`) időkorlátos, az elakadt autó feladja.
- **Gyalogosok:** a járdán sétáló gyalogos időnként (`ERRAND_EVERY`) ügyet választ a közeli épületek közül (`pickErrand`, tiszta választás): *dolgozni* (bolt, étterem, kocsma, bank, szerelő, iskola, gyár) vagy *ügyfélként* menni (az iskola és a gyár kivételével). Az ajtóhoz sétál, belép – ekkor kikerül az `npcs` listából az `indoor` listába –, bent tölt egy időt (a dolgozó 40–70 mp-et, az ügyfél 12–25 mp-et), majd kijön az ajtón, és megy tovább. Útközben ikon látszik a feje fölött; ha a játékos bemegy abba az épületbe, látja a bent lévőket. Ha megijed, ügyet elfelejt; a lerombolt vagy messzi épület lakói kiesnek.
- Az állapotok nincsenek a mentésben.

## Elvetett alternatívák
- A bent lévő gyalogos marad az `npcs`-ben, `inside` jelzővel: a lövés, bomba, tornádó, zebra, AI-fékezés stb. mind az `npcs` listát járja be; mindenhol kivételt kellene írni.
- A forgalmi autók kényszerítése, hogy mindig kútnál álljanak meg: a rács sávjai nem érik el a töltőket; helyette kereszteződésben, útközben dönt az autó.
- Kifogyó benzin az AI autóknál: a megálló autók eltorlaszolnák az utakat.

## Következmények
- (+) Látható élet: kutaknál álló autók, az épületek előtt-mögött közlekedő emberek, tele boltok.
- (+) Az `npcs` lista továbbra is csak az utcán lévőket tartalmazza, a meglévő rendszerek változatlanok.
- (−) A bent lévők nem „valódi” szereplők: nem lehet őket lőni vagy elkapni, amíg bent vannak.
