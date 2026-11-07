# ADR-0011: Előrehaladás mentése localStorage-ban

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A játék fejlődési rendszert kapott (pénz, XP, megvehető autók, rekordok). Szerver nincs (ADR-0001, ADR-0004).

## Döntés
A `progress` objektum JSON-ként a `gta.progress` kulcson, a szkinválasztás a `gta.skin` kulcson van a böngésző localStorage-ában. Betöltéskor alapértékekkel egészül ki, így új mezők hozzáadhatók. Ha a tárhely nem elérhető (pl. a tesztben), a játék mentés nélkül fut.

## Elvetett alternatívák
- Szerveroldali mentés fiókkal: eszközök között is megmaradna, de backend kellene.
- Nincs mentés: egyszerűbb, de a fejlődés értelmét vesztené.

## Következmények
- (+) Nincs backend; azonnal működik.
- (−) Böngészőnként és eszközönként külön mentés van; a böngészőadatok törlése elviszi.
- Új mező mindig kapjon alapértéket a `loadProgress`-ben.
