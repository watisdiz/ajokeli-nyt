# Muutoshistoria

Tähän tiedostoon kirjataan Ajokeli nyt -palvelun käyttäjälle ja ylläpidolle merkittävät muutokset.
Versiot noudattavat semanttista versionumerointia.

## Unreleased

### Lisätty

- jaetut `dom-utils.js` (escapeHtml, kuvan varavaraus) ja `api-client.js` (Digitraffic-haku) -moduulit
- `events.js`: sovelluksen sisäinen tapahtumaväylä (`ajokeli:route-changed`, `traffic-changed`, `forecast-changed`, `observations-changed`) ominaisuuksien väliseen tiedonkulkuun
- jaettu `station-detail.js`-moduuli tiesääaseman tietopaneelille
- vaalea teema (`prefers-color-scheme`) ja manuaalinen teemakytkin (`theme-init.js`, `theme-toggle.js`), tallentuu selaimeen
- SRI-tarkisteet ja Content-Security-Policy sivun `<head>`:iin
- jsdom-pohjainen testiharnessi (`tests/dom-harness.mjs`) ja kaksi käyttäytymistestiä: reitin rakentaminen päästä päähän ja tiesääaseman haku/valinta
- sisällön ilmestymisanimaatio, pehmeät hover/focus-siirtymät ja latautumispulssi tilamerkinnöille

### Muutettu

- kaikki JS:ään injektoitu `<style>`-sisältö siirretty `styles.css`:ään; token-järjestelmä laajennettu spacing- ja typografia-skaalalla
- MutationObserver-pohjainen ominaisuuksien välinen synkronointi (route-, traffic-, forecast- ja beta-feature) korvattu selkeällä tapahtumaväylällä; poistettu MapLibre-lähteen sisäinen kaivelu ja `forecast-bootstrap.js`:n MutationObserver-monkeypatch
- tiesääaseman tietopaneeli uudistettu: keliriski on nyt värillinen banneri jossa tärkein syy näkyy heti, mittaukset jaettu pisteytykseen vaikuttaviin ja pelkästään informatiivisiin
- sama riskibanneri-hierarkia (väritetty banneri + tärkein syy heti näkyvissä) vietiin myös reittiyhteenvetoon, liikennetilanteeseen ja keliennusteeseen; pienet pillimäiset tilamerkinnät korvattiin täysleveillä bannereilla
- `tests/ui-smoke.test.mjs` nimetty uudelleen `tests/source-shape.test.mjs`:ksi rehellisemmin kuvaamaan mitä se testaa (lähdekoodin merkkijonoja, ei käytöstä)

### Korjattu

- liikennetilanne (tietyöt ja liikennetiedotteet) korjattu — Digitraffic ei enää hyväksy `includeAreaGeometry`-parametria, joten liikennetiedot eivät hiljalleen kaatuneet virheeseen
- route-feature.js:n asematiedoista puuttunut "Tuulen keskinopeus" -rivi (jäänyt jälkeen app-core.js:n vastaavasta, korjautui deduplikoinnin sivutuotteena)
- GitHub Actions -workflow ei koskaan asentanut riippuvuuksia ennen testien ajoa
- useita väriyhdistelmiä jotka olisivat rikkoutuneet vaaleassa teemassa (yläpalkin ja alatunnisteen kiinteä tumma tausta, sinisen painikkeen teksti, useiden pastellivärimerkintöjen kontrasti)

### Poistettu

- vanhentuneet, jo eriytyneet per-tiedosto `USER_HEADER`-versiomerkinnät (versio tulee nyt yhdestä paikasta)
- kaksi inline `onerror`-tapahtumakäsittelijää (korvattu `addEventListener`:llä, jotta CSP:n `script-src` voi olla tiukka)

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
