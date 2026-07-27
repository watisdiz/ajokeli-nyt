# Backlog

Ideoita ja kesken jääneitä huomioita, jotka nousivat esiin teknisen velan ja
design-uudistuksen aikana (ks. CHANGELOG.md). Ei aikataulutettu — poimi
tästä kun on aika jatkaa.

## Testaus ja laatu

- Mobiilitestaus on tehty selainautomaatiolla 360 × 800 -näkymässä
  tuotanto-URLia vasten (1.8.1). Ei vaakavieritystä eikä ylivuotavia
  elementtejä, ja reitti Vantaa → Tampere meni läpi päästä päähän.
  Vaalean teeman kontrastiviat löytyivät ja korjattiin 1.8.1:ssä.
  **Yhä vahvistamatta oikealla puhelimella**: kosketuskohteiden koko,
  iOS Safarin ja Android Chromen renderöintierot, `env(safe-area-inset-*)`
  sekä puhelinraudan suorituskyky pitkillä reiteillä.

- [BETA_TESTING.md](BETA_TESTING.md):n tarkistuslista on ajettu vain
  osittain (1/5 testireittiä). Ajamatta: neljä muuta reittiä ml.
  Vantaa–Vaasa-suorituskykytesti, lähtöajan vaihto, Jaa reitti ja jaetun
  reitin lataus, offline- ja aikakatkaisutilat sekä näppäimistö- ja
  ruudunlukijatarkistukset. Betan hyväksymisehto ei siis vielä täyty.

## Muuta

- Kelikamerakuva epäonnistui kerran manuaalisessa selaintestissä (ei
  toistettu / ei varmistettu onko toistuva Digitrafficin CDN-ongelma vai
  yksittäisen kameran vika). `dom-utils.js`:n `bindImageFallback` piilottaa
  kameran kortin siististi jos kuva ei lataudu, joten tämä on vain
  seurattava asia, ei koodivirhe.
