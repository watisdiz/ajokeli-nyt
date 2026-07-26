# Backlog

Ideoita ja kesken jääneitä huomioita, jotka nousivat esiin tekninen velka
+ design-uudistuksen aikana (ks. CHANGELOG.md). Ei aikataulutettu — poimi
tästä kun on aika jatkaa.

## Testaus ja laatu

- Uutta vaaleaa teemaa, teemakytkintä ja mikro-interaktioita ei ole
  testattu kapealla mobiilinäytöllä — vain työpöytäkoossa selaimessa.
- Kontrastit (`-fg`-tokenit, riskibanneri) laskettu käsin WCAG-kaavalla,
  ei ajettu automaattista työkalua (axe, Lighthouse) koko sivulle.
- Ei linteriä/formatteria (ESLint, Prettier) käytössä — koodityyli nojaa
  pelkkään kuriin. Harkitse jos tiimi kasvaa tai committeja tulee useilta.

## Muuta

- Kelikamerakuva epäonnistui kerran manuaalisessa selaintestissä (ei
  toistettu / ei varmistettu onko toistuva Digitrafficin CDN-ongelma vai
  yksittäisen kameran vika).
