# ADR-0046: A többjátékos szerver a Google Cloud Runon, alvó üzemmódban

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A többjátékos szerver (ADR-0044) eddig csak a felhasználó gépén futott, így csak az otthoni hálózatról volt elérhető. A felhasználó olyan megoldást kért, ami az interneten is elérhető, és a Google Cloudot választotta; az alvó üzemmódot (csak játék közben fut) választotta az árak miatt.

## Döntés
- A szerver a **Google Cloud Run**-on fut egy `Dockerfile`-ból (Node 22, csak a `server.js`, `index.html`, `game.js`). A Cloud Run a WebSocketet támogatja; egy kapcsolat legfeljebb 60 percig él, a kliens újracsatlakozik (ADR-0044).
- **Alvó üzemmód**: legkevesebb 0 példány (ha senki nem játszik, leáll, nem kerül pénzbe), és **legfeljebb 1 példány**: a játékosok helyzete a szerver memóriájában van, így mindenki ugyanarra a példányra kerül és látja egymást. Költségriasztás (költségkeret-figyelmeztetés) a számlázási fiókon.
- A **GitHub Pages**-en futó játék is ehhez csatlakozik: a `NET_SERVER` állandó a felhős szerver címe; a szerver a `https://voparin.github.io` oldalt is elfogadja (`ALLOWED_ORIGINS`), más weboldalt nem.

## Elvetett alternatívák
- Mindig futó példány (legalább 1): kb. havi 29 $, a felhasználó nem kérte.
- Több példány külső közös tárral (Redis, Firestore): fölösleges egy kis játékhoz, és pénzbe kerül.
- Render / Fly.io / Railway: a felhasználó a Google-t választotta.

## Következmények
- (+) A játék a megszokott linken (és a felhős címen) is többjátékos, bárhonnan.
- (+) Csak játék közben kerül pénzbe; havi kb. 50 óra játékig az ingyenes keretben marad (a 2026-11 árak szerint).
- (−) Ha senki nem játszott, az első belépés pár másodpercig tart (a szerver felébred).
- (−) Egy példány bírja a terhelést néhány tucat játékosig; ennél többhöz közös tár kellene.
