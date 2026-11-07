# ADR-0012: Determinisztikus tesztek, kikapcsolható véletlen rendszerekkel

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
Több teszt elbukott, mert a véletlen (bandita szórása, rendőr érkezési ideje, spawnolás) más sorrendben jött ki, amikor új rendszer más véletlenszámokat fogyasztott.

## Döntés
A véletlenszerű rendszerek tesztben kikapcsolhatók (`spawnEnabled`, `slimeEnabled`, `policeEnabled`, `missionsEnabled`). A teszt a szereplőket kézzel, a játékos közelébe, akadálymentes helyre (az útra) teszi. Nem írunk olyan tesztet, ami szórás vagy időzítés szerencséjén múlik; minden tesztet többször újra kell futtatni.

## Elvetett alternatívák
- Rögzített véletlenszám-sorrend (seed) és pontos elvárt értékek: bármilyen új `rand()` hívás eltörné a régi teszteket.

## Következmények
- (+) Egy új funkció nem töri el véletlenül a régi teszteket.
- (−) A tesztben kell kézzel előállítani a helyzeteket (pl. rendőr, bandita).
