# ADR-0045: Tenger a pálya közepén: képletből számolt part, az utak hidakon kelnek át

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-14

## Kontextus
A felhasználó tengert kért a pálya közepére. A világ végtelen (ADR-0019) és képletből épül (ADR-0006): utak, házak, kutak, megállók, vasút mind analitikus függvények. Egy víztömeg ezeket mind érinti.

## Döntés
- Egyetlen nagy tenger a „régi pálya közepe” (a kezdőhely, `C`) közelében, tőle délre (`SEA_X`, `SEA_Y`, `SEA_R`; a part legközelebb kb. 11–14 km-re a kezdőhelytől, így az nem változik). A part hullámos: a sugár a szög szinuszainak összege (`seaRadius`), a víz tiszta függvény (`inSea`, `inWater` = víz és nem híd).
- Az **utak és a vasút változatlanok**: hidakon kelnek át (`drawBridges` korláttal), így a forgalom, a buszok, a vonatok és minden útalapú rendszer érintetlen.
- A vízben nincs ház, benzinkút, buszmegálló (és parkoló), trolimegálló, ló, vasútállomás, kaktusz, szikla, dűne: a generáló függvények szűrnek. A véletlenszám-sorrend nem változik (a szűrés a sorsolás után történik), így a szárazföld minden más pontja ugyanaz marad.
- A vízben úszni lehet (gyalog 45%-os, lovon 40%-os sebesség), az autó alig halad (max. 70 px/s); a hídon minden rendes. A háború csatatere nem lehet a vízben. A nagy térképen a tenger látszik.

## Elvetett alternatívák
- Tenger pontosan a kezdőhelyen: a kezdőhely, a mentett világ és sok teszt erre épül.
- Az utak megszakítása a tengernél: az útrács-alapú AI, buszok, troli, vonat, versenyek mind kivételt kapnának.
- Több tó / folyó: a kérés egy tenger volt; később új ADR-rel bővíthető (az `inSea` általánosítható).

## Következmények
- (+) Kevés kód, determinisztikus, tesztelhető; a meglévő világ nem változik.
- (−) Hajó még nincs; a vízben csak úszni és lassan autózni lehet.
