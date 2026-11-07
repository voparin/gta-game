# ADR-0006: Chunk-alapú, determinisztikus, menet közben generált világ

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A pálya a 10 000 px-es változat 30-szoros területére nőtt (~55 000 × 55 000 px). Ennyi objektumot előre legenerálni és minden képkockában bejárni túl lassú lenne.

## Döntés
A világ 1000 × 1000 px-es chunkokból áll. Egy chunk tartalmát (akadályok, villanyoszlopok, dűnék, nyálka) a koordinátáiból számolt seedű RNG generálja, amikor először kell (`getChunk`); legfeljebb 600 chunk marad a gyorsítótárban, a legrégebbi kiesik. Ütközés, rajzolás és lövedék mindig csak a közeli chunkokat nézi (`chunksAround`, `chunksIn`). A chunk tartalma nem változhat játék közben, mert újragenerálható.

## Elvetett alternatívák
- Előre generált, teljes objektumlista: egyszerű, de 30x területnél lassú és memóriaigényes.
- Térbeli rács (grid) előre generált objektumokkal: gyors lekérdezés, de továbbra is mindent előre kell generálni.

## Következmények
- (+) A pálya mérete gyakorlatilag nem befolyásolja a sebességet.
- (+) Ugyanaz a hely mindig ugyanúgy néz ki.
- (−) Ami változhat (holttest, roncs, féknyom), az nem tárolható a chunkban, külön listába kell.
