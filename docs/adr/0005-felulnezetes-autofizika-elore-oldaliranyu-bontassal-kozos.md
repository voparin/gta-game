# ADR-0005: Felülnézetes autófizika előre/oldalirányú bontással, közös a játékosnak és az AI-nak

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
Kézifékes driftet, féknyomot és csúszást kért a felhasználó. Az első modellben a sebesség mindig az autó orrának irányába fordult, így csúszni nem tudott.

## Döntés
Az autó előbb fordul, majd a sebességét előre (`fwd`) és oldalirányú (`lat`) összetevőre bontjuk. Az oldalirányú rész a tapadástól függően csillapodik (normál 12/s, kézifék 1.2/s, nyálka 0.4/s). Ugyanez az `updateCarPhysics` mozgatja a játékos, az AI és a rendőr autóit; csak a bemenet (`playerCarInput`, `aiCarInput`, `policeInput`) más. Az autótípusok paraméterekkel különböznek (`CAR_MODELS`).

## Elvetett alternatívák
- Valódi merevtest-fizika (nyomaték, kerékmodell): pontosabb, de sokkal bonyolultabb.
- Külön, egyszerűsített AI-mozgás: olcsóbb, de az AI nem csúszna nyálkán, és nem viselkedne hihetően.

## Következmények
- (+) Egy helyen hangolható; a nyálka, homok és szél minden autóra hat.
- (−) A tapadási értékek kézzel hangoltak, nem fizikailag pontosak.
