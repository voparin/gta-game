# ADR-0008: Szereplők megjelenítése és eltüntetése a játékos körül

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
Gyalogosokat, banditákat, AI autókat és rendőröket kért a felhasználó egy hatalmas pályán. Mindenhol szereplőket szimulálni lehetetlen.

## Döntés
A `spawnAround` a játékos körüli gyűrűben hoz létre szereplőket (gyalogos a járdán, autó a sávban), létszámkorláttal (pl. 14 gyalogos, 2 bandita, 6 forgalmi autó), és eltünteti a túl messzieket (2600–4500 px). Az üldöző rendőr messzebbről is jön, és tovább marad.

## Elvetett alternatívák
- Állandó, előre elhelyezett szereplők: hihetőbb világ, de drága és a nagy pályán értelmetlen.

## Következmények
- (+) Állandó, kis szimulációs költség.
- (−) Ha messzire mész és visszajössz, mások a szereplők.
- Tesztben a szereplőket a játékos közelébe kell tenni, különben eltűnnek (lásd ADR-0012).
