# ADR-0024: Tornádó és lerombolható házak (kivétel a változatlan chunk-tartalom alól)

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó tornádót kért a homokviharokba, ami felszippantja a házakat, autókat és embereket. Az ADR-0006 szerint a chunkok tartalma nem változhat, mert bármikor újragenerálható; a házak analitikusan (`housesIn`) számolódnak.

## Döntés
Erős viharban (`storm.level > 0.6`) egyszerre egy tornádó támadhat (`spawnTornado`), ami a széllel vándorol, és a vihar végén elül. `TORNADO_R` sugáron belül húzza és pörgeti a járműveket (sebesség + a tapadástól független sodrás) és az embereket; `TORNADO_CORE`-on belül felszippantja őket (a `flying` listában körbe repülnek, majd eltűnnek). A játékost (gyalog, autóban, buszon, házban) is elviszi: halál. A lerombolt házak a `destroyedHouses` térképbe kerülnek: a `housesIn` kiszűri őket (így az újragenerált chunk sem hozza vissza), és a már legenerált chunkból az akadály is törlődik; a helyükön rom marad. **Ez az egyetlen engedélyezett kivétel** az ADR-0006 változatlansági szabálya alól: a változás nem a chunkban, hanem egy külön, játékmenet-szintű halmazban él.

## Elvetett alternatívák
- A lerombolt házak a chunkban tárolva: a chunk kiesése a tárolóból (LRU) visszahozná a házat.
- Csak dekoráció, ami nem változtat semmin: nem az, amit a felhasználó kért.

## Következmények
- (+) A rombolás tartós a játékmenet alatt, a chunk-rendszer többi része változatlan.
- (−) A lerombolt házak listája nem mentődik; újratöltéskor újra állnak.
- (−) Ha más analitikus objektum is rombolható lesz, ugyanezt a mintát kell követni (külön halmaz + szűrés).
