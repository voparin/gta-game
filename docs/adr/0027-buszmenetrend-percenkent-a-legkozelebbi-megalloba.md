# ADR-0027: Buszmenetrend: percenként egy busz a legközelebbi megállóba

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó kérte, hogy a buszok percenként járjanak. Eddig (ADR-0021) a városi buszok véletlenszerűen jelentek meg a játékos közelében (legfeljebb kettő), így egy megállóban állva kiszámíthatatlan volt, mikor jön busz. A pálya végtelen (ADR-0019), ezért valódi, az egész világra kiterjedő menetrend nem szimulálható.

## Döntés
A véletlen buszmegjelenés helyett menetrend van: `BUS_INTERVAL` = 60 mp-enként (`busSchedule.next`) egy busz indul a játékoshoz legközelebbi megállóba (`nearestBusStop`, `dispatchBus`). A busz a megálló előtt legalább `BUS_LEAD` = 1000 px-rel (széles képernyőn messzebbről, de kevesebb mint egy megállóköznyire, `busLead`), a megálló irányának megfelelő sávban indul; ha közben kereszteződés van, ott nem fordulhat el (`ai.lastCross`), így biztosan a megállóba ér. Ha az indulóhely foglalt (autó, roncs, másik busz), a következő legközelebbi megállóba indul; ha mind foglalt, 2 mp múlva újra próbálja. A megálló közelében a felirat kiírja, hány másodperc múlva jön a következő busz (`nextBusIn`). A menetrend a spawnolással együtt (`spawnEnabled`) kapcsolható ki a tesztekben.

## Elvetett alternatívák
- Minden megállóra külön, valódi menetrend: a végtelen pályán nem szimulálható, és a játékos úgyis csak a közelében lévőt látja.
- A véletlen megjelenés meghagyása gyakoribb járatokkal: nem lenne „percenként”, és nem lenne kiszámítható.

## Következmények
- (+) A játékos számíthat rá: percenként jön busz oda, ahol áll.
- (−) A busz a játékoshoz „igazodik”: ha messzire mész, a következő busz már az új helyed melletti megállóba jön.
- (−) Új buszrendszernél a `BUS_LEAD`-nek kisebbnek kell maradnia, mint a megálló és a kereszteződés távolsága (1250 px).
