# ADR-0022: Autóbérlés a megállók melletti parkolókban: a játékos autója bérautóvá válik

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó parkolókat kért minden buszmegálló mellé, ahol $15-ért autót lehet bérelni, és magyar zászlót minden megállóba. A játékban egyetlen játékosautó van (`car`), és erre épül sok rendszer (benzin, drift, rendőrség, verseny, kamera, menü).

## Döntés
Minden buszmegállóhoz (ADR-0021) analitikusan tartozik egy parkoló (`parkingLot`), a megálló után, a járdán túl, és egy zászlóhely; a zászló a magyar trikolór (`HU_FLAG`). A parkolóban egy bérautó áll; E-vel `RENT_PRICE` = $15-ért kibérelhető. Bérléskor **a játékos autója (`car`) a parkolóba kerül, és felveszi a `RENTAL_MODEL`-t**, tele tankkal (`car.rental = true`); nincs második játékosautó. A bérlés addig tart, amíg a menüben egy saját autót nem választ (`selectCar`). A kibérelt parkolók a `rentedLots`-ban vannak (ott a hely üres marad). A parkolók területén nincs akadály.

## Elvetett alternatívák
- Második, külön bérautó-objektum a saját autó mellett: a saját autó ott maradna, ahol hagyták, de minden `car`-ra épülő rendszert (benzin, verseny, rendőrség, menü, kamera) többautósra kellene átírni.
- Bérlés a menüből bárhol: nem kötődne helyhez, és nem kellenének parkolók.

## Következmények
- (+) Messze a saját autótól, egy megállónál azonnal autóhoz lehet jutni; minden meglévő rendszer változatlanul működik.
- (−) Bérléskor a saját autó „eltűnik” onnan, ahol hagyták (a menüben visszaválasztható).
- (−) A kibérelt parkolók listája nem mentődik, újratöltés után újra van bérautó.
