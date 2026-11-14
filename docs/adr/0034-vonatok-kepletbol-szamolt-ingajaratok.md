# ADR-0034: Vonatok: képletből számolt, 30 mp-enként érkező járatok, a busz utas-rendszerén

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-13

## Kontextus
A felhasználó vonatokat kért, amikre a jegy 4 dollár. A világ végtelen (ADR-0019) és képletből épül (ADR-0006), a buszoknál már van utas-rendszer (`player.riding`, ADR-0021, ADR-0027).

## Döntés
- A vasút képletből van: vonalak `RAIL_Y0 + k·RAIL_SPACE` magasságban (az utak között), vonalanként két sín (kelet / nyugat felé, `RAIL_GAP` távolságra, köztük szigetperon), állomások `STOP_X0 + n·STOP_SPACE` (10 000 px) helyeken.
- A vonatok „lépcsőznek”: a `trainPose(k, dir, i, t)` tiszta függvény szerint a `i`-edik vonat minden `TRAIN_PERIOD` (30 mp) alatt a következő állomásra ér, `TRAIN_DWELL` (10 mp) ideig áll, aztán simán gyorsulva megy tovább. Így minden állomásra pontosan 30 mp-enként ér egy vonat, a vonatok egymástól egy állomásnyira vannak (nem ütköznek), és nem kell semmit szimulálni vagy tárolni: csak a kamera körüli vonatokat számoljuk ki (`trainsIn`). A `getTrain` tartós objektumot ad (a rajta ülő játékos erre hivatkozik).
- A vonat a meglévő utas-rendszert használja: `nearestBoardableBus` a vonatot is visszaadja, `player.riding` lehet vonat (`train: true`), a felszállás / leszállás ugyanaz az E-ág, a jegy `TRAIN_FARE` ($4). A leszállás a szigetperonra esik (a nyugati sín vonatának `angle = π`).
- A mozgó vonat elgázolja a sínen álló játékost (`updateTrains`); a vonat nem ütközik AI autókkal (egyszerűség).

## Elvetett alternatívák
- Szimulált vonat-entitások listája: a világ végtelen, mindig csak a közeli vonatokat kellene élesben tartani és szinkronban a menetrenddel; a képlet ezt ingyen adja.
- Külön utas-rendszer a vonatnak: a busz-rendszer mindent tud, ami kell.
- Egy sínen oda-vissza ingázó vonat blokkonként: 130 mp-es körben csak 15 mp-ig áll egy állomáson, így a 30 mp-es járatsűrűség nem teljesülne.

## Következmények
- (+) Kevés új kód, a menetrend determinisztikus és tesztelhető (`trainShift` az idő eltolására).
- (−) A vonatok egyszerre, „lépcsőzve” mozognak (mind ugyanabban a ritmusban); az AI autók áthajtanak rajtuk.
