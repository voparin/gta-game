# ADR-0040: Eldobható telefon: a földön heverő tárgyak a mentésben

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó azt kérte, hogy a telefonok eldobhatók és felvehetők legyenek, de eldobva összetörjön a kijelzőjük. A játék világa képletből épül és nincs tárolt állapota (ADR-0006), a mentés egy kis `progress` objektum (ADR-0003).

## Döntés
- Az eldobott telefon egy a világban heverő tárgy: `progress.droppedPhones` (legfeljebb `DROPPED_PHONE_MAX` darab `{x, y, level}`), a `sanitizeProgress` szűri, a régi mentésben üres. Azért a mentésben (és nem csak a memóriában) van, hogy egy újratöltéstől ne vesszen el a telefon, amit a játékos pénzért vett.
- Eldobáskor (`O`, `dropPhone`) a telefon 140 px-szel előre esik (akadálynál a lábadnál), és a kijelzője összetörik: felvételkor (`E`, `pickUpPhone`) `progress.phoneCracked = true`. Repedt telefonon Robi válaszai egy része nem látszik (`crackText`: a betűk ~14%-a `▒`), a kijelzőn repedés rajzolódik; minden más működik. A telefonbolt javítja ($30), az új telefon vásárlása ép kijelzőt ad.
- Egyszerre egy telefonod lehet; autóból, házból nem dobhatsz.

## Elvetett alternatívák
- Csak memóriában tárolt heverő telefon: újratöltéskor eltűnne (pénzbe került).
- A világ képletébe (`chunk`) írt „elveszett telefonok”: a világgenerálás szabályát sértené; a játékos eldobott tárgya nem a világ része, hanem a játékos állapota.
- A telefon végleges összetörése (használhatatlan): kevésbé játszható; a javítás újabb pénznyelő és funkció.

## Következmények
- (+) Egyszerű, tesztelhető; a mentés formátuma visszafelé kompatibilis.
- (−) A mentésben a heverő telefonok koordinátái is vannak; ha a játék a jövőben további heverő tárgyakat vezet be, ezt a listát általánosítani kell.
