# ADR-0020: Autóversenyek ellenőrzőpontokkal a rácson, versenyzők az aiCars-ban

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó autóversenyeket kért. Kellett egy útvonal, AI ellenfelek, rajt, helyezés és díj úgy, hogy a meglévő autófizika (ADR-0005) és az AI-rendszer működjön.

## Döntés
Egy versenyajánlat jelenik meg a játékoshoz legközelebbi kereszteződésnél (`planRace`). Az útvonal 3 szakasz a rácson (ADR-0007), kanyarokkal, szakaszonként egy közbenső és egy kereszteződési ellenőrzőponttal (6 db). A rajtba hajtva 3 mp visszaszámlálás jön, alatta mindenki a rajthelyén áll. A 3 ellenfél az `aiCars`-ban van `racer` jelzővel (mint a rendőrök, ADR-0013), és a `racerInput` vezeti őket. A versenyzők nem tűnnek el távolság miatt, és nem számítanak bele a forgalmi létszámba. A helyezést élőben az ellenőrzőpont-szám és a következő ponttól mért távolság adja; díj: 600/250/100/0 $. Kiszállás vagy 4 perc után a verseny elveszik.

## Elvetett alternatívák
- Külön versenypálya: a végtelen sivatagban nem illene a világba.
- Időfutam ellenfelek nélkül: egyszerűbb, de kevésbé izgalmas.

## Következmények
- (+) Ugyanaz a fizika, ütközés, sérülés és rajzolás működik a versenyzőkre is.
- (−) A gyorshajtás versenyen is rendőrséget von maga után (ADR-0013), ez szándékos, de zavaró lehet.
- (−) Új AI-autótípusnál figyelni kell a kivételekre (eltűnés, létszám).
