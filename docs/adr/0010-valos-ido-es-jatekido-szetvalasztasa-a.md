# ADR-0010: Valós idő és játékidő szétválasztása; a menü megállítja a játékot

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A T gomb 60-szorosra gyorsítja a napszakot, de a féknyomoknak 5 valódi másodperc alatt kell eltűnniük, és az Esc menünek mindent meg kell állítania.

## Döntés
Két óra van: a `time` a napszak (a T gyorsítja), a `clock` a valós játékidő (a T nem gyorsítja). Minden játékmeneti időzítés (féknyom, füst, lövés, küldetés, rendőr) a `clock`-ot vagy a `dt`-t használja. Nyitott menünél egyik óra sem lép, és az `update` nem fut, a rajzolás igen.

## Elvetett alternatívák
- Egyetlen óra: a T gomb a játékmenetet is felgyorsítaná.

## Következmények
- (+) A gyors idő csak a napszakot érinti; a szünet teljes.
- (−) Új időzítésnél mindig el kell dönteni, melyik órához tartozik.
