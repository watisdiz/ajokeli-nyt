# Backlog

Ideoita ja kesken jääneitä huomioita (ks. CHANGELOG.md). Ei aikataulutettu —
poimi tästä kun on aika jatkaa.

## Mihin jäätiin 28.7.2026

Tuotannossa on **1.9.1**. Julkaistut: 1.8.1 (vaalean teeman
kontrastikorjaus), 1.8.2 (`?v=` `index.html`:n omiin assetteihin), 1.9.0
(reitin laskennan hilaindeksi) ja 1.9.1 (`?v=` kaikkiin relatiivisiin
importteihin). [BETA_TESTING.md](BETA_TESTING.md) ajettiin suurelta osin
läpi selainautomaatiolla.

Välimuistiversiointi on nyt kunnossa kolmella tasolla ja testien
vahtimana: `index.html`:n assetit, `app.js`:n nimeämät moduulit ja
moduulien keskinäiset importit. Tämä kannattaa pitää mielessä — sama
juurisyy tuotti kolme eri vikaa kolmessa peräkkäisessä julkaisussa.

Virhetilanteet ajettiin 28.7.2026 ja menivät läpi (ks. Testaus ja laatu).

**Seuraava askel: kaksi jäljellä olevaa testauskohtaa** — ruudunlukija ja
testaus fyysisellä puhelimella. Ne ovat viimeiset asiat betan
hyväksymisehdon ja laajemman jaon välissä. Jälkimmäistä ei voi tehdä
selainautomaatiolla.

## Suorituskyky

- **Ratkaistu 1.9.0:ssa.** Reitin laskenta jäädytti pääsäikeen jopa 8
  sekunniksi, koska reittiosumien haku vertasi jokaista kohdetta
  reittiviivan jokaiseen segmenttiin (koko Suomen 579 liikennehäiriötä ×
  3 886 segmenttiä). Reittisegmentit ovat nyt hilaindeksissä
  (`buildRouteIndex`), ja pisin jumi on 237 ms. Mittaukset: CHANGELOG 1.9.0.

  Jos tähän joskus palataan, jäljellä oleva kallein kohta on
  `forecast.js`:n `distanceGeometryToRouteKm` (719 ms Vantaa–Vaasalla).
  Hilaindeksi ei auta sen toista silmukkaa, joka mittaa 220 alanäytteistettyä
  reittipistettä tiejakson viivaa vasten. Ei kiireellinen — 719 ms jakautuu
  usealle taskille eikä näy jäätymisenä.

## Testaus ja laatu

- [BETA_TESTING.md](BETA_TESTING.md):stä on ajettu selainautomaatiolla
  360 × 800 -näkymässä tuotantoa vasten: **kaikki viisi testireittiä**
  (ei JS-virheitä), paikkahaku, reittiviiva, matka ja ajoaika,
  yhteenveto, yksityiskohtien avaus ja sulku, aseman tietopaneeli
  kartalta, lähtöajan vaihto, Jaa reitti, jaetun reitin lataus, ei
  vaakavieritystä, Escape sulkee hakutulokset (`aria-expanded` kääntyy)
  ja mobiilipaneelin, fokusrengas määritelty tokeneilla.

  **Ajamatta:** enää ruudunlukija.

- **Virhetilanteet ajettu 28.7.2026 — kaikki kuusi kohtaa läpi.** Vika
  injektoitiin ennen moduulien latausta, jolloin `request-guard.js`
  kääri injektoidun `fetch`in ja virhe eteni täsmälleen kuten oikea
  katkos. Sovelluskoodiin ei koskettu.

  - paikkahaun aikakatkaisu: _"Paikkahaku epäonnistui (…). Yritä hetken
    kuluttua uudelleen."_, Hae-painike palautuu käyttöön
  - reitityksen aikakatkaisu: selkeä virhe, lähetyspainike **ei jää**
    pois käytöstä
  - tiesäävirhe: kartta ei kaadu, banneri tarjoaa uudelleenyrityksen ja
    demo-tilan
  - liikennevirhe: havainnot, ennuste ja kartta toimivat
  - ennustevirhe: havainnot ja liikennetilanne toimivat, paneeli sanoo
    sen ääneen
  - oikea aikakatkaisu (12 s) todennettu antamalla pyynnön riippua:
    `ajokeli:request-timeout` laukeaa ja teksti kertoo aikakatkaisusta

- **Palautuminen ilman sivun uudelleenlatausta on nyt todennettu**
  (aiemmin avoin kohta). Uudelleenyritys palautti sekä tiesäädatan että
  liikennetiedot täyteen tilaan, ja `performance.getEntriesByType(
"navigation").length` pysyi arvossa 1 — sivu ei latatunut uudelleen.

- **Löydös, pieni:** liikennekatkoksen aikana reittiyhteenvedon merkki
  jää tilaan "Ladataan…", vaikka sen alla oleva paneeli kertoo oikein
  ettei dataa saatu. Ennuste tekee saman tilanteen oikein näyttämällä
  "Ei saatavilla", joten kyse on epäjohdonmukaisuudesta, ei tietoisesta
  valinnasta. Korjaantuu itsestään kun uudelleenyritys onnistuu.
  Korjattavissa `traffic-feature.js`:n yhteenvedon renderöinnissä.

- **Fyysinen puhelin tuotti ensimmäisen oikean löydöksen 28.7.2026:**
  suodatinpaneelin avaus nosti näppäimistön, koska fokus meni
  tekstikenttään. Emulointi ei paljastanut tätä lainkaan — 360 × 800
  -näkymässä ei ole näppäimistöä joka peittäisi puolet ruudusta.
  Korjattu 1.9.2:ssa. Tämä on hyvä muistutus siitä, miksi alla oleva
  kohta ei ole muodollisuus.

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

  **Päätös 27.7.2026: asetus jätetään päälle.** Ylläpitäjä katsoi, ettei
  tämä ole prioriteetti, ja että oletuksena kerättävä data on hyväksyttävää.
  Älä nosta tätä uudelleen avoimena tehtävänä. `README.md` päivitettiin
  samalla kuvaamaan todellisuutta — se väitti aiemmin virheellisesti, ettei
  Web Analyticsia ole otettu käyttöön.

  Se mikä jää voimaan on **ehdollinen riski**: lupaus "ei analytiikkaa"
  on tosi vain koska CSP estää beaconin. CLAUDE.md ennakoi, että
  `script-src`:ää joudutaan muokkaamaan kun uusi ulkoinen isäntä
  lisätään — se joka sen tekee ajattelee karttapalvelinta, ei
  analytiikkaa. **Käsittele jokaista `script-src`-muutosta myös
  tietosuojapäätöksenä** ja tarkista `privacy.html`:n lupaus sen jälkeen.

  Tarkennus: Web Analytics ei ole se, mikä antaa Cloudflarelle näkyvyyden.
  Käänteisproxyna se näkee ja lokittaa joka pyynnön beaconista
  riippumatta, joten `privacy.html`:ää ei pidä lukea niin ettei Cloudflare
  tiedä mitään.

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
