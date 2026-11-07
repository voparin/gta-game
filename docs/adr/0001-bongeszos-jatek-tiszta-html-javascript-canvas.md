# ADR-0001: Böngészős játék tiszta HTML + JavaScript (Canvas 2D) alapon

- **Státusz:** Elfogadva
- **Dátum:** 2026-11-06

## Kontextus
A felhasználó GTA-szerű játékot kért, egyedül, hobbiprojektként. Az első javaslat Phaser 3 + TypeScript + Vite volt, de a cél a gyors, telepítés nélküli kipróbálhatóság.

## Döntés
A játék egyetlen `index.html` + `game.js` párosból áll, a Canvas 2D API-t használja, nincs build lépés, nincs npm-függőség. Megnyitható dupla kattintással, és statikus tárhelyen (GitHub Pages) futtatható.

## Elvetett alternatívák
- Phaser 3 + TypeScript + Vite: kész fizika/tilemap, de build lépés és függőségek kellenek.
- Godot 4 / Unity: 3D lehetőség, de nem fut azonnal a böngészőben, és sokkal nagyobb belépési küszöb.

## Következmények
- (+) Nulla telepítés, azonnali kipróbálás, egyszerű publikálás.
- (−) Fizikát, ütközést, kamerát, fényeket magunknak kell megírni.
- (−) Típusellenőrzés nincs; a hibákat a füstteszt (ADR-0003) fogja meg.
