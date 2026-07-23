# Ajokeli nyt MVP

Ajokeli nyt näyttää Suomen tiesääasemien ajantasaiset mittaukset kartalla ja laskee niistä läpinäkyvän keliriski-indikaattorin.

Palvelu käyttää Fintrafficin Digitraffic-rajapintoja:

- tiesääasemien sijainnit: `/api/weather/v1/stations`
- uusimmat mittaukset: `/api/weather/v1/stations/data`
- kelikameroiden sijainnit: `/api/weathercam/v1/stations`

## MVP:n ominaisuudet

- Suomen kartta ja kaikki aktiivisesti mittaavat tiesääasemat
- neljä keliluokkaa sekä vanhentuneen/puuttuvan datan luokka
- automaattinen päivitys kerran minuutissa
- suodatus riskiluokan ja aseman nimen perusteella
- hakutulokset listana ja näppäimistökäyttö
- mobiilissa avattava suodatinpaneeli ja suljettava aseman tietopaneeli
- aseman mittaukset ja luokituksen perustelut
- lähin aktiivinen kelikamera enintään 25 km:n etäisyydeltä
- selainpaikannus
- erillinen demo-tila ilman Digitraffic-yhteyttä
- lataus-, virhe- ja uudelleenyritystilat
- automaattiset riskilaskennan ja käyttöliittymän smoke-testit

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

Repossa on valmis GitHub Actions -workflow. Avaa repositorion **Settings → Pages** ja valitse lähteeksi **GitHub Actions**. Jokainen push `main`-haaraan julkaisee sivun.

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
- `app.js`: Digitraffic-integraatio, kartta ja käyttöliittymä
- `risk.js`: testattava riskilaskenta
- `demo-data.js`: paikallinen demo
- `tests/`: Node.js-testit
- `favicon.svg`: sovelluksen kuvake

Kartta käyttää MapLibre GL JS 5.24.0:aa CDN:stä ja OpenFreeMapin Positron-tyyliä. Kartta-aineisto perustuu OpenStreetMapiin.

## Data ja lisenssit

- Fintraffic / Digitraffic: CC BY 4.0
- OpenStreetMapin data: ODbL
- OpenFreeMap: MIT
- MapLibre GL JS: BSD-3-Clause

Sovellus lähettää Digitrafficille tunnisteen `AjokeliNyt/MVP 1.1`. Se ei sisällä henkilötietoja.

## Vastuunrajaus

Palvelu havainnollistaa yksittäisten tiesääasemien mittauksia. Se ei korvaa Fintrafficin virallisia liikennetiedotteita, Ilmatieteen laitoksen varoituksia tai kuljettajan omaa harkintaa. Olosuhteet voivat muuttua nopeasti ja poiketa mittausaseman ympäristöstä.
