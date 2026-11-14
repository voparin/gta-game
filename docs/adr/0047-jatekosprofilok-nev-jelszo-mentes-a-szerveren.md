# ADR-0047: Játékosprofilok: név + jelszó, a játékállás a szerveren (Firestore)

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó azt kérte, hogy minden játékosnak saját profilja legyen: első belépéskor nevet és jelszót ad meg, utána a saját profiljában játszik. A játékállás (`progress`) eddig csak a böngészőben volt (localStorage, ADR-0003), a szerver (ADR-0044, ADR-0046) a Cloud Runon alvó üzemmódban fut, így a memóriája nem tartós.

## Döntés
- **Tárolás**: a Cloud Runon a **Firestore** (Native, `europe-west1`, a projekt első adatbázisa, ingyenes kereten belül), a REST API-n **függőség nélkül**, a gép saját fiókjával (metadata szerver). Máshol (otthoni gép, teszt) egy JSON-fájl (`data/profiles.json`, nincs a repóban). A választás: `K_SERVICE` környezeti változó (Cloud Run).
- **Fiók**: `profiles/<név-azonosító>` – név (3–16 betű, szám, szóköz, `_ . -`; kis- és nagybetű nem számít), a jelszó **scrypt** hash-e sóval (a jelszó sehol nincs sima szövegként), a játékállás JSON-szövegként (legfeljebb 50 KB). Belépési jegy: HMAC-SHA256-tal aláírt `{id, lejárat}` (90 nap), a titkos kulcs a tárban (`config/secret`), így a jegyet a szerver újraindulása után is elfogadja.
- **Protokoll**: minden a meglévő WebSocketen megy (nincs CORS): `register`, `login`, `auth` (jeggyel), `save`, `logout`; válasz: `auth_ok` (név, jegy, játékállás), `auth_err`, `saved`. Védelem: 5 hibás jelszó után a fiók 15 percre zárolódik, kapcsolatonként percenként 10, IP-címenként 10 percenként 40 kísérlet; a jelszó legalább 6 karakter; ismeretlen névnél is fut a scrypt (ne lehessen időből kitalálni). Mentés: legfeljebb 1/mp kapcsolatonként, **verzióval** (`rev`): a régebbi verzió nem írja felül az újabbat (két gép, elavult lap); a kliens kapcsolat nélkül tovább ment helyben, és újracsatlakozáskor a frissebb helyi állást küldi fel (`chooseProgress`), bezáráskor (`pagehide`) is ment. A vendég-állás belépéskor külön kulcsra mentődik, kijelentkezéskor visszajön. A többiek a **fiók nevét** látják (a szerver felülírja, vendégnél „Vendég N”).
- **Kliens**: első csatlakozáskor (nincs megjegyzett jegy) a profil-ablak nyílik (Új profil / Belépés); regisztráláskor az addigi helyi játékállás az új profilba kerül. A `saveProgress` 2 mp-enként összevonva a szerverre is ment. A viselt szkin is a profil része (`progress.skin`). Esc: vendégként játszik (csak helyi mentés). Az Esc-menüben L: kijelentkezés.

## Elvetett alternatívák
- Google / e-mailes belépés (Firebase Auth): külső könyvtár és beállítás kellene; a felhasználó név + jelszót kért.
- Cloud Storage JSON-fájlok: a Firestore ingyenes kerete és a dokumentumonkénti írás jobban illik.
- A mentés továbbra is csak a böngészőben: nem teljesíti a „saját profil” kérést (más gépen nem folytatható).

## Következmények
- (+) Bárhonnan, bármelyik gépről a saját profiljával játszhat a játékos; a jelszó biztonságosan tárolt.
- (−) Elfelejtett jelszó nem állítható vissza (nincs e-mail); egy új profilt kell létrehozni.
- (−) A játékállást a kliens küldi: egy ügyes játékos csalhat (a játékban amúgy is van csalókód) – a szerver csak a méretet és a formát ellenőrzi.
