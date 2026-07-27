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

## Tietosuoja

- **Cloudflare injektoi Web Analytics -beaconin jokaiseen HTML-vastaukseen.**
  Tuotannosta selaimen User-Agentilla haettu sivu sisältää tagin
  `<script src="https://static.cloudflareinsights.com/beacon.min.js/…">`,
  jota **ei ole** repon `index.html`:ssä — se lisätään Cloudflaren
  reunalla, eli asetus on päällä `watisdis.com`-vyöhykkeellä.

  Mitattu tilanne 1.8.1:ssä: `index.html`:n tiukka CSP
  (`script-src 'self' https://unpkg.com`) **estää sen**. Beaconin
  resurssimerkinnällä on `responseStatus: 0` (vertailun vuoksi sallitulla
  unpkg-skriptillä `200`), Cloudflaren globaaleja ei synny eikä evästeitä
  aseteta. `privacy.html`:n lupaus ("ei evästeitä, kirjautumista tai
  analytiikkaa") ja `README.md`:n vastaava väite siis pitävät yhä.

  Riski on, että lupaus on voimassa vain CSP:n ansiosta, ei asetuksen.
  Jos `script-src`:ää joskus löysätään, analytiikka kytkeytyy hiljaisesti
  päälle ja sivu alkaa rikkoa omaa tietosuojakuvaustaan. **Oikea korjaus
  on kytkeä Web Analytics pois Cloudflaren hallintapaneelista** — se on
  tilin asetus, ei repon muutos.

## Julkaisu

- **Versiointi ei kata `styles.css`:ää, `app.js`:ää eikä
  `theme-init.js`:ää.** `index.html` viittaa niihin ilman `?v=`-parametria,
  ja GitHub Pages tarjoilee ne `Cache-Control: max-age=14400` (4 h).
  `app.js`:n `BUILD_VERSION`-pohjainen ohitus ei auta, koska juuri `app.js`
  on se tiedosto joka on välimuistissa vanhentunut — se ohittaa
  välimuistin siihen versioon jonka _vanha_ kopio tuntee.

  Käytännön seuraus: 1.8.0:n ladannut käyttäjä näki rikkinäisen vaalean
  teeman jopa 4 tuntia 1.8.1:n julkaisun jälkeen. Havaittu tässä
  istunnossa — selain jäi 1.8.0:aan vaikka palvelin tarjoili 1.8.1:tä.
  Korjautuu itsestään TTL:n umpeutuessa, mutta tekee korjausjulkaisuista
  hitaita. Vaihtoehdot: `?v=`-parametri myös näihin kolmeen viittaukseen,
  tai lyhyempi TTL.

## Muuta

- Kelikamerakuva epäonnistui kerran manuaalisessa selaintestissä (ei
  toistettu / ei varmistettu onko toistuva Digitrafficin CDN-ongelma vai
  yksittäisen kameran vika). `dom-utils.js`:n `bindImageFallback` piilottaa
  kameran kortin siististi jos kuva ei lataudu, joten tämä on vain
  seurattava asia, ei koodivirhe.
