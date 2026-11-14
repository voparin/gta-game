# ADR-0048: Google-fiókos belépés: a Google azonosító-jegyét a szerver ellenőrzi

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó a név + jelszavas profil (ADR-0047) mellé Google-fiókos belépést kért. A játék statikus oldal (GitHub Pages) + saját, függőség nélküli szerver a Cloud Runon (ADR-0044, ADR-0046). A Google Cloud projektben a felhasználó létrehozott egy OAuth-ügyfelet (web, engedélyezett címek: `https://voparin.github.io`, a Cloud Run címe).

## Döntés
- **Kliens**: a Google hivatalos szkriptje (Google Identity Services, `accounts.google.com/gsi/client`) csak az engedélyezett címeken töltődik be, menet közben; a hivatalos gomb egy DOM-elemben a vászon fölé, a profil-ablak helyére kerül (`syncGoogleButton`). A Google által aláírt **azonosító-jegyet** (ID token, JWT) a WebSocketen küldjük a szervernek (`{t:'google', credential}`).
- **Szerver**: a jegyet **függőség nélkül** ellenőrzi (`googleVerifier`): RS256-aláírás a Google nyilvános kulcsaival (`oauth2/v3/certs`, óránként frissítve, ismeretlen kulcsnál újratöltve), `aud` = a mi Client ID-nk, `iss` = Google, nem járt le. A profil a Google-fiók belső azonosítójához (`sub`) kötődik: `gsub_<sub>` → a profil azonosítója. Első belépéskor játékbeli nevet kér (`auth_need`); a név ugyanabban a névtérben van, mint a jelszavas profiloké (egyedi). A Google e-mail-címét és valódi nevét nem tároljuk. A Google-profilnak nincs jelszava (jelszavas belépésnél útmutatást kap); a mentés, a jegy és a verziózás ugyanaz, mint ADR-0047-ben.
- A Client ID nyilvános érték (a kódban); titok nincs.

## Elvetett alternatívák
- Firebase Authentication: külső könyvtár és további szolgáltatás; a meglévő saját jegy-rendszer elég.
- A jegy ellenőrzése a Google `tokeninfo` végpontjával: minden belépés külső hívás; a kulcsos ellenőrzés gyorsabb és szabványos.
- Teljes OAuth-folyamat (átirányítás, kód-csere, ügyfél-titok): titkot kellene tárolni; az azonosító-jegy elég a belépéshez.

## Következmények
- (+) Jelszó nélküli, egy kattintásos belépés; elfelejtett jelszó gondja nélkül.
- (−) A Google-gomb csak az engedélyezett címeken működik (a helyi `http://localhost`-on nem, hacsak nem veszik fel a Google-ügyfélbe).
- (−) Ha a Google-alkalmazás „tesztelés” állapotban van, csak a felvett tesztelők léphetnek be; közzé kell tenni (a konzolban).
