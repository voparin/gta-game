# ADR-0004: Automatikus publikálás: GitHub Actions teszt → GitHub Pages

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó azt kérte, hogy ha egy új fejlesztés működik, automatikusan publikálódjon. A repó nyilvános a GitHubon (`voparin/gta-game`).

## Döntés
Minden `main`-re pusholás után a `.github/workflows/deploy.yml` lefuttatja a szintaxis-ellenőrzést és a füsttesztet; csak siker esetén teszi ki az `index.html`-t és a `game.js`-t a GitHub Pages-re. Helyben is kötelező a teszt a push előtt. Csak a `main` ágra dolgozunk, force push tilos.

## Elvetett alternatívák
- Kézi publikálás: elfelejthető, és hibás verzió is kikerülhet.
- Netlify/Vercel: plusz szolgáltatás és fiók, a GitHub Pages ingyenes és kéznél van.

## Következmények
- (+) Hibás verzió nem kerülhet élesbe; az élő link mindig a legutóbbi zöld állapot.
- (−) Nincs külön tesztkörnyezet: ami a `main`-re kerül, az kb. 1 percen belül él.
