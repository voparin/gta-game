# ADR-0030: Térkép: képletből számolt nevezetes helyek és mentett saját jelölések

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó olyan térképet kért, amelyen pontokat lehet jelölni, és látszanak a benzinkutak, gyárak, bankok és kocsmák. A pálya végtelen (ADR-0019), a helyek darabonként, képlettel keletkeznek (ADR-0006), tehát nincs „összes hely” lista.

## Döntés
K-ra nagy térkép nyílik (a játék közben áll, mint a menüben) a játékos körüli `MAP_RADIUS` (25 000 px) sugarú négyzetről. A nevezetes helyeket a `poisIn` a meglévő képletes függvényekből (`stationsIn`, `housesIn` `bank` / `factory` / `pub` jelzői) számolja meg nyitáskor egyszer – a darabokat nem kell legenerálni, és semmit nem tárolunk. A kategóriák (1–5 vagy kattintás a jelmagyarázaton) ki-be kapcsolhatók; ez a radarra is hat. Kattintás a térképen saját pontot jelöl (`progress.pins`, legfeljebb `PIN_MAX` = 10, a mentésben is megmarad, `sanitizeProgress` szűri); meglévő pontra kattintás törli. A jelölések a radaron, a világban (rózsaszín kör) és taxi-úti célként is megjelennek, a képernyő szélén nyíl mutat a legközelebbire. A radar a közeli helyeket másodpercenként / 600 px-enként számolja újra (`radarPois`), nem minden képkockában.

## Elvetett alternatívák
- A darabok legenerálása a térképhez: 25 000 px sugárban ~2500 darab, lassú és kiszorítaná a gyorsítótárat (ADR-0019).
- Görgethető / nagyítható térkép: bonyolultabb kezelés; a fix sugár egyszerű, és a játékos körül mindig elég hely látszik.
- Korlátlan számú jelölés: a radar és a világ zsúfolttá válna, a mentés nőne.

## Következmények
- (+) Gyors, nincs tárolt világ-adat; új helytípus a `poisIn`-be és a `POI_TYPES`-ba vehető fel.
- (+) A taxi (ADR-0029) a jelölt pontokra is elvisz.
- (−) A térkép a megnyitáskori helyzet körül rögzül; a sugáron kívüli helyek nem látszanak.
