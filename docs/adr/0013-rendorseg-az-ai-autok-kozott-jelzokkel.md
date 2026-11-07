# ADR-0013: Rendőrség az AI autók között, jelzőkkel

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
Gyorshajtásért üldöző rendőrség kellett, ami a forgalomhoz hasonlóan autózik, ütközik, szétlőhető.

## Döntés
A rendőrautók ugyanabban az `aiCars` listában vannak `police` és `chasing` jelzővel; üldözéskor a `policeInput`, utána sima forgalomként az `aiCarInput` vezeti őket. A körözést a `wanted` állapot kezeli (1 csillag: gyorshajtás `SPEED_LIMIT` felett, 2: rendőrre lövés), lerázással (12 mp rendőr nélkül) és letartóztatással (álló játékos mellett 1,5 mp).

## Elvetett alternatívák
- Külön rendőrlista és külön fizika: kettős kód az ütközésekhez és a rajzoláshoz.

## Következmények
- (+) Ütközés, sérülés, rajzolás, fények automatikusan működnek a rendőrre is.
- (−) A forgalmi létszámkorlátnál ki kell szűrni a rendőröket (`!c.police`).
