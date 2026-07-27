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

- [BETA_TESTING.md](BETA_TESTING.md):n tarkistuslistasta on ajettu
  selainautomaatiolla: kaikki viisi testireittiä, lähtöajan vaihto, Jaa
  reitti ja jaetun reitin lataus. Ajamatta: offline- ja
  aikakatkaisutilat sekä näppäimistö- ja ruudunlukijatarkistukset.
  Hyväksymisehto ei täyty, koska Vantaa–Vaasa jäädyttää
  käyttöliittymän (ks. alla).

## Suorituskyky

- **Reitin laskenta jäädyttää pääsäikeen sekunneiksi.** Mitattu
  tuotannossa `PerformanceObserver`in `longtask`-merkinnöillä, 1.8.1:
  Tikkurila–Helsinki 1,0 s · Helsinki–Turku 3,4 s · Oulu–Rovaniemi 4,4 s ·
  **Vantaa–Vaasa 6,4–8,1 s**. Jumi on yksi yhtenäinen long task, ei monta
  pientä. Reitit valmistuvat oikein eikä JS-virheitä tule.

  Tämä rikkoo [BETA_TESTING.md](BETA_TESTING.md):n hyväksymisehdon
  "Vantaa–Vaasa-reitti ei jäädytä käyttöliittymää".

  Juurisyy on selvittämättä, mutta rajattu: tapahtumaväylän
  `route-changed`/`traffic-changed`/`forecast-changed` laukeavat vasta
  long taskin **lopussa**, joten kyse on synkronisesta laskennasta
  verkkovastausten saavuttua — ei verkon odottamisesta. Kesto skaalautuu
  reitin pituuden mukaan, ei asemamäärän (Oulu–Rovaniemi jumittaa 4,4 s
  vain 25 asemalla). Ennustejaksot on suljettu pois epäillyistä: koko
  Suomen `forecast-sections-simple` on vain 277 jaksoa / 3 668
  koordinaattiparia ja latautuu 154 ms:ssä. Seuraava askel on profiloida
  `route.js`:n ja `traffic.js`:n reittiosumalaskenta.

  Huom: mitattu automaatioselaimessa, joka voi olla oikeaa konetta
  hitaampi — suuruusluokka on silti todellinen.

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

## Muuta

- Kelikamerakuva epäonnistui kerran manuaalisessa selaintestissä (ei
  toistettu / ei varmistettu onko toistuva Digitrafficin CDN-ongelma vai
  yksittäisen kameran vika). `dom-utils.js`:n `bindImageFallback` piilottaa
  kameran kortin siististi jos kuva ei lataudu, joten tämä on vain
  seurattava asia, ei koodivirhe.
