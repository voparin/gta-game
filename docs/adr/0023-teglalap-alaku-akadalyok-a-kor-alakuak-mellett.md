# ADR-0023: Téglalap alakú akadályok (házak) a kör alakúak mellett

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
Eddig minden akadály (kaktusz, szikla, lámpa, kút, benzinkút fala) kör volt, az ütközés (`collide`) és a találatvizsgálat (`obstacleAt`) is körökkel számolt. A házak hosszúkás téglalapok; körök sorával közelítve a kódátnézés kimutatta, hogy a sarkoknál kb. 20 px-en „be lehet lépni” a tetőre.

## Döntés
Az akadály kaphat `rect` mezőt (`x0, y0, x1, y1`); ilyenkor az ütközés kör–téglalap alapon történik (`pushOutOfRect`: a téglalap legközelebbi pontjától tol ki, vagy ha a középpont bent van, a legközelebbi oldalon át), a találatvizsgálat pedig téglalapon belüliséget néz. Az `r` mező ilyenkor a fél-átló, csak a chunk-kereséshez kell. Mivel egy akadály a középpontja szerinti chunkba kerül, a keresési sugár `OB_REACH` = 100 px (a legnagyobb ház fél-átlója). A házaktól a kaktuszok/sziklák legalább 30 px-re vannak, hogy egy gyalogos (24 px) mindig elférjen köztük.

## Elvetett alternatívák
- Több, sűrűbb kör a házban: a sarkokon mindig marad rés, és sok kis akadály lassítja az ütközésvizsgálatot.
- Általános sokszög-ütközés: a mostani igényekhez fölösleges bonyolultság.

## Következmények
- (+) A házak pontosan szilárdak; golyó, autó és gyalogos is a rajzolt alakjukhoz ütközik.
- (−) Új, nagyobb akadálytípusnál az `OB_REACH`-et ellenőrizni kell (legalább a fél-átló).
