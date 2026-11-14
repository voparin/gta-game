# ADR-0037: Telefon és Robi: beépített, szabályalapú „MI” külső szolgáltatás nélkül

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó telefonokat és telefonboltokat kért, amiken egy MI-vel lehet csetelni. A játék egy statikus, build és függőségek nélküli oldal (ADR-0001, ADR-0002), GitHub Pages-en fut. Egy valódi nagy nyelvi modell (külső API) hívásához titkos kulcs kellene, ami a böngészőben nem tárolható biztonságosan, és a játék ettől külső szolgáltatástól függene.

## Döntés
- A telefonok a telefonboltban vehetők (új ház-típus `phoneShop`, a `phoneRoll` a meglévő sorsolások után). Két modell: egyszerű (`progress.phone` = 1, $60) és okostelefon (2, $200), a mentésben egy szám (`sanitizeProgress` szűri).
- „Robi” a játékba épített, **kulcsszavas, szabályalapú** csevegőpartner (`robiReply`): a bemenetet ékezet- és kisbetű-függetlenre alakítja (`norm`), szó eleje alapján felismeri a szándékot (`has`), és a játék tényleges állapotából válaszol (a legközelebbi benzinkút, bank, bolt… iránnyal és távolsággal, pénz, háború, vihar, űrlény, tippek, viccek). Az okostelefonon a válaszhoz mellékhatás is tartozik: térképjelölés (`progress.pins`) és taxihívás (`callTaxi`) – a `robiReply` csak leírja (`{ text, pin?, taxi? }`), a `tickPhone` hajtja végre, így a válasz tiszta és tesztelhető.
- A telefon modális ablak (mint a menü): a játék áll, a gépelés az `e.key`-vel megy (ékezetek is), a `phone.pending` rövid „gépel…” késleltetést ad.
- A csevegés előzménye nincs a mentésben.

## Elvetett alternatívák
- Külső LLM API hívása: titkos kulcs kell hozzá (nem tárolható biztonságosan egy statikus oldalon), költséges, a játék működése hálózattól és szolgáltatótól függene, és a tesztek sem lennének determinisztikusak.
- Böngészőben futó modell (pl. WebGPU/WASM): több száz MB letöltés, ellentmond a „nincs build, nincs függőség” elvnek.
- Előre megírt, kötött menü a szabad szöveg helyett: kevésbé „csetelős” érzés.

## Következmények
- (+) Offline működik, azonnal válaszol, determinisztikusan tesztelhető, és a játék saját adatait (helyek, háború, pénz) ismeri.
- (+) Új szándék egy új `has(...)` ággal vehető fel a `robiReply`-ba.
- (−) Nem igazi nyelvi modell: a kérdések kulcsszavakra épülnek, a váratlan mondatokra általános válasz jön. Ha a jövőben valódi MI kell, külön ADR és egy saját (kulcsot rejtő) közvetítő szerver kell hozzá.
