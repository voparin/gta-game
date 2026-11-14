# ADR-0036: Háborúk: időzített esemény, külön katonalistával

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-13

## Kontextus
A felhasználó azt kérte, hogy néha háborúk legyenek. Már van több időzített esemény (homokvihar, tornádó, űrlények, ADR-0033), és a szereplők csak a játékos közelében élnek (ADR-0019).

## Döntés
- A háború időzített esemény: az első `WAR_FIRST` mp után, utána `WAR_GAP_MIN`–`WAR_GAP_MAX` mp (5–9 perc) pihenővel, a játékidő szerint (menüben áll). Kitöréskor a játékostól 1500–2200 px-re két sereg (A: zöld, B: kék, oldalanként `WAR_SOLDIERS` katona) áll szemben egymással.
- A katonák külön listában élnek (`soldiers`, nem az `npcs`-ben, ahol a gyalogosok sok rendszerben részt vesznek): az ellenség felé közelítenek, megtartják a távolságot, lőnek. Lövedékük a közös `bullets` listában van `warA` / `warB` jelzővel, az `updateBullets` kezeli: a másik oldalt, a játékost (házban és buszon nem), a polgárokat és az autókat találja. A játékos lövése és a bomba is öli a katonákat (`SOLDIER_BOUNTY`).
- Mindkét oldalon `WAR_TANKS` tank van (ugyanabban a listában, `tank: true`): nagy (`TANK_HP`), a puskagolyó csak `TANK_RIFLE` részét viszi el, ágyújuk repülő lövedéket (`warShells`) lő, ami becsapódáskor `shell`-ként robban (a saját oldalt kíméli, `TANK_SHELL_HIT`-et sebez a tankon); a pótlás `TANK_REINFORCE` mp-enként.
- Ballisztikus rakéta (`missiles`, `launchMissile`, `missileImpact`): `MISSILE_EVERY` (22 mp) időközönként a háború egyik oldala távoli kilövőhelyről rakétát indít; `MISSILE_FLIGHT` (4,5 mp) repülés után csap be, a célt (lakott terület, csatatér, néha a játékos) piros célkör jelzi, így a játékosnak van ideje menekülni. A becsapódás (`MISSILE_RADIUS`) öl és sebez, a házakat (`MISSILE_HOUSES`) romba dönti (`destroyHouse`, ADR-0024).
- Tüzérségi lövedék (`shell`) csapkod a csatatéren: öl és sebez, de házat nem rombol (az a bomba dolga).
- A háború `WAR_LIFE` (240 mp = 4 perc) ideig tart: a fogyatkozó sereg `WAR_REINFORCE` (3 mp) időközönként egy új katonát kap a csatatér szélén (oldalanként legfeljebb `WAR_SOLDIERS`), így a harc a végéig tart; a végén az `nuke` (atombomba) robban a csatatér közepén `NUKE_WARN` mp-es figyelmeztetés után (HUD visszaszámlálás): `NUKE_KILL` px-en belül halálos, `NUKE_RADIUS`-ig sebez, a házban lévőt csak `NUKE_HOUSES` px-en belül öli meg (ott a házakat romba dönti, ADR-0024), az autókat és embereket elpusztítja, kráter (`craters`) és látvány (`nukeFx`) marad. Utána a háború katonái eltűnnek, és ha volt győztes (kevesebb veszteség), az **megszállja** a területet: `occupation` + `garrison` lista (külön a `soldiers`-től, mert a háború már véget ért), `OCCUPY_TIME` ideig, a `OCCUPY_RADIUS` körzetben a helyőrség lövi a játékost; ha mind elesett, a terület felszabadul (`LIBERATE_BOUNTY`). Új háború az előző megszállást lezárja. A fogó nyíl jelzi a csatateret. Ha a játékos a háborúban hal meg, ott éled újra (`respawn(true)`: a csatatér szélén, a halála irányában, `WAR_RESPAWN_DIST` távolságra, `RESPAWN_SHIELD` mp védelemmel – `player.shieldUntil`, a `damagePlayer` figyelmen kívül hagyja); messze (`WAR_RESPAWN_RANGE`), az atombomba-figyelmeztetés alatt vagy háború nélkül a kezdőhelyen. Az állapot nincs a mentésben.
- **A játékos saját serege** (`side: 'P'`, ugyanabban a `soldiers` listában): ha a játékos `ARMY_JOIN` px-en belülre ér a csatatérhez, azonnal megjelenik körülötte `ARMY_SIZE` katona és `ARMY_TANKS` tank (`callArmy`, háborúnként egyszer). Követik (`ARMY_FOLLOW`), minden ellenséget lőnek (az `A` és `B` is őket), erősítést kapnak (`ARMY_REINFORCE`). A `P` lövedéke és gránátja a játékost és a polgárokat nem bántja, a játékos lövése és bombája a `P`-t nem bántja. A háború végén hazamennek.

## Elvetett alternatívák
- Katonák mint `npcs`: a járdán sétáló gyalogosok rendszere (zebra, ijedezés, sodródás) nem illik hozzájuk; mindenhol kivételt kellene írni.
- Tartós háború, ami állandóan rombolja a világot: a világ-generálás szabályát (ADR-0006) sértené. Az atombomba egyszeri, és a már meglévő `destroyHouse` mechanikát (ADR-0024) használja.

## Következmények
- (+) Önálló rendszer, a meglévőkhöz a lövedék-feldolgozás és a nyíl kapcsolódik.
- (−) A háború mindig a játékos közelében keletkezik, nincs „valódi” távoli front.
