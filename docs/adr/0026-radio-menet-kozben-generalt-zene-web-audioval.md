# ADR-0026: Rádió: menet közben generált zene Web Audio-val, hangfájlok nélkül

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó rádiót kért minden házba, amin „egy random szám megy”. A játéknak nincs hangja, nincsenek fájljai (ADR-0001), és mások zenéit nem használhatjuk.

## Döntés
A zene a böngésző Web Audio API-jával, menet közben szintetizálódik. Egy szám (`makeSong(seed)`) a seedből kap hangnemet, skálát (dúr, moll, pentaton, blues), tempót (90–150 BPM), hangszínt, 32 lépéses dallamot (véletlen séta a skálán, szünetekkel), basszust és egy háromszavas magyar címet. A lejátszás előre ütemez (~0,25 mp-re előre, nyolcadonként) a `frame`-ből hívott `updateRadio`-ban. Az `AudioContext` lustán, az első bemenéskor jön létre (a böngészők csak felhasználói művelet után engedik a hangot). Ha nincs hangrendszer, a rádió állapota akkor is működik, csak nem szól. Bemenéskor új, véletlen szám indul (a seed `Math.random`-ból jön, hogy a játék determinisztikus `rand()`-ját ne zavarja); R: következő, M: ki/be; kilépéskor, halálkor leáll.

## Elvetett alternatívák
- Hangfájlok (mp3/ogg): szerzői jog, letöltési méret, és ellentmond a fájl nélküli felépítésnek.
- Előre megírt dallamok listája: nem lenne igazán „random szám”.

## Következmények
- (+) Végtelen számú, különböző szám, fájlok és jogi gond nélkül.
- (+) Tesztelhető: a teszt kamu `AudioContext`-tel számolja az ütemezett hangokat.
- (−) Egyszerű, chiptune-szerű hangzás.
- (−) A hangerő és a hangzás csak böngészőben, füllel ellenőrizhető.
