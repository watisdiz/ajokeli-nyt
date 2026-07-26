# Backlog

Ideoita ja kesken jääneitä huomioita, jotka nousivat esiin tekninen velka
+ design-uudistuksen aikana (ks. CHANGELOG.md). Ei aikataulutettu — poimi
tästä kun on aika jatkaa.

## Design-järjestelmän viimeistely

- **Vie riskitaso-bannerin hierarkiamalli muihinkin paneeleihin.**
  Design-vaihe B validoi mallin (banneri + tärkein syy heti näkyvissä,
  mittaukset jaettu vaikuttaviin/muihin) vain tiesääaseman tietopaneelissa,
  suunnitellusti. Reittiyhteenveto, liikennetilanne- ja
  ennustepaneelit voisivat hyötyä samasta kohtelusta.
- **Yhtenäistä "recessed"-korttityyli tokeniksi.** `--surface-raised`
  kattaa vain valkoisella sävytetyt "kohotetut" pinnat. Musta-sävytetyt
  "upotetut" kortit (`.traffic-count-card`, `.forecast-count-card`,
  `.route-station-list` ym., `rgba(0, 0, 0, 0.1)`) toimivat sellaisenaan
  molemmissa teemoissa, mutta eivät ole systemaattisesti yhden tokenin
  takana — pieni jälkisiivous jos teemajärjestelmää laajennetaan lisää.
- Muutama koristeellinen reunaviiva (esim. `.beta-overview`,
  `.forecast-data-status`) käyttää kiinteää `rgba(98, 168, 255, X)` -sinistä
  `var(--accent)`:n sijaan, joten ei seuraa teemaa täysin. Ei kriittinen,
  hyvin matala kontrasti kummassakin teemassa.

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
