# ADR-0029: Taxi: hívható, úti cél választással, az utazás átugorható

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó taxit kért, ami $5-ért bárhova elvisz. A pálya végtelen (ADR-0019): egy valódi, végigvezetett út percekig tartana, és a „bárhova” célt sem lehet szabadon begépelni.

## Döntés
A taxit X-szel lehet hívni: az `aiCars`-ban jelenik meg (`taxicab` jelzővel, mint a rendőr vagy a versenyző, ADR-0013, ADR-0020), a `taxiInput` vezeti a játékoshoz legközelebbi sávpontra, ott vár `TAXI_WAIT` mp-ig. Mellette E-re választólista nyílik a mindig *legközelebbi* célokkal (kezdőhely, saját autó, benzinkút, bank, kocsma, gyár, verseny rajt) és a távolsággal. A szállítási célpont szándékosan nincs köztük: a taxi különben $5-ért kiváltaná a szállítást. A taxi lemond, ha a játékos beül a saját autójába vagy `TAXI_COME` mp alatt nem ér oda; a roncs taxi nem vezet és nem visz; házból vagy buszról nem lehet beszállni. $5 (`TAXI_FARE`) fizetés után rövid (`TAXI_TRIP`) elsötétítés jön, majd a játékos a cél mellett száll ki – az út „átugrik”, ahogy sok játékban. A választás közben a játék áll (mint a menüben).

## Elvetett alternatívák
- Valódi, végigvezetett út: nagy távolságnál percekig tartana, és a taxi elakadhat.
- Szabad célpont kattintással: térkép kellene hozzá (később a térképes jelölések bővíthetik a listát).

## Következmények
- (+) Gyors, kiszámítható utazás; a meglévő AI-autó rendszer szolgálja ki.
- (−) Az utazás nem látványos (csak elsötétítés).
- (−) Új úti cél típusnál a `taxiDestinations`-t kell bővíteni.
