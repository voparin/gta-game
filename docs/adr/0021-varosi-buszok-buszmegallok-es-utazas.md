# ADR-0021: Városi buszok, buszmegállók és utazás a buszon

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó buszmegállókat és járó buszokat kért, amikre a játékos fel tud szállni, $2-ért. A zöld busz ugyanakkor csak a játékosé.

## Döntés
A megállók analitikusan, minden úton 2500 px-enként, mindkét oldalon vannak, a kereszteződésektől 1250 px-re (`busStopsIn`). A városi busz egy `aiCars`-beli autó `citybus` jelzővel és narancs `CITY_BUS` modellel (így nem keverhető a játékos zöld buszával); a forgalmi AI vezeti, de a saját oldali következő megállóban megáll `BUS_DWELL` másodpercre. A játékos utasként `player.riding`-on keresztül kapcsolódik a buszhoz: a pozíciója a busz mozgása után a buszéhoz igazodik, nem lő, a busz, amin ül, nem tűnik el. Fel- és leszállás: E, csak álló vagy lassú buszon; a jegy `BUS_FARE` = $2. Az AI autók csak a saját sávjukban lévőre fékeznek (a járdán állóra nem).

## Elvetett alternatívák
- A busz külön, menetrendes vonalon: pontosabb menetrend, de külön útvonal-rendszer kellene.
- Az utas „beül” mint egy autóba (inCar): a játékos irányítaná a buszt, ami nem utazás.

## Következmények
- (+) Minden meglévő rendszer (fizika, ütközés, sérülés, forgalom) működik a buszra.
- (+) Utazás közben a szállítási küldetés is teljesülhet.
- (−) A busz a kereszteződésben véletlenszerűen fordul, nincs fix vonala.
