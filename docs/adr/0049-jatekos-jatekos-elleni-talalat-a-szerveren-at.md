# ADR-0049: Játékos a játékos ellen: a találatot a lövő jelzi, a szerver ellenőrzi és továbbítja

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-15

## Kontextus
A többjátékos módban (ADR-0044) csak a játékosok helyzete utazik, a világ mindenkinél képletből egyezik. A felhasználó azt kérte, hogy a másik játékost meg lehessen ölni. A lövedékek, robbanások és az életerő kliensoldali állapot; közös, szerveren futó fizika nincs.

## Döntés
- **A lövő kliens dönti el a találatot** a többiek (interpolált) helyzete alapján: golyó (`pvpShot`, az `updateBullets`-ból) és a saját bomba / rakéta robbanása (`pvpBlast`, a távolsággal csökkenő sebzés) → `{t:'hit', to, dmg}`.
- **A szerver ellenőriz és továbbít** (`combatHit`): él-e a lövő és a célpont, közelségük (`HIT_RANGE`), a sebzés felső korlátja (`HIT_MAX`), másodpercenkénti korlát (`HIT_PER_SEC`); a célpontnak `{t:'hit', from, name, dmg}`-t küld, a lövő nevét a szerver állapotából (a fiókból) veszi, és megjegyzi, ki találta el utoljára.
- **Az áldozat kliense alkalmazza a sebzést** (`pvpReceive` → `damagePlayer`, a meglévő védelmekkel: újraéledés utáni rövid védelem; házban, buszon, a Holdon, elrabolva, ájultan nem sebezhető). Ha meghal, `{t:'frag', to}`-t küld; a szerver (`combatFrag`) csak akkor jelez a lövőnek, ha az áldozatot az utolsó 10 mp-ben tényleg ő találta el, és egy találatért csak egyszer; az áldozatnak a lövőtől kapott összsebzése elérte a `FRAG_MIN_DMG`-t (tényleg meghalhatott), és 15 mp-enként legfeljebb egy ölés számít (pénzfarmolás ellen). A szerver másodpercenként legfeljebb `HIT_DMG_PER_SEC` összsebzést enged át lövőnként. A lövő egy ölést és `PVP_BOUNTY` jutalmat kap.
- A repülőt a golyó nem találja (magasan jár).

## Elvetett alternatívák
- Szerveroldali szimuláció (lövedékek, életerő a szerveren): a teljes fizikát át kellene vinni a szerverre; sokkal nagyobb átalakítás, szemben a „csak a helyzet utazik” elvvel.
- A találat eldöntése az áldozat kliensén: a késés miatt a lövő nem látná a saját találatát, és a lövés nem járna kézzelfogható visszajelzéssel.

## Következmények
- (+) Kis változás, a meglévő rendszerekbe illeszkedik; a szerver gátat szab a legdurvább visszaélésnek (távolság, mennyiség, hamis ölés-jelzés).
- (−) A kliens megbízható: egy csaló kliens tetszőleges közelségből, a korlátokon belül sebezhet, vagy figyelmen kívül hagyhatja a sebzést. Ez egy barátok közti játéknál elfogadott (a csalókód is létezik).
- (−) A találat a késleltetés miatt kissé pontatlan lehet.
