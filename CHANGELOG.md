# Muutoshistoria

Tähän tiedostoon kirjataan Ajokeli nyt -palvelun käyttäjälle ja ylläpidolle merkittävät muutokset.
Versiot noudattavat semanttista versionumerointia.

## [Unreleased]

Seuraava suunniteltu kokonaisuus on reittihaku ja reitin kelitilanteen yhteenveto.

## [1.1.0] – 2026-07-23

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

## [1.0.1] – 2026-07-23

### Muutettu

- karttatausta vaihdettiin MapLibren demotyylistä OpenFreeMap Positroniin
- kartan lähde- ja lisenssimerkinnät päivitettiin
- README päivitettiin kuvaamaan OpenFreeMap- ja OpenStreetMap-riippuvuuksia

## [1.0.0] – 2026-07-23

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

[Unreleased]: https://github.com/watisdiz/ajokeli-nyt/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/watisdiz/ajokeli-nyt/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/watisdiz/ajokeli-nyt/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/watisdiz/ajokeli-nyt/releases/tag/v1.0.0
