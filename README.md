# Ajokeli nyt

Ajokeli nyt näyttää Suomen tiesääasemien ajantasaiset mittaukset kartalla, laskee niistä läpinäkyvän keliriski-indikaattorin ja kokoaa ajoreitin läheiset keli-, ennuste- ja liikennetiedot yhteen.

Nykyinen versio on **1.7.1 beta**.

## Käytetyt palvelut

Fintrafficin Digitraffic-rajapinnat:

- tiesääasemien sijainnit: `/api/weather/v1/stations`
- uusimmat mittaukset: `/api/weather/v1/stations/data`
- kelikameroiden sijainnit: `/api/weathercam/v1/stations`
- yksinkertaiset tiejaksoennusteiden geometriat: `/api/weather/v1/forecast-sections-simple`
- tiejaksojen keliennusteet: `/api/weather/v1/forecast-sections-simple/forecasts`
- aktiiviset tietyöt: `/api/traffic-message/v2/roadworks`
- aktiiviset liikennetiedotteet: `/api/traffic-message/v2/traffic-announcements`

Reittitoiminnot käyttävät lisäksi:

- Nominatimia käyttäjän käynnistämään paikkahakuun
- OSRM:n julkista demo-reititystä ajoreitin laskentaan
- OpenStreetMap-aineistoa paikkoihin ja reitteihin
- OpenFreeMapia karttataustaan

## Ominaisuudet

- Suomen kartta ja aktiivisesti mittaavat tiesääasemat
- havaintoihin perustuva keliriski-indikaattori
- ajoreitin pituus, ajoaika ja reitin läheiset tiesääasemat
- aktiiviset tietyöt ja liikennetiedotteet kartalla
- tiejaksoennusteet valitulle reitille ja lähtöajalle
- lähtöaikojen ennustevertailu
- reitin ajokelin, liikennetilanteen ja ennusteen tiivis yhteenveto
- yksityiskohtien avaaminen tarvittaessa
- jaettava reittilinkki lähtöpaikalla, määränpäällä ja ennusteajalla
- selainpaikannus ja lähin kelikamera
- mobiilin reitti- ja suodatinpaneeli
- erilliset virhe- ja uudelleenyritystilat
- ulkoisten API-pyyntöjen aikakatkaisut
- näkyvä beta-versio, tietosuojakuvaus ja palautelinkki
- automaattiset riski-, reitti-, ennuste-, liikenne-, beta- ja käyttöliittymätestit

## Reitin ajokeli

Käyttäjä hakee ja valitsee lähtöpaikan sekä määränpään. Palvelu näyttää:

- ajoreitin kartalla
- reitin pituuden ja arvioidun ajoajan
- tiesääasemat enintään 8 km:n etäisyydeltä reitistä
- reitin vaikeimman luotettavan havaintoluokan
- merkittävimmät havaintoperusteet
- asemat ajoreitin mukaisessa järjestyksessä

Havaintoyhteenveto perustuu yksittäisiin tiesääasemiin. Se ei ole sääennuste, navigointiohje tai virallinen ajokelivaroitus.

## Keliennuste ja lähtöaika

Reitin laskemisen jälkeen palvelu hakee Digitrafficin tiejaksot ja niiden keliennusteet reitin alueelta. Palvelu:

- tunnistaa tiejaksot enintään 5 km:n etäisyydeltä reitistä
- näyttää tiejaksot kartalla ennustetun keliluokan väreillä
- muodostaa lähtöaikavaihtoehdot todellisista ennusteajoista
- näyttää valitun lähtöajan huonoimman tiejaksokohtaisen keliluokan
- vertailee tarkasteltujen lähtöaikojen ennustettua kokonaisuutta
- näyttää tiejaksojen lämpötiloja, tuulta ja olosuhdesyitä

Vertailu käyttää Digitrafficin luokkia `NORMAL_CONDITION`, `POOR_CONDITION` ja `EXTREMELY_POOR_CONDITION`. Suotuisin vertailuaika on laskennallinen vertailu, ei ajo- tai turvallisuussuositus.

Keliennustetta ei haeta `?demo=1`-tilassa.

## Reitin liikennetilanne

Palvelu yhdistää reittiin Digitrafficin tietyöt ja liikennetiedotteet. Yhteenveto näyttää:

- reitin lähellä olevien tietöiden ja liikennetiedotteiden määrät
- vakaviksi tulkittujen kohteiden määrän
- kuvaukset, voimassaoloajat ja etäisyyden reitistä
- kohteet kartalla sekä avattavan lisätietonäkymän

Reittiin liitetään aktiiviset, geometrian sisältävät kohteet enintään 2 km:n etäisyydeltä reittiviivasta. Tietyön vakavuus luetaan ensisijaisesti Digitrafficin työvaiheen `severity`-arvosta. Liikennetiedotteen vakavuus on sovelluksen oma tulkinta.

Liikennetiedot eivät muuta OSRM:n valitsemaa reittiä automaattisesti.

## Jaettava reitti

Kun reitti on laskettu, **Jaa reitti** kopioi selaimen osoitteen, johon sisältyvät:

- lähtöpaikka
- määränpää
- valittu ennusteaika, jos sellainen on saatavilla

Jaetun linkin avaaminen ei käynnistä paikkahakuja automaattisesti. Käyttäjän pitää painaa **Lataa jaettu reitti**, jonka jälkeen sovellus hakee paikat ja laskee reitin. Käyttäjän tulee tarkistaa, että valitut paikat ovat oikeat.

## Beta-vakautus

Versiossa 1.7.1:

- sadetutka ja sen selainpuolen GeoTIFF-käsittely poistettiin suorituskyky- ja luotettavuusongelmien vuoksi
- Nominatimin, OSRM:n ja Digitrafficin API-pyynnöillä on hallitut aikakatkaisut
- reittiyhteenveto näyttää nykyisen ajokelin, liikennetilanteen ja ennusteen
- asemat, ennustejaksot ja häiriöt ovat avattavissa tarvittaessa
- selaimen välimuisti ohitetaan versiokohtaisilla moduuliosoitteilla
- pitkät reitit, kuten Vantaa–Vaasa, kuuluvat beta-testauksen hyväksymisehtoihin
- beta-testaukselle on oma [tarkistuslista](./BETA_TESTING.md)
- palvelulla on oma [tietosuojakuvaus](./privacy.html)

Cloudflare Web Analyticsia tai muuta analytiikkaa ei ole otettu käyttöön.

## Paikkahaun ja reitityksen rajaus

Nominatimia ei käytetä automaattiseen kirjoitushetken hakuehdotukseen. Paikkahaku käynnistyy Hae-painikkeesta, tulokset välimuistitetaan selausistunnon ajaksi ja pyynnöt jonotetaan vähintään sekunnin välein.

Julkiset Nominatim- ja OSRM-palvelut ovat MVP:n demo- tai yhteisöpalveluita ilman palvelutasolupausta. Laajemmassa tai kaupallisessa käytössä ne tulee vaihtaa sovittuun palveluntarjoajaan tai itse ylläpidettyyn ratkaisuun.

## Käynnistä paikallisesti

Sovellus toimii ilman build-vaihetta ja npm-riippuvuuksia.

```bash
npm test
npm run serve
```

Avaa selaimessa:

```text
http://localhost:8000
```

Demoaineisto:

```text
http://localhost:8000/?demo=1
```

Sivua ei kannata avata suoraan `file://`-osoitteesta, koska selaimet estävät usein ES-moduulien latauksen paikallisista tiedostoista.

## Julkaisu GitHub Pagesiin

Repossa on GitHub Actions -workflow. Jokainen push `main`-haaraan suorittaa testit ja julkaisee sivun testien onnistuessa.

## Versiohistoria

Käyttäjälle ja ylläpidolle merkittävät muutokset kirjataan tiedostoon [CHANGELOG.md](./CHANGELOG.md).

## Keliriski-indikaattori

Pisteytys ei ole virallinen varoitus tai validoitu onnettomuusriskimalli.

| Tekijä | Pisteet |
|---|---:|
| Tienpinta jäinen | +4 |
| Kuura, lumi tai sohjo | +3 |
| Märkä tai kostea | +1 |
| Tienpinta alle −1 °C | +2 |
| Tienpinta −1…+1 °C | +1 |
| Jäätävä sade | +4 |
| Lumi, räntä tai rakeet | +2 |
| Vesisade tai tihku | +1 |
| Näkyvyys alle 0,5 km | +3 |
| Näkyvyys alle 2 km | +2 |
| Näkyvyys alle 5 km | +1 |
| Tuulen maksimi vähintään 25 m/s | +3 |
| Tuulen maksimi vähintään 17 m/s | +2 |
| Tuulen maksimi vähintään 12 m/s | +1 |

Luokat:

- 0–1: Normaali
- 2–3: Huomio
- 4–6: Vaikea
- 7+: Erittäin vaikea

Yli 15 minuuttia vanha mittaus näytetään harmaana.

## Tekninen rakenne

- `index.html`: käyttöliittymän perusrakenne
- `styles.css`: responsiivinen asettelu
- `app.js`: ominaisuuksien käynnistysjärjestys
- `request-guard.js`: ulkoisten API-pyyntöjen aikakatkaisut ja päivitysajat
- `app-core.js`: tiesääasemakartta ja nykyiset havainnot
- `route-feature.js` ja `route.js`: paikkahaku, reititys ja havaintoanalyysi
- `traffic-feature.js` ja `traffic.js`: liikennetiedotteet ja reittiosumat
- `forecast-bootstrap.js`, `forecast-feature.js` ja `forecast.js`: tiejaksoennusteet ja lähtöaikavertailu
- `beta-feature.js` ja `beta.js`: tiivis yhteenveto, jaettavat reitit ja beta-käyttöliittymä
- `privacy.html`: tietosuojakuvaus
- `BETA_TESTING.md`: manuaalisen beta-testauksen tarkistuslista
- `tests/`: Node.js-testit

Kartta käyttää MapLibre GL JS 5.24.0:aa CDN:stä ja OpenFreeMapin Positron-tyyliä. Kartta-, paikka- ja reittiaineisto perustuu OpenStreetMapiin.

## Data ja lisenssit

- Fintraffic / Digitraffic: CC BY 4.0
- OpenStreetMapin data: ODbL
- OpenFreeMap: MIT
- MapLibre GL JS: BSD-3-Clause
- Nominatim: OpenStreetMap-aineiston hakupalvelu
- OSRM: BSD-2-Clause, reititys OpenStreetMap-aineistolla

Digitraffic-haut käyttävät ajonaikaisesti tunnistetta `AjokeliNyt/MVP 1.7.1`. Tunniste ei sisällä henkilötietoja.

## Vastuunrajaus

Palvelu havainnollistaa yksittäisten tiesääasemien mittauksia, tiejaksoennusteita ja Digitrafficin liikennetiedotteita. Se ei korvaa Fintrafficin virallisia liikennetiedotteita, Ilmatieteen laitoksen varoituksia, varsinaista navigointipalvelua tai kuljettajan omaa harkintaa. Olosuhteet, ennuste ja liikennetilanne voivat muuttua nopeasti.
