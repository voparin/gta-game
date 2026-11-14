# ADR-0039: Felhőkarcolók: a házak egy típusa, belvárosi fürtökben, parallaxissal rajzolva

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó felhőkarcolókat kért. A játék felülnézetes, a házak az utak mentén képletből keletkeznek (`housesIn`, ADR-0023), és a rendszerek (ütközés, rombolás ADR-0024, térkép, taxi) ezekre épülnek.

## Döntés
- A felhőkarcoló a ház egy típusa (`hs.sky`, `hs.floors` 14–49): a `skyRoll` a meglévő sorsolások UTÁN jön, így a meglévő házak nem változnak. Csak olyan házból lesz, ami más típus (kocsma, bank, bolt, iskola…) nem. A talpa ugyanaz a téglalap, mint a házaké – ütközésben, rombolásban (rakéta, atombomba, tornádó: `destroyHouse`) minden változatlan.
- Belvárosi fürtök: a 20 000 px-es cellák kb. harmadában (`downtown`, a cella koordinátájából képlettel) a lakóházak 60%-a felhőkarcoló, máshol csak 2%.
- Bemenni nem lehet (`nearestDoor` kiszűri; nincs belső).
- A rajz látványa a parallaxis: a talp a háznál (`drawHouse`), a magas test a tetejével (`drawSkyTop`) a többi dolog FÖLÖTT, a kamerától „elhajló” tetővel, oldallapokkal, ablaksorokkal, helikopter-leszállóhellyel / antennával; távolabbiak előbb.
- A repülő felhőkarcolónak repülve lezuhan (`planeCrash`, ADR-0038).

## Elvetett alternatívák
- Nagyobb talp (valódi óriásépület): a házak 420 px-enként állnak, az átfedés és a kutak / kereszteződések kizárási köre mind változna.
- Belső tér: nincs rá igény, és sok munka.
- Valódi 3D vagy ferde nézet: ellentmond a felülnézetes Canvas 2D döntésnek (ADR-0001).

## Következmények
- (+) Kevés új kód, a ház-rendszer minden része ingyen működik; szemre magasnak látszik.
- (−) A tető kitakarhat közeli dolgokat (kocsik, emberek) – ez a magasság látszatának ára; a teteje a kamera mozgásával „csúszik”.
