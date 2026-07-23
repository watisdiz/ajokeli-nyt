# Muutoshistoria

Tähän tiedostoon kirjataan Ajokeli nyt -palvelun käyttäjälle ja ylläpidolle merkittävät muutokset.
Versiot noudattavat semanttista versionumerointia.

## Unreleased

Ei vielä julkaisemattomia muutoksia.

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
