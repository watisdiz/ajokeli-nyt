# Muutoshistoria

Tähän tiedostoon kirjataan Ajokeli nyt -palvelun käyttäjälle ja ylläpidolle merkittävät muutokset.
Versiot noudattavat semanttista versionumerointia.

## Unreleased

## 1.9.0 – 2026-07-27

### Korjattu

- **reitin laskenta ei enää jäädytä käyttöliittymää.** Reittiosumien haku vertasi jokaista kohdetta reittiviivan jokaiseen segmenttiin, eli koko Suomen 579 liikennehäiriötä × 3 886 segmenttiä. Vantaa–Vaasa-reitillä pääsäie oli kiinni 6,4–8,1 sekuntia, mikä rikkoi beta-testauksen hyväksymisehdon. Reittisegmentit viedään nyt hilaindeksiin, jolloin jokainen piste mittaa vain lähellä olevat segmentit
- mitattu samalla aineistolla ennen ja jälkeen: liikennetilanne 18 770 ms → 123 ms, tiejaksoennuste 2 076 ms → 719 ms, tiesääasemat 227 ms → 23 ms. Pisin yhtenäinen jumi koko sovelluksessa: Vantaa–Vaasa 8 109 ms → 237 ms, Oulu–Rovaniemi 4 431 ms → 105 ms, Helsinki–Turku 3 353 ms → 87 ms
- lopputulokset ovat muuttumattomat: samat 39 liikennehäiriötä, 35 tiejaksoa ja 51 tiesääasemaa kuin ennen

### Lisätty

- `route.js`: `buildRouteIndex` ja `distanceToRouteKmIndexed`. Indeksin solu on korridorin levyinen, joten haku 3 × 3 -solualueelta löytää varmasti kaikki korridorin sisällä olevat segmentit
- `tests/route.test.mjs`: kaksi vastaavuustestiä, jotka vertaavat indeksoitua polkua tyhjentävään hakuun satunnaistetulla reitillä ja vaativat identtiset tulokset korridorin sisällä — sekä sen, ettei indeksi koskaan aliarvioi etäisyyttä korridorin ulkopuolella

## 1.8.2 – 2026-07-27

### Korjattu

- `index.html` viittasi `theme-init.js`:ään, `styles.css`:ään ja `app.js`:ään ilman `?v=`-parametria, ja GitHub Pages tarjoilee ne `Cache-Control: max-age=14400` (4 h). `app.js`:n `BUILD_VERSION` ei voi ohittaa välimuistia näiden kohdalla, koska se sijaitsee itse yhdessä välimuistiin jääneistä tiedostoista. Seuraus mitattiin 1.8.1:n julkaisussa: selain ajoi 1.8.1:n JavaScriptiä 1.8.0:n tyylitiedoston kanssa, joten vaalean teeman kontrastikorjaus ei tavoittanut käyttäjiä. Kaikilla kolmella on nyt oma `?v=`-parametri

### Lisätty

- `tests/beta.test.mjs` tarkistaa myös `index.html`:n kolme `?v=`-parametria, joten versionoston unohtuminen niistä kaataa testit

### Muutettu

- versionnosto koskee nyt yhdeksää paikkaa kahdeksan sijaan (`CLAUDE.md` päivitetty)

## 1.8.1 – 2026-07-27

### Korjattu

- kartan selite, kartan **Reitti ja suodattimet** -painike ja kartan virheilmoitus jäivät vaaleassa teemassa lukukelvottomiksi: niillä oli kovakoodattu tumma tausta, mutta tekstiväri tuli teematokenista, joten lopputulos oli lähes musta teksti tummalla pohjalla (kontrastit 1.18:1, 1.06:1 ja 1.24:1 — WCAG AA vaatii 4.5:1). Taustat tulevat nyt `color-mix`-tokeneista muun paletin tapaan
- virheilmoituksen punainen sävy ja reunus johdetaan nyt `--extreme`-tokenista kiinteiden `rgba()`-arvojen sijaan

### Lisätty

- `tests/theme.test.mjs`: teemakytkin vaihtaa teeman, pitää painikkeen saavutettavan nimen ajan tasalla ja tallentaa valinnan; lisäksi vahti, joka kaataa testit jos karttakerroksen taustat palaavat kovakoodatuiksi väreiksi
- `tests/dom-harness.mjs` tarjoaa `window.matchMedia`-tynkän, jota jsdom ei toteuta

## 1.8.0 – 2026-07-27

### Lisätty

- jaetut `dom-utils.js` (escapeHtml, kuvan varavaraus) ja `api-client.js` (Digitraffic-haku) -moduulit
- `events.js`: sovelluksen sisäinen tapahtumaväylä (`ajokeli:route-changed`, `traffic-changed`, `forecast-changed`, `observations-changed`) ominaisuuksien väliseen tiedonkulkuun
- jaettu `station-detail.js`-moduuli tiesääaseman tietopaneelille
- vaalea teema (`prefers-color-scheme`) ja manuaalinen teemakytkin (`theme-init.js`, `theme-toggle.js`), tallentuu selaimeen
- SRI-tarkisteet ja Content-Security-Policy sivun `<head>`:iin
- jsdom-pohjainen testiharnessi (`tests/dom-harness.mjs`) ja kaksi käyttäytymistestiä: reitin rakentaminen päästä päähän ja tiesääaseman haku/valinta
- sisällön ilmestymisanimaatio, pehmeät hover/focus-siirtymät ja latautumispulssi tilamerkinnöille
- ESLint (`eslint.config.js`) ja Prettier (`.prettierrc.json`) sekä `npm run lint` / `format` / `format:check` -skriptit
- `.gitattributes` normalisoi kaikki tekstitiedostot LF-rivinvaihtoihin, jotta Windowsilla editointi ei enää tuota koko tiedoston kokoisia näennäismuutoksia diffeihin
- CI ajaa nyt `npm run lint` ja `npm run format:check` testien lisäksi, joten tyyli- ja laatuvirheet estävät julkaisun

### Muutettu

- kaikki JS:ään injektoitu `<style>`-sisältö siirretty `styles.css`:ään; token-järjestelmä laajennettu spacing- ja typografia-skaalalla
- MutationObserver-pohjainen ominaisuuksien välinen synkronointi (route-, traffic-, forecast- ja beta-feature) korvattu selkeällä tapahtumaväylällä; poistettu MapLibre-lähteen sisäinen kaivelu ja `forecast-bootstrap.js`:n MutationObserver-monkeypatch
- tiesääaseman tietopaneeli uudistettu: keliriski on nyt värillinen banneri jossa tärkein syy näkyy heti, mittaukset jaettu pisteytykseen vaikuttaviin ja pelkästään informatiivisiin
- sama riskibanneri-hierarkia (väritetty banneri + tärkein syy heti näkyvissä) vietiin myös reittiyhteenvetoon, liikennetilanteeseen ja keliennusteeseen; pienet pillimäiset tilamerkinnät korvattiin täysleveillä bannereilla
- uusi `--surface-recessed`-token yhtenäistää "upotettujen" korttien (tietyö-/häiriölaskurit, asema- ja tiejaksolistat) taustan, joka oli aiemmin kiinteä `rgba(0, 0, 0, 0.1)` useassa paikassa
- kiinteät `rgba(98, 168, 255, X)` -aksenttivärit (fokusrengas, reittipaneelin korostukset, beta-yhteenveto) korvattu `color-mix(in srgb, var(--accent) X%, transparent)`:lla, joten ne seuraavat nyt vaaleaa/tummaa teemaa oikein
- `tests/ui-smoke.test.mjs` nimetty uudelleen `tests/source-shape.test.mjs`:ksi rehellisemmin kuvaamaan mitä se testaa (lähdekoodin merkkijonoja, ei käytöstä)
- Prettier ajettu koko koodikannalle (`npm run format`), joten `npm run format:check` menee nyt läpi — pelkkää muotoilua, ei toiminnallisia muutoksia
- `npm run lint` ajetaan `--max-warnings=0`:lla: varoitukset eivät enää mene hiljaisesti läpi. Tarkoituksella käyttämättömät funktion parametrit merkitään `_`-etuliitteellä (`argsIgnorePattern`)
- `tests/beta.test.mjs` lukee odotetun versionumeron `package.json`:sta kovakoodatun literaalin sijaan ja tarkistaa että `app.js`, `beta.js`, `privacy.html` ja `request-guard.js` ovat samassa versiossa — versionoston unohtuminen yhdestä paikasta kaataa nyt testit

### Korjattu

- liikennetilanne (tietyöt ja liikennetiedotteet) korjattu — Digitraffic ei enää hyväksy `includeAreaGeometry`-parametria, joten liikennetiedot eivät hiljalleen kaatuneet virheeseen
- route-feature.js:n asematiedoista puuttunut "Tuulen keskinopeus" -rivi (jäänyt jälkeen app-core.js:n vastaavasta, korjautui deduplikoinnin sivutuotteena)
- GitHub Actions -workflow ei koskaan asentanut riippuvuuksia ennen testien ajoa
- useita väriyhdistelmiä jotka olisivat rikkoutuneet vaaleassa teemassa (yläpalkin ja alatunnisteen kiinteä tumma tausta, sinisen painikkeen teksti, useiden pastellivärimerkintöjen kontrasti)
- reittipaneelin lähtö-/määränpääkentiltä puuttunut `role="combobox"` — `aria-expanded` ei ole sallittu pelkällä oletusroolilla varustetulla hakukentällä (axe-core-tarkistuksen löytämä virhe)
- kartan selitelaatikolta (`.map-legend`) puuttunut `role="group"` — `aria-label` ei välity ruudunlukijalle roolittomalla `<div>`:llä (axe-core-tarkistuksen löytämä virhe)

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
