# Muutoshistoria

Tähän tiedostoon kirjataan Ajokeli nyt -palvelun käyttäjälle ja ylläpidolle merkittävät muutokset.
Versiot noudattavat semanttista versionumerointia.

## Unreleased

Ei vielä julkaisemattomia muutoksia.

## 1.7.1 – 2026-07-23

### Poistettu

- sadetutkakerros ja FMI:n GeoTIFF-aineiston selainkäsittely
- sadealueiden canvas-pehmennys ja yhtenäisen sadekartan lisätasot
- kartan **Sade**, **Tieinfot** ja **Asemat** -lisäpalkki
- sadetutkaan liittyvät testit, dokumentaatio ja ulkoiset FMI-pyynnöt

### Korjattu

- pitkät reitit eivät enää käynnistä raskasta koko Suomen tutkakuvan käsittelyä
- Vantaa–Vaasa-tyyppisten reittien käyttöliittymän jäätymisriskiä pienennettiin
- sovellus palautettiin vakaaseen reitti-, tiesää-, ennuste- ja liikennetietonäkymään
- versiokohtainen välimuistin ohitus päivitettiin versioon `1.7.1`

### Huomioitavaa

- sadetutka voidaan arvioida myöhemmin uudelleen vain valmiiksi käsiteltyjen karttatiilien tai erillisen sääpalvelun kautta
- Cloudflare Web Analyticsia tai muuta analytiikkaa ei ole otettu käyttöön

## 1.7.0 – 2026-07-23

### Lisätty

- yhtenäinen sade-, reitti-, tiejakso-, liikenne- ja tiesääasemakartta
- kartan tasovalinnat **Sade**, **Tieinfot** ja **Asemat**
- mobiilin alareunan karttapalkki
- sadealueiden selainpuolen pehmennys ja kartan tummennus

### Huomioitavaa

- versio poistettiin tuotantokäytöstä suorituskyky- ja luotettavuusongelmien vuoksi versiossa 1.7.1

## 1.6.2 – 2026-07-23

### Korjattu

- sadetutkan mobiiliohjain pienennettiin
- sadetutkan tyhjä tila erotettiin lataus- ja virhetilanteista
- näkyvien sadealueiden paikannus lisättiin
- moduulien välimuistin ohitusta vahvistettiin

## 1.6.1 – 2026-07-23

### Korjattu

- sovellusmoduuleihin lisättiin versiokohtainen välimuistin ohitus
- beta-versionumerot yhtenäistettiin
- sadetutkan havainto- ja tyhjätila selkeytettiin

## 1.6.0 – 2026-07-23

### Lisätty

- valinnainen FMI:n sadetutkakerros
- GeoTIFF-aineiston käsittely selaimessa
- sateen voimakkuuden selite ja läpinäkyvyyden säätö
- reitin sadeosuuden arvio

## 1.5.0 – 2026-07-23

### Lisätty

- tiivis reittiyhteenveto nykyiselle ajokelille, liikennetilanteelle ja ennusteelle
- yksityiskohtien avaaminen tarvittaessa
- jaettava reittilinkki
- ulkoisten API-pyyntöjen aikakatkaisut
- näkyvä beta-versio, tietosuojakuvaus ja palautelinkki
- manuaalisen beta-testauksen tarkistuslista

### Muutettu

- tuotantojulkaisu käyttää versiokohtaista moduulien välimuistin ohitusta
- reittiyhteenvedon yksityiskohdat ovat oletuksena tiivistettyinä

## 1.4.0 – 2026-07-23

### Lisätty

- Digitrafficin tiejaksot ja keliennusteet valitulle reitille
- lähtöajan valinta todellisista ennusteajoista
- lähtöaikojen ennustevertailu
- ennustetut tiejaksot kartalle

### Huomioitavaa

- suotuisin vertailuaika on laskennallinen vertailu, ei ajo- tai turvallisuussuositus

## 1.3.0 – 2026-07-23

### Lisätty

- aktiiviset tietyöt ja liikennetiedotteet kartalle
- reittiin osuvien häiriöiden tunnistaminen
- liikennetilanteen yhteenveto ja karttakohteet
- liikennetietojen erillinen virheenkäsittely

## 1.2.0 – 2026-07-23

### Lisätty

- lähtöpaikan ja määränpään haku Suomessa
- ajoreitin laskenta ja reittiviiva kartalle
- reitin pituus ja arvioitu ajoaika
- reitin läheiset tiesääasemat
- reitin vaikein luotettava keliluokka
- merkittävimpien kelihavaintojen yhteenveto

### Huomioitavaa

- reittiyhteenveto perustuu havaintoihin, ei ennusteeseen
- julkiset Nominatim- ja OSRM-palvelut eivät tarjoa palvelutasolupausta

## 1.1.0 – 2026-07-23

### Lisätty

- mobiilin suodatinpaneeli
- suljettava tiesääaseman tietopaneeli
- hakutulokset ja näppäimistönavigointi
- kartan lataus- ja virhetilat
- käyttöliittymän smoke-testit

### Muutettu

- saavutettavuutta ja kosketuskohteita parannettiin
- GitHub Actions suorittaa testit myös pull requesteissa

## 1.0.1 – 2026-07-23

### Muutettu

- karttatausta vaihdettiin OpenFreeMap Positroniin
- kartan lähde- ja lisenssimerkinnät päivitettiin

## 1.0.0 – 2026-07-23

### Lisätty

- ensimmäinen Ajokeli nyt MVP
- Digitrafficin aktiiviset tiesääasemat ja ajantasaiset mittaukset
- keliriski-indikaattori ja riskiluokkien suodatus
- tiesääasemahaku ja lähin kelikamera
- selainpaikannus ja demo-tila
- riskilaskennan automaattiset testit
- GitHub Pages -julkaisu
