# ADR-0025: Házak belseje: külön koordináta-rendszerű szoba

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-07

## Kontextus
A felhasználó kérte, hogy be lehessen menni a házakba. Felülnézetből a ház csak egy tető; a belsőt nem lehet a világ koordinátáiban, a ház alapterületén megjeleníteni úgy, hogy kényelmesen járható legyen.

## Döntés
A ház ajtaja a út felőli oldal közepén van (`doorOf`). E-re a játékos `player.inHouse` állapotba kerül: a világban a pozíciója az ajtó előtt marad (a rendőr, a tornádó, a küldetés ehhez viszonyít), a mozgása pedig egy külön, `ROOM_W × ROOM_H` méretű szoba koordinátáiban történik (`updateInterior`), a házhoz determinisztikusan tartozó bútorokkal (`furnitureOf`), téglalap-ütközéssel (ADR-0023). A szoba teljes képernyős rétegként rajzolódik (`drawInterior`), a világ közben fut tovább. Bent: nem lehet lőni, a banditák és ellenséges golyók nem érnek el, a rendőr nem lát és nem tartóztat le (a lerázás ideje telik), gyorsabb a gyógyulás. Ha a tornádó lerombolja a házat, a játékost is elviszi. Kimenni csak az ajtónál lehet.

## Elvetett alternatívák
- A szoba a világban, a ház alapterületén: a ház túl kicsi a kényelmes járkáláshoz, és a tető alatti rajzolás bonyolult.
- Csak egy menü („pihenés”) szoba nélkül: nem lenne valódi „bemenés”.

## Következmények
- (+) Egyszerű, jól tesztelhető; a világ minden rendszere változatlanul fut.
- (+) Új játékelem: búvóhely a rendőrök elől.
- (−) A szoba mérete nem a ház méretétől függ.
- (−) Új világszintű rendszernél el kell dönteni, hogy a házban lévő játékosra hat-e.
