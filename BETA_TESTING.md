# Beta-testauksen tarkistuslista

Tämä lista tukee Ajokeli nyt -version 1.9.4 manuaalista päästä päähän -testausta ennen laajempaa jakamista.

## Tilanne 27.7.2026

Lista on ajettu suurelta osin selainautomaatiolla 360 × 800 -näkymässä.
Kaikki viisi testireittiä menevät läpi, ja 1.9.0:n jälkeen pisin
yhtenäinen jumi Vantaa–Vaasa-reitillä on 237 ms (oli 6,4–8,1 s), eli
pitkien reittien suorituskykyehto täyttyy.

Virhetilanteet on ajettu 28.7.2026 ja kaikki kuusi kohtaa menivät läpi,
mukaan lukien palautuminen ilman sivun uudelleenlatausta.

Ajamatta ovat enää ruudunlukija ja testaus fyysisellä puhelimella —
**hyväksymisehto ei siis vielä täyty näiltä osin.** Yksityiskohtainen
tilanne ja mittaustulokset: [backlog.md](backlog.md).

## Testireitit

- Vantaa → Tampere
- Helsinki → Turku
- Oulu → Rovaniemi
- Vantaa → Vaasa
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

## Pitkien reittien suorituskyky

Tarkista erityisesti reitillä Vantaa → Vaasa ja Oulu → Rovaniemi:

- käyttöliittymä ei jäädy reitin laskennan aikana
- painikkeiden lataustila päivittyy
- karttaa voi käyttää reitin valmistuttua
- reittiyhteenveto avautuu ja sulkeutuu normaalisti
- lähtöajan vaihtaminen ei jumita sivua
- selaimen konsoliin ei tule muistivirheitä tai käsittelemättömiä poikkeuksia

## Näyttökoot

- puhelin noin 360 × 800
- puhelin vaakasuunnassa
- tabletti noin 768 × 1024
- kannettava noin 1366 × 768
- suuri desktop-näyttö

Tarkista erityisesti, ettei sivulle synny vaakasuuntaista vieritystä ja että kartta, paneelit sekä sulkemispainikkeet ovat käytettävissä.

## Virhetilanteet

Testaa selaimen kehittäjätyökaluilla hidas yhteys ja offline-tila:

- paikkahaun aikakatkaisu näyttää ymmärrettävän virheen
- reitityksen aikakatkaisu ei jätä painikkeita pysyvästi pois käytöstä
- Digitrafficin tiesäävirhe ei kaada karttaa
- liikennetietojen virhe ei estä havaintoja tai ennustetta
- ennusteen virhe ei estä havaintoja tai liikennetilannetta
- uudelleenyrityspainikkeet toimivat

## Saavutettavuuden perustarkistus

- koko reittihaku onnistuu näppäimistöllä
- fokus näkyy painikkeissa ja kentissä
- Escape sulkee hakutulokset ja mobiilipaneelin
- ruudunlukijan tilailmoitukset eivät toistu jatkuvasti
- kosketuskohteet ovat riittävän suuria

## Hyväksymisehto

Beta voidaan jakaa laajemmin, kun:

- kaikki viisi testireittiä toimivat desktopilla ja puhelimella
- Vantaa–Vaasa-reitti ei jäädytä käyttöliittymää
- kriittisiä JavaScript-virheitä ei näy konsolissa
- ulkoisen rajapinnan virheestä pystyy palautumaan ilman sivun uudelleenlatausta
- tietosuojalinkki, palautelinkki, versio ja muutoshistoria ovat näkyvissä
