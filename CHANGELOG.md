# Muutoshistoria

Tähän tiedostoon kirjataan Ajokeli nyt -palvelun käyttäjälle ja ylläpidolle merkittävät muutokset.
Versiot noudattavat semanttista versionumerointia.

## Unreleased

Ei vielä julkaisemattomia muutoksia.

## 1.7.0 – 2026-07-23

### Lisätty

- yhtenäinen sade-, reitti-, tiejakso-, liikenne- ja tiesääasemakartta
- kartan tasovalinnat **Sade**, **Tieinfot** ja **Asemat**
- mobiilin alareunaan kompakti kolmen painikkeen karttapalkki
- pehmeäreunainen ja voimakkaammin erottuva sadevisualisointi
- sade-tilaan kevyt vihertävä kartan tummennus
- automaattinen karttatasojen järjestys, jossa reitti ja liikennetiedot säilyvät sateen päällä

### Muutettu

- tiejaksoennusteet näytetään sadetutkan päällä ja ajoreitti niiden päällä
- tietyöt ja liikenteen häiriöt säilyvät kartan ylimmissä tietotasoissa
- sadetutkan ollessa päällä ilman reittiä näytetään oletuksena vain vaikeat, erittäin vaikeat ja erikseen valittu tiesääasema
- aktiivisella reitillä näytetään reitin läheiset tiesääasemat
- sadetutkan asetuspaneeli avautuu mobiilissa karttapalkin yläpuolelle koko ruudun levyisen laatikon sijaan
- projektin ja selaimeen ladattavien moduulien versio päivitettiin versioon `1.7.0`

### Huomioitavaa

- sadealueiden pehmennys on visuaalinen esitystapa eikä muuta FMI:n alkuperäisiä mittausarvoja tai reitin sadeanalyysiä
- Cloudflare Web Analyticsia tai muuta analytiikkaa ei ole otettu käyttöön

## 1.6.2 – 2026-07-23

### Korjattu

- sadetutkan mobiiliohjain muutettiin kompaktiksi oikean yläkulman valikoksi koko ruudun levyisen laatikon sijaan
- sadetutkan tila kertoo nyt erikseen, jos tutkakuvassa ei ole havaittua sadetta Suomessa tai jos sadetta on muualla mutta ei valitulla reitillä
- näkyvät sadepikselit tunnistetaan muodostetusta tutkakuvasta ja **Näytä sadealueet** siirtää kartan niiden alueelle
- sadetutkan yhteydessä kerrotaan näkyvästi, että kerros näyttää mitattua sadetta eikä pilvipeitettä
- selaimeen ladattavat moduulit saavat uuden versionumeron `1.6.2`, jotta mobiili- ja desktop-näkymät eivät käytä vanhaa välimuistiversiota

### Huomioitavaa

- tavallinen verkkosivu ei voi estää laitteen kuvakaappauksia; mahdollinen kuvakaappausesto tulee selaimesta, sovelluksen sisäisestä selaimesta tai laitteen suojausasetuksesta

## 1.6.1 – 2026-07-23

### Korjattu

- sovellusmoduuleihin lisättiin versiokohtainen välimuistin ohitus, jotta uusi julkaisu ei sekoitu selaimeen jääneisiin vanhoihin JavaScript-tiedostoihin
- beta-versionumerot päivittyvät varmasti samaan versioon koko käyttöliittymässä
- sadetutkan yhteyteen lisättiin selkeä tieto siitä, että kerros näyttää sateen intensiteettiä eikä pilvipeitettä
- aktiiviselle reitille näytetään selkeä `Ei sadetta reitillä` -tila silloin, kun tutkadata latautuu mutta reitillä ei havaita sadetta
- sadetutkan ohjaimeen lisättiin **Näytä koko Suomi** -toiminto, jolla voi tarkistaa muualla Suomessa näkyvät sadealueet

## 1.6.0 – 2026-07-23

### Lisätty

- valinnainen **Sade nyt** -tutkakerros kartalle
- Ilmatieteen laitoksen avoimen datan sadetutkahavaintojen haku WFS-latauspalvelusta
- GeoTIFF-tutka-aineiston muuntaminen selaimessa läpinäkyväksi MapLibre-karttatasoksi
- sateen voimakkuuden selite ja tutkakerroksen läpinäkyvyyden säätö
- automaattinen tutkahavainnon päivitys viiden minuutin välein kerroksen ollessa käytössä
- reittiyhteenvetoon arvio sateisesta matkasta ja voimakkaimmasta reitin sadetutkahavainnosta
- sadetutkan tila tiiviiseen beta-yhteenvetoon
- sadetutkan analyysi- ja integraatiotestit

### Muutettu

- `app.js` käynnistää sadetutkaominaisuuden beta-toimintojen jälkeen
- verkkopyyntöjen suojaus kattaa myös FMI:n WFS- ja GeoTIFF-lataukset
- projektin versio päivitettiin versioon `1.6.0`

### Huomioitavaa

- tutkakerros on oletuksena pois päältä eikä aiheuta pyyntöjä ennen käyttäjän valintaa
- toteutus käyttää FMI:n Download Service -käyttötapaa ja `image/geotiff`-muotoa, ei sovelluskäyttöön rajoitettua WMS-kuvanäkymää
- tutkakuva on havainto eikä sade-ennuste
- Cloudflare Web Analyticsia tai muuta analytiikkaa ei ole otettu käyttöön

## 1.5.0 – 2026-07-23

### Lisätty

- tiivis reittiyhteenveto nykyiselle ajokelille, liikennetilanteelle ja ennusteelle
- yksityiskohtaisten asemien, häiriöiden ja ennustejaksojen avaaminen tarvittaessa
- Jaa reitti -toiminto lähtöpaikalle, määränpäälle ja valitulle ennusteajalle
- jaetun reitin käyttäjän käynnistämä palautus paikkahaun kautta
- Nominatimin, OSRM:n ja Digitrafficin pyyntöjen hallitut aikakatkaisut
- havaintojen, liikennetietojen ja ennusteiden päivitysaikojen yhteenveto
- näkyvä beta- ja versionumeromerkintä
- tietosuojakuvaus ja palautelinkki
- manuaalisen päästä päähän -testauksen tarkistuslista
- jaettavien reittien ja beta-toimintojen automaattiset testit

### Muutettu

- `app.js` käynnistää verkkopyyntöjen suojauksen ennen muita ominaisuuksia
- Digitraffic-tunniste normalisoidaan ajonaikaisesti arvoon `AjokeliNyt/MVP 1.5`
- reittiyhteenvedon yksityiskohdat ovat oletuksena tiivistettyinä
- projektin versio päivitettiin versioon `1.5.0`

### Huomioitavaa

- jaetun linkin avaaminen ei käynnistä paikkahakuja ilman käyttäjän painallusta
- jaetun reitin ensimmäinen paikkahakutulos valitaan, joten käyttäjän tulee tarkistaa paikat
- Cloudflare Web Analyticsia tai muuta analytiikkaa ei ole otettu käyttöön
- julkaistun palvelun neljän reitin selain- ja mobiilitestaus on edelleen tehtävä tarkistuslistan mukaisesti

## 1.4.0 – 2026-07-23

### Lisätty

- Digitrafficin yksinkertaiset tiejaksot ja niiden keliennusteet valitulle reitille
- tiejaksojen tunnistaminen enintään 5 km:n etäisyydeltä reitistä
- lähtöajan valinta todellisten ennusteajankohtien perusteella
- eri lähtöaikojen ennustetun kelitilanteen vertailu
- valitun lähtöajan huonoin ennustettu keliluokka ja olosuhdeperusteet
- ennustetut tiejaksot kartalle keliluokan mukaisilla väreillä
- tiejakson ennusteen lämpötila-, tuuli- ja olosuhdetiedot karttaponnahdusikkunaan
- keliennusteen ja lähtöaikavertailun automaattiset testit

### Muutettu

- `app.js` käynnistää myös tiejaksoennuste- ja lähtöaikatoiminnot
- Digitraffic-haut käyttävät tunnistetta `AjokeliNyt/MVP 1.4`
- README kuvaa ennusterajapinnat, vertailulogiikan ja uuden teknisen rakenteen
- projektin versio päivitettiin versioon `1.4.0`

### Huomioitavaa

- vertailu käyttää Digitrafficin tiejaksokohtaisia keliluokkia eikä nykyisen havaintoindikaattorin pisteytystä
- vertailun suotuisin lähtöaika on laskennallinen ennustevertailu, ei ajo- tai turvallisuussuositus
- ennustetoiminto käsittelee omat virheensä erikseen, joten nykyiset havainnot ja liikennetilanne toimivat edelleen
- keliennustetta ei haeta `?demo=1`-tilassa

## 1.3.0 – 2026-07-23

### Lisätty

- Digitrafficin aktiiviset tietyöt ja liikennetiedotteet kartalle
- reitin kanssa osuvien liikennetiedotteiden tunnistaminen 2 km:n käytävällä
- reittiyhteenvetoon tietöiden, häiriöiden ja vakavien kohteiden määrät
- liikennetiedotteen kuvaus, voimassaoloaika ja etäisyys reitistä
- karttaponnahdusikkuna ja kohteeseen siirtyminen reittiyhteenvedosta
- liikennetiedotteiden erillinen uudelleenyritystoiminto
- liikennetilanteen automaattiset testit

### Muutettu

- `app.js` käynnistää ydinsovelluksen ja reittihaun lisäksi liikennetilanneominaisuuden
- Digitraffic-haut käyttävät tunnistetta `AjokeliNyt/MVP 1.3`
- README kuvaa tietyö- ja liikennetiedoterajapinnat sekä vakavuuden tulkinnan
- projektin versio päivitettiin versioon `1.3.0`

### Huomioitavaa

- tietyön vakavuus luetaan ensisijaisesti Digitrafficin työvaiheen `severity`-arvosta
- liikennetiedotteen vakavuus on sovelluksen tiedotteen tekstistä johtama tulkinta
- liikennetiedot eivät muuta OSRM:n valitsemaa reittiä automaattisesti
- tiesää ja reittiyhteenveto toimivat, vaikka liikennetiedotteiden haku epäonnistuisi

## 1.2.0 – 2026-07-23

### Lisätty

- käyttäjän käynnistämä lähtöpaikan ja määränpään haku Suomessa
- ajoreitin laskenta ja reittiviiva kartalle
- reitin pituus ja arvioitu ajoaika
- reitin läheiset tiesääasemat enintään 8 km:n etäisyydeltä
- reitin vaikein luotettava keliluokka
- merkittävimpien kelihavaintojen yhteenveto
- asemalista ajoreitin mukaisessa järjestyksessä
- mahdollisuus avata aseman tiedot suoraan reittiyhteenvedosta
- reittianalyysin automaattiset testit

### Muutettu

- kartalla näytetään reitin ollessa aktiivinen vain reitin läheiset tiesääasemat
- mobiilin karttapainike avaa nyt reitti- ja suodatinpaneelin
- reittianalyysin Digitraffic-haut käyttävät tunnistetta `AjokeliNyt/MVP 1.2`
- paikkahaut välimuistitetaan istunnon ajaksi ja jonotetaan vähintään sekunnin välein

### Huomioitavaa

- reittiyhteenveto perustuu havaintoihin, ei ennusteeseen
- julkiset Nominatim- ja OSRM-palvelut eivät tarjoa palvelutasolupausta

## 1.1.0 – 2026-07-23

### Lisätty

- mobiilin suodatinpainike, avattava suodatinpaneeli ja tausta
- suljettava tiesääaseman tietopaneeli mobiili- ja tablettinäkymiin
- hakutulokset listana sekä näppäimistönavigointi
- kartan latausilmaisin
- uudelleenyritystoiminto datan ja kartan virhetilanteisiin
- favicon ja sosiaalisen median perusmetatiedot
- käyttöliittymän smoke-testit

### Muutettu

- kosketuspainikkeita, fokusrajauksia ja saavutettavuuden tilailmoituksia parannettiin
- paikannuksen käsittelyä ja käyttäjäpalautetta selkeytettiin
- GitHub Actions suorittaa testit myös pull requesteissa
- tuotantojulkaisu tehdään vasta onnistuneiden testien jälkeen
- Digitraffic-tunniste päivitettiin versioon `AjokeliNyt/MVP 1.1`

### Korjattu

- suodattimet ovat nyt käytettävissä myös mobiililaitteilla
- tiesääaseman tietopaneelin voi sulkea pienillä näytöillä
- kartan ja datan virheet eivät enää jää ilman selkeää palautetta

## 1.0.1 – 2026-07-23

### Muutettu

- karttatausta vaihdettiin MapLibren demotyylistä OpenFreeMap Positroniin
- kartan lähde- ja lisenssimerkinnät päivitettiin
- README päivitettiin kuvaamaan OpenFreeMap- ja OpenStreetMap-riippuvuuksia

## 1.0.0 – 2026-07-23

### Lisätty

- ensimmäinen Ajokeli nyt MVP
- Digitrafficin aktiiviset tiesääasemat ja ajantasaiset mittaukset kartalla
- läpinäkyvä keliriski-indikaattori ja riskiluokkien suodatus
- tiesääasemahaku
- aseman mittaukset ja luokituksen perustelut
- lähin aktiivinen kelikamera enintään 25 kilometrin etäisyydeltä
- selainpaikannus
- automaattinen päivitys kerran minuutissa
- demo-tila ilman Digitraffic-yhteyttä
- riskilaskennan automaattiset testit
- GitHub Pages -julkaisu GitHub Actionsilla
