# Backlog

Ideoita ja kesken jääneitä huomioita (ks. CHANGELOG.md). Ei aikataulutettu —
poimi tästä kun on aika jatkaa.

## Mihin jäätiin 27.7.2026

Tuotannossa on **1.8.2**. Sinä päivänä julkaistiin 1.8.1 (vaalean teeman
kontrastikorjaus) ja 1.8.2 (`?v=` myös `index.html`:n omiin assetteihin),
ja [BETA_TESTING.md](BETA_TESTING.md) ajettiin suurelta osin läpi
selainautomaatiolla tuotanto-URLia vasten.

**Seuraava askel: profiloi reitin laskennan jäätyminen** (ks. Suorituskyky).
Se on ainoa tiedossa oleva asia, joka estää betan hyväksymisehdon
täyttymisen. Sen jälkeen jäljellä ovat offline-testaus, ruudunlukija ja
fyysinen puhelin.

## Suorituskyky

- **Reitin laskenta jäädyttää pääsäikeen sekunneiksi.** Mitattu
  tuotannossa `PerformanceObserver`in `longtask`-merkinnöillä:
  Tikkurila–Helsinki 1,0 s · Helsinki–Turku 3,4 s · Oulu–Rovaniemi 4,4 s ·
  **Vantaa–Vaasa 6,4–8,1 s**. Jumi on yksi yhtenäinen long task, ei monta
  pientä. Reitit valmistuvat oikein eikä JS-virheitä tule.

  Tämä rikkoo [BETA_TESTING.md](BETA_TESTING.md):n hyväksymisehdon
  "Vantaa–Vaasa-reitti ei jäädytä käyttöliittymää", eli **beta ei ole
  valmis laajempaan jakoon ennen kuin tämä on korjattu.**

  Juurisyy on selvittämättä, mutta rajattu:

  - tapahtumaväylän `route-changed` / `traffic-changed` /
    `forecast-changed` laukeavat vasta long taskin **lopussa**, joten kyse
    on synkronisesta laskennasta verkkovastausten saavuttua — ei verkon
    odottamisesta
  - kesto skaalautuu reitin pituuden mukaan, ei asemamäärän
    (Oulu–Rovaniemi jumittaa 4,4 s vain 25 asemalla)
  - ennustejaksot on suljettu pois epäillyistä: koko Suomen
    `forecast-sections-simple` on vain 277 jaksoa / 3 668
    koordinaattiparia ja latautuu 154 ms:ssä

  Seuraava askel on profiloida `route.js`:n ja `traffic.js`:n
  reittiosumalaskenta — todennäköisin epäilty on reittiviivan pisteiden ×
  kohteiden etäisyysvertailu. Jos korjaus vaatii työn pilkkomista, muista
  ettei tästä saa tulla uutta raskaan selainpuolen datankäsittelyn
  tapausta (ks. CLAUDE.md:n sudenkuopat).

  Huom: mitattu automaatioselaimessa, joka voi olla oikeaa konetta
  hitaampi — suuruusluokka on silti todellinen.

## Testaus ja laatu

- [BETA_TESTING.md](BETA_TESTING.md):stä on ajettu selainautomaatiolla
  360 × 800 -näkymässä tuotantoa vasten: **kaikki viisi testireittiä**
  (ei JS-virheitä), paikkahaku, reittiviiva, matka ja ajoaika,
  yhteenveto, yksityiskohtien avaus ja sulku, aseman tietopaneeli
  kartalta, lähtöajan vaihto, Jaa reitti, jaetun reitin lataus, ei
  vaakavieritystä, Escape sulkee hakutulokset (`aria-expanded` kääntyy)
  ja mobiilipaneelin, fokusrengas määritelty tokeneilla.

  **Ajamatta:** offline- ja aikakatkaisutilat tarkoituksellisesti
  testattuina (selaimen kehittäjätyökaluilla) sekä ruudunlukija.

- **Yksi todentamaton kohta:** kartan latausvirheen uudelleenyritys
  palautti kartan (280 asemaa, virhebanneri piiloon), mutta jäi
  varmistamatta tapahtuiko se **ilman sivun uudelleenlatausta** —
  inspektointiyhteys katkesi juuri klikkauksen kohdalla. Hyväksymisehto
  vaatii nimenomaan palautumisen ilman uudelleenlatausta, joten tämä
  pitää toistaa.

- **Yhä vahvistamatta oikealla puhelimella.** Emulointi 360 × 800:ssa ei
  kata kosketuskohteiden kokoa, iOS Safarin ja Android Chromen
  renderöintieroja, `env(safe-area-inset-*)`:ia eikä puhelinraudan
  suorituskykyä pitkillä reiteillä. Tämä ei ratkea selainautomaatiolla.

## Tietosuoja

- **Cloudflare injektoi Web Analytics -beaconin jokaiseen HTML-vastaukseen.**
  Tuotannosta selaimen User-Agentilla haettu sivu sisältää tagin
  `<script src="https://static.cloudflareinsights.com/beacon.min.js/…">`,
  jota **ei ole** repon `index.html`:ssä — se lisätään Cloudflaren
  reunalla, eli asetus on päällä `watisdis.com`-vyöhykkeellä.

  Mitattu tilanne: `index.html`:n tiukka CSP
  (`script-src 'self' https://unpkg.com`) **estää sen**. Beaconin
  resurssimerkinnällä on `responseStatus: 0` (vertailun vuoksi sallitulla
  unpkg-skriptillä `200`), Cloudflaren globaaleja ei synny eikä evästeitä
  aseteta. `privacy.html`:n lupaus ("ei evästeitä, kirjautumista tai
  analytiikkaa") ja `README.md`:n vastaava väite siis pitävät yhä.

  Riski on, että lupaus on voimassa vain CSP:n ansiosta, ei asetuksen.
  Jos `script-src`:ää joskus löysätään, analytiikka kytkeytyy hiljaisesti
  päälle ja sivu alkaa rikkoa omaa tietosuojakuvaustaan. **Oikea korjaus
  on kytkeä Web Analytics pois Cloudflaren hallintapaneelista** — se on
  tilin asetus, ei repon muutos, eli tämä odottaa ylläpitäjää.

## Kehitysympäristö

- `npm run serve` kutsuu `python3 -m http.server`:iä, eikä se toimi
  koneella jolla Python on vain Microsoft Storen alias-tynkä (Windows).
  Kiertotapa: mikä tahansa staattinen palvelin repon juuressa. Harkitse
  skriptin vaihtamista Node-pohjaiseksi, jolloin kehitysympäristö ei
  riipu Pythonista lainkaan.

## Muuta

- Kelikamerakuva epäonnistui kerran manuaalisessa selaintestissä (ei
  toistettu / ei varmistettu onko toistuva Digitrafficin CDN-ongelma vai
  yksittäisen kameran vika). `dom-utils.js`:n `bindImageFallback` piilottaa
  kameran kortin siististi jos kuva ei lataudu, joten tämä on vain
  seurattava asia, ei koodivirhe.
