# Beta-testauksen tarkistuslista

Tämä lista tukee Ajokeli nyt -version 1.6.0 manuaalista päästä päähän -testausta ennen laajempaa jakamista.

## Testireitit

- Vantaa → Tampere
- Helsinki → Turku
- Oulu → Rovaniemi
- lyhyt paikallinen reitti, esimerkiksi Tikkurila → Helsinki

## Tarkistukset jokaisella reitillä

- lähtöpaikka ja määränpää löytyvät ja ovat oikeat
- reittiviiva näkyy kartalla
- pituus ja arvioitu ajoaika näkyvät
- reitin yhteenveto näyttää havainnot, liikennetilanteen ja ennusteen
- yksityiskohdat voi avata ja sulkea
- tiesääasema, tietyö ja ennustejakso voidaan avata kartalta tai listasta
- lähtöajan vaihtaminen päivittää ennusteen
- Jaa reitti -linkki voidaan kopioida
- jaettu reitti voidaan ladata uudessa yksityisessä selainikkunassa

## Sadetutkan tarkistukset

- Sade nyt -kerros on sivun avautuessa pois päältä
- kerroksen avaaminen näyttää lataustilan ja uusimman havaintoajan
- sadealueet näkyvät kartan päällä mutta reitti ja karttamerkit säilyvät luettavina
- läpinäkyvyyden säädin muuttaa tutkakerrosta
- sateen voimakkuuden selite näkyy
- reittiyhteenveto näyttää sateisen matkan pituuden ja voimakkaimman havainnon
- tutkakerroksen sulkeminen piilottaa karttatason
- kerroksen avaaminen uudelleen hyödyntää tuoretta muistissa olevaa aineistoa
- FMI:n virhe ei estä tiesäätä, ennustetta tai liikennetilannetta

## Näyttökoot

- puhelin noin 360 × 800
- puhelin vaakasuunnassa
- tabletti noin 768 × 1024
- kannettava noin 1366 × 768
- suuri desktop-näyttö

Tarkista erityisesti, ettei sivulle synny vaakasuuntaista vieritystä ja että kartta, paneelit, sadetutkan säädin sekä sulkemispainikkeet ovat käytettävissä.

## Virhetilanteet

Testaa selaimen kehittäjätyökaluilla hidas yhteys ja offline-tila:

- paikkahaun aikakatkaisu näyttää ymmärrettävän virheen
- reitityksen aikakatkaisu ei jätä painikkeita pysyvästi pois käytöstä
- Digitrafficin tiesäävirhe ei kaada karttaa
- liikennetietojen virhe ei estä havaintoja tai ennustetta
- ennusteen virhe ei estä havaintoja tai liikennetilannetta
- FMI:n WFS- tai GeoTIFF-haun virhe jättää muut ominaisuudet käyttöön
- uudelleenyrityspainikkeet toimivat

## Saavutettavuuden perustarkistus

- koko reittihaku onnistuu näppäimistöllä
- fokus näkyy painikkeissa ja kentissä
- Sade nyt -painikkeen painettu tila välittyy `aria-pressed`-attribuutilla
- Escape sulkee hakutulokset ja mobiilipaneelin
- ruudunlukijan tilailmoitukset eivät toistu jatkuvasti
- kosketuskohteet ovat riittävän suuria

## Hyväksymisehto

Beta voidaan jakaa laajemmin, kun:

- kaikki neljä testireittiä toimivat desktopilla ja puhelimella
- sadetutka toimii vähintään yhdellä sateisella ja yhdellä sateettomalla testikerralla
- kriittisiä JavaScript-virheitä ei näy konsolissa
- ulkoisen rajapinnan virheestä pystyy palautumaan ilman sivun uudelleenlatausta
- tietosuojalinkki, palautelinkki, versio ja muutoshistoria ovat näkyvissä
