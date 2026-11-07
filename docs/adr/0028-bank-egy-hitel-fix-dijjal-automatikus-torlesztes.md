# ADR-0028: Bank: egyszerre egy hitel fix díjjal és automatikus törlesztéssel

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó bankokat kért, ahol hitelt lehet felvenni. A hitel a játék gazdaságába (ADR-0016: nincs szerencsejáték és nincs valódi pénzes vásárlás) és a mentésbe (ADR-0011) is beleszól. Egy kamatos, idővel növekvő vagy büntető hitel könnyen csapdába ejtené a játékost.

## Döntés
A házak kb. 6%-a bank (a ház tulajdonságainak sorsolása után, hogy a meglévők ne változzanak). A pultnál E: hitel `LOAN_MIN`–`LOAN_MAX` ($100–$2000, `LOAN_STEP` lépésekben) **fix** `LOAN_FEE` = 20% díjjal; egyszerre csak egy hitel lehet. A tartozás a `progress.debt`-ben mentődik (a `sanitizeProgress` ellenőrzi). Bármelyik bankban lehet törleszteni (részletben is). Amíg tartozás van, minden `earn()` kereset `AUTO_REPAY` = 25%-a automatikusan törleszt. Nincs időben növekvő kamat és nincs büntetés.

## Elvetett alternatívák
- Időben növekvő kamat / behajtás büntetéssel: csapdába ejthet, és a játékosnak nem élvezetes.
- Korlátlan számú hitel: végtelen pénz-kiskapu.

## Következmények
- (+) Gyors pénz egy drága autóhoz, kiszámítható visszafizetéssel; a tartozás nem nő magától.
- (−) A 20% díj miatt a hitel mindig drágább, mint kivárni.
- (−) Új bevételi forrásnál az `earn()`-t kell használni, különben nem törleszt automatikusan.
