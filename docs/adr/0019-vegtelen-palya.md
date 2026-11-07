# ADR-0019: Végtelen pálya

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó végtelen pályát kért. Addig a pálya 55 000 × 55 000 px-es volt, és sok helyen voltak határok: ütközés, chunk-index, utak, benzinkutak, AI-visszafordulás, kamera, lövedékek, küldetések.

## Döntés
Nincs pályaszél. A chunkok (ADR-0006) és a kereszteződések/benzinkutak (ADR-0007) bármely, akár negatív koordinátán is generálódnak; minden határfeltétel és szélső visszafordulás megszűnt. Ami eddig az egész pályán keresett (`allStations`), helyette egyre nagyobb négyzetben keres (`nearestStation`), és ellenőrzi, hogy tényleg a legközelebbit adja. A kezdőhely változatlan (`C = 27500`). A memória a chunk-tároló felső korlátja (600, legrégebben használt kiesik) miatt korlátos.

## Elvetett alternatívák
- Nagyon nagy, de véges pálya: egyszerűbb, de nem az, amit a felhasználó kért.
- Körbeérő (tórusz) pálya: a szélén a túloldalra ugrik, ami furcsa egy sivatagban, és a koordináták kezelése bonyolultabb.

## Következmények
- (+) Bármerre lehet menni, a sebesség nem függ a bejárt területtől.
- (−) Amit „az egész pályán” kellene keresni, azt mindig korlátozott sugarú kereséssel kell megoldani.
- (−) Nagyon nagy távolságoknál a lebegőpontos pontosság elméletileg csökken (milliós koordinátáknál még bőven pontos).
