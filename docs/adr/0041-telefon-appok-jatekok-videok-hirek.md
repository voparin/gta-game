# ADR-0041: Telefon-appok: főképernyő, mini játékok, videók és a játék hírcsatornája

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó azt kérte, hogy a telefonban legyenek mini játékok, rövid videók és egy hírcsatorna a játékról. A telefon eddig egyetlen csevegő képernyő volt (ADR-0037); a tévé videói a `drawTv`-ben, egyetlen függvénybe zárva rajzolódnak (ADR-0030-as idők óta csak a ház belsejében).

## Döntés
- A telefon főképernyővel indul, 4 appal (`PHONE_APPS`: Robi, Játékok, Videók, Hírek), `phone.app` állapottal; az Esc egy szintet lép vissza, a főképernyőn bezár. A gépelés csak a csevegés appban megy (a többiben a billentyűk az appot vezérlik).
- **Mini játékok** (Kígyó, Repülő): a lépésfüggvények tiszták (`snakeStep`, `flappyStep` …, `r` véletlen-forrással), így determinisztikusan tesztelhetők; a játék ideje a `tickPhone`-ban telik (a világ közben áll, mint minden modális ablakban). A rekordok a mentésben vannak (`progress.phoneScores`).
- **Videók**: a tévé csatornáinak rajza kiemelve a közös `drawTvScreen`-be; a telefon ezt kicsinyítve játssza le, plusz két csak-telefonos klip (tornádó, atomgomba). A tévé csatornái (`TV_CHANNELS`) változatlanok.
- **Hírek**: a játék eseményeit az `addNews` naplózza (`newsLog`, legfeljebb 30: háború kezdete / vége, atombomba, megszállás és felszabadítás, tornádó, homokvihar, űrlények, elrablás, a saját sereg, rakéta, repülőbaleset, szintlépés), a Hírek app ezeket „n mp-e” korral és élő állapotsorokkal (háború, tornádó, űrlény, pénz) mutatja. A napló nincs a mentésben.
- A repedt telefonon (ADR-0040) az appok működnek, a kijelzőn repedés látszik.

## Elvetett alternatívák
- Külön ablak minden appnak: az egy modális telefon-ablak jobban illik a modális játékrendszerhez.
- A játékok pontszámáért pénz: gyors pénzszerzési „exploit” lenne a meglévő gazdaság mellett; a rekord elég jutalom.
- Valódi, külső videók: nincs külső szolgáltatás (ADR-0001); a klipek a tévéhez hasonlóan menet közben rajzolódnak.

## Következmények
- (+) A telefon egy kis platform lett: új app a `PHONE_APPS`-ba és a `drawPhone` / `phoneKey` egy-egy ágába vehető fel.
- (+) A játék eseményeit egy helyen (`addNews`) lehet hírré tenni.
- (−) A hírek csak az adott játékmenet eseményeit tartalmazzák (nincs mentve).
