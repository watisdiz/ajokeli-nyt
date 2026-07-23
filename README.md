# Ajokeli nyt

Ajokeli nyt näyttää Suomen tiesääasemien ajantasaiset mittaukset kartalla, laskee niistä läpinäkyvän keliriski-indikaattorin ja kokoaa ajoreitin läheiset keli-, ennuste- ja liikennetiedot yhteen.

Palvelu käyttää Fintrafficin Digitraffic-rajapintoja:

- tiesääasemien sijainnit: `/api/weather/v1/stations`
- uusimmat mittaukset: `/api/weather/v1/stations/data`
- kelikameroiden sijainnit: `/api/weathercam/v1/stations`
- yksinkertaiset tiejaksoennusteiden geometriat: `/api/weather/v1/forecast-sections-simple`
- tiejaksojen keliennusteet: `/api/weather/v1/forecast-sections-simple/forecasts`
- aktiiviset tietyöt: `/api/traffic-message/v2/roadworks`
- aktiiviset liikennetiedotteet: `/api/traffic-message/v2/traffic-announcements`

Reittitoiminnot käyttävät:

- Nominatimia käyttäjän käynnistämään paikkahakuun
- OSRM:n julkista demo-reititystä ajoreitin laskentaan
- OpenStreetMap-aineistoa paikkoihin ja reitteihin

## Ominaisuudet

- Suomen kartta ja kaikki aktiivisesti mittaavat tiesääasemat
- aktiiviset tietyöt ja liikennetiedotteet kartalla
- tiejaksoennusteet valitulle reitille ja lähtöajalle
- lähtöaikojen vertailu nykyhetkestä seuraaviin ennusteaikoihin
- neljä keliluokkaa sekä vanhentuneen tai puuttuvan datan luokka
- automaattinen tiesäädatan päivitys kerran minuutissa
- suodatus riskiluokan ja aseman nimen perusteella
- hakutulokset listana ja näppäimistökäyttö
- mobiilissa avattava reitti- ja suodatinpaneeli
- aseman mittaukset ja luokituksen perustelut
- lähin aktiivinen kelikamera enintään 25 km:n etäisyydeltä
- selainpaikannus
- erillinen demo-tila tiesääaineistolle
- erilliset virhe- ja uudelleenyritystilat tiesäälle, ennusteelle ja liikennetiedoille
- automaattiset riskilaskennan, reitti-, ennuste-, liikenne- ja käyttöliittymätestit

## Reitin ajokeli

Käyttäjä hakee ja valitsee lähtöpaikan sekä määränpään. Palvelu näyttää:

- ajoreitin kartalla
- reitin pituuden ja arvioidun ajoajan
- tiesääasemat enintään 8 km:n etäisyydeltä reitistä
- reitin vaikeimman luotettavan keliluokan
- merkittävimmät havaintoperusteet
- asemat ajoreitin mukaisessa järjestyksessä

Havaintoyhteenveto perustuu yksittäisiin tiesääasemiin. Se ei ole sääennuste, navigointiohje tai virallinen ajokelivaroitus.

## Keliennuste ja lähtöaika

Kun reitti on laskettu, palvelu hakee Digitrafficin yksinkertaiset tiejaksot ja niiden ajantasaiset keliennusteet reitin rajaamalta alueelta. Palvelu:

- tunnistaa tiejaksot enintään 5 km:n etäisyydeltä reitistä
- näyttää tiejaksot kartalla ennustetun keliluokan väreillä
- muodostaa vertailuajat lähimmistä todellisista ennusteajoista
- näyttää valitun lähtöajan huonoimman tiejaksokohtaisen keliluokan
- vertailee, millä tarkastelluista lähtöajoista ennustettu kokonaisuus on suotuisin
- näyttää tiejaksojen lämpötiloja, tuulta ja ilmoitettuja olosuhdesyitä

Vertailu käyttää Digitrafficin luokkia `NORMAL_CONDITION`, `POOR_CONDITION` ja `EXTREMELY_POOR_CONDITION`. Suotuisin vertailuaika on sovelluksen laskennallinen vertailu, ei ajo- tai turvallisuussuositus. Ennustetiedot päivittyvät Digitrafficissa noin viiden minuutin välein.

Keliennustetta ei haeta `?demo=1`-tilassa, jotta tiesäädemo toimii ilman Digitraffic-yhteyttä.

## Reitin liikennetilanne

Kun reitti on laskettu, palvelu yhdistää siihen Digitrafficin Simppeli JSON -muotoiset tietyöt ja liikennetiedotteet. Yhteenveto näyttää:

- reitin lähellä olevien tietöiden ja liikennetiedotteiden määrät
- vakaviksi tulkittujen kohteiden määrän
- kohteiden kuvaukset, voimassaoloajat ja etäisyyden reitistä
- kohteet kartalla sekä avattavan lisätietonäkymän

Reittiin liitetään aktiiviset, geometrian sisältävät kohteet enintään 2 km:n etäisyydeltä reittiviivasta. Tietyön vakavuus käytetään ensisijaisesti Digitrafficin työvaiheen `severity`-arvosta. Liikennetiedotteen vakavuus johdetaan tiedotteen sisällöstä, joten se on sovelluksen oma tulkinta eikä viranomaisluokitus.

Liikennetiedot eivät muuta OSRM:n valitsemaa reittiä automaattisesti. Jos liikennetiedotteiden haku epäonnistuu, reitin ajokeli ja tiesääasemien tiedot toimivat edelleen.

Nominatimin julkista palvelua ei käytetä automaattiseen kirjoitushetken hakuehdotukseen. Paikkahaku käynnistyy vain käyttäjän painaessa **Hae**, tulokset välimuistitetaan selausistunnon ajaksi ja pyynnöt jonotetaan vähintään sekunnin välein.

OSRM:n reitityspalvelu ja julkinen Nominatim ovat MVP:n ulkoisia demo- tai yhteisöpalveluita ilman palvelutasolupausta. Suuremmassa tai kaupallisessa käytössä ne tulee vaihtaa sovittuun palveluntarjoajaan tai itse ylläpidettyyn ratkaisuun.

## Käynnistä paikallisesti

Sovellus on tarkoituksella toteutettu ilman build-vaihetta ja npm-riippuvuuksia.

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

Repossa on valmis GitHub Actions -workflow. Avaa repositorion **Settings → Pages** ja valitse lähteeksi **GitHub Actions**. Jokainen push `main`-haaraan suorittaa testit ja julkaisee sivun testien onnistuessa.

## Versiohistoria

Nykyinen versio on `1.4.0`. Käyttäjälle ja ylläpidolle merkittävät muutokset kirjataan tiedostoon [CHANGELOG.md](./CHANGELOG.md).

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

- `index.html`: käyttöliittymä ja saavutettavuuden perusrakenne
- `styles.css`: responsiivinen desktop-, tabletti- ja mobiiliasettelu
- `app.js`: käynnistää ydinsovelluksen, reitti-, liikenne- ja ennustetoiminnot
- `app-core.js`: Digitraffic-integraatio, tiesääasemakartta ja nykyinen käyttöliittymä
- `route-feature.js`: paikkahaku, reititys ja reittiyhteenvedon käyttöliittymä
- `route.js`: reitin etäisyyslaskenta, asemien valinta ja yhteenveto
- `traffic-feature.js`: liikennetiedotteiden haku, karttatasot ja käyttöliittymä
- `traffic.js`: liikennetiedotteiden normalisointi, voimassaolo, vakavuus ja reittiosumat
- `forecast-bootstrap.js`: rajaa ennustetoiminnon DOM-seurannan merkityksellisiin muutoksiin
- `forecast-feature.js`: tiejaksoennusteiden haku, lähtöaikavalinta, karttatasot ja käyttöliittymä
- `forecast.js`: tiejaksojen reittiosumat, ennusteajan valinta ja lähtöaikojen vertailu
- `risk.js`: testattava riskilaskenta
- `demo-data.js`: paikallinen tiesäädemo
- `tests/`: Node.js-testit
- `favicon.svg`: sovelluksen kuvake
- `CHANGELOG.md`: versiohistoria

Kartta käyttää MapLibre GL JS 5.24.0:aa CDN:stä ja OpenFreeMapin Positron-tyyliä. Kartta-, paikka- ja reittiaineisto perustuu OpenStreetMapiin.

## Data ja lisenssit

- Fintraffic / Digitraffic: CC BY 4.0
- OpenStreetMapin data: ODbL
- OpenFreeMap: MIT
- MapLibre GL JS: BSD-3-Clause
- Nominatim: OpenStreetMap-aineiston hakupalvelu
- OSRM: BSD-2-Clause, reititys OpenStreetMap-aineistolla

Digitraffic-haut käyttävät tunnistetta `AjokeliNyt/MVP 1.4`. Tunniste ei sisällä henkilötietoja.

## Vastuunrajaus

Palvelu havainnollistaa yksittäisten tiesääasemien mittauksia, tiejaksoennusteita ja Digitrafficin liikennetiedotteita. Se ei korvaa Fintrafficin virallisia liikennetiedotteita, Ilmatieteen laitoksen varoituksia, varsinaista navigointipalvelua tai kuljettajan omaa harkintaa. Olosuhteet, ennuste ja liikennetilanne voivat muuttua nopeasti.
