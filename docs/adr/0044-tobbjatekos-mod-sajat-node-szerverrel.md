# ADR-0044: Többjátékos mód: saját, függőség nélküli Node-szerver, csak a játékosok helyzete utazik

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó azt kérte, hogy az egész játék egy szerver legyen, és többjátékos módot választott: többen játsszanak egy világban, lássák egymást. A játék eddig egy statikus oldal volt (ADR-0001, GitHub Pages), függőségek nélkül (ADR-0002). A világ képletből épül (ADR-0006), tehát minden kliensen ugyanolyan.

## Döntés
- Új fájl: `server.js` – a Node beépített `http` és `crypto` moduljával, **függőség nélkül**: kiszolgálja az `index.html`-t és a `game.js`-t, a `/ws` címen pedig egy minimális WebSocket-szerver fut (RFC 6455 kézfogás és szöveges keretek). A `/status` megmondja, hányan játszanak.
- Csak a **játékosok helyzete és kinézete** utazik (név, hely, irány, gyalog / jármű, szkin- és autószín, élet): a kliens 0,1 mp-enként küldi (`netState`), a szerver 0,1 mp-enként mindenkinek szétküldi a listát. A szerver minden mezőt szűr (`cleanState`), és bontja a némán maradt (15 mp) kapcsolatokat.
- A többi rendszer (NPC-k, forgalom, háború, időjárás…) minden kliensen helyben fut, nincs szinkronizálva – a világ képlete miatt a házak, utak, megállók mindenkinél ugyanott vannak.
- A kliens (`netConnect`, `updateNet`, `drawOthers`) csak akkor csatlakozik, ha a játék nem a GitHub Pages-ről fut (ott nincs szerver): ilyenkor marad az egyjátékos mód. A többi játékos simán úszik a két üzenet között (`dx/dy` interpoláció), névtáblával látszik.
- A CI Node 22-re vált, és a `tests/server.test.js` két valódi WebSocket-klienssel teszteli a szervert.

## Elvetett alternatívák
- Külső könyvtár (`ws`, Socket.IO): ellentmond a függőség nélküli elvnek (ADR-0002), és build / telepítés kellene.
- A teljes játék a szerveren fut (hiteles szerver, minden NPC szinkronban): sokkal nagyobb átalakítás; a „látják egymást” cél enélkül is teljesül.
- Peer-to-peer (WebRTC): bonyolultabb (jelzőszerver kell hozzá így is).
- Fizetős / külső szolgáltatás (pl. Firebase): fiók és kulcs kellene.

## Következmények
- (+) Egy paranccsal (`node server.js`) a saját gépen futtatható, a hálózat többi gépe is csatlakozhat; az egyjátékos GitHub Pages-változat változatlan.
- (−) Az interneten való közös játékhoz a szervert egy mindig futó gépre / tárhelyre kell telepíteni (pl. egy Node-ot futtató felhőszolgáltatás); ez külön döntés.
- (−) A játékosok egymás világát nem befolyásolják (pl. nem lőhetik egymást, a robbanások és NPC-k nem közösek) – ez a későbbi lépések témája.
