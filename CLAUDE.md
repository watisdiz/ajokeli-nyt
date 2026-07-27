# CLAUDE.md

Ohjeet tämän repon parissa työskentelyyn. Mitä sovellus tekee ja mitä
rajapintoja se käyttää — ks. [README.md](README.md).

## Mikä tämä on teknisesti

Staattinen selainsovellus: vanilla ES-moduuleja, **ei buildia, ei
kehystä, ei bundleria**. Tiedostot tarjoillaan sellaisenaan GitHub
Pagesista. `npm run serve` nostaa paikallisen palvelimen.

Riippuvuudet ovat pelkkiä kehitystyökaluja (ESLint, Prettier, jsdom).
Ainoa ajonaikainen ulkoinen kirjasto on MapLibre GL JS CDN:stä.

Älä ehdota Reactia, TypeScriptiä, Viteä tai ajonaikaisia riippuvuuksia
kysymättä ensin.

## Moduulijako

Kaksi tasoa, ja jako kannattaa säilyttää:

- **`risk.js`, `route.js`, `traffic.js`, `forecast.js`, `beta.js`** —
  puhdasta logiikkaa ilman DOM-riippuvuutta. Tämä on se osa jolle on
  yksikkötestit.
- **`*-feature.js`** — DOM-kytkentä ja käyttöliittymä. Uusi laskenta
  kuuluu logiikkamoduuliin, ei feature-tiedostoon.

Jaetut apurit: `dom-utils.js` (escapeHtml, kuvan varavaraus),
`api-client.js` (Digitraffic-haku), `events.js` (tapahtumaväylä),
`request-guard.js`, `station-detail.js`.

`app.js` on sisääntulopiste. Se lataa moduulit **määrätyssä
järjestyksessä** ja kaappaa MapLibren `Map`-konstruktorin Proxylla
saadakseen karttainstanssin talteen (`window.__ajokeliMap`). Jos muutat
latausjärjestystä, tarkista että kartta on olemassa ennen kuin
feature-moduulit sitä tarvitsevat.

## Rajoitteet joita ei saa rikkoa

**CSP on tiukka** (`index.html`:n `<head>`). Ei inline-skriptejä eikä
inline-tapahtumakäsittelijöitä — `onerror`-attribuutit poistettiin
tarkoituksella, jotta `script-src` pysyy ilman `unsafe-inline`:a. Uusi
ulkoinen isäntä vaatii nimenomaisen lisäyksen CSP-headeriin.

`theme-init.js` on tahallaan tavallinen blokkaava `<script>` (ei
moduuli), jotta tallennettu teema ehtii vaikuttaa ennen ensimmäistä
piirtoa. Sillä on oma ESLint-konfiguraatio (`sourceType: "script"`).

**CDN-resursseilla on SRI-tarkisteet.** MapLibren version vaihto vaatii
uuden `integrity`-hashin sekä CSS- että JS-tagiin.

**Ei analytiikkaa, ei evästeitä, ei taustajärjestelmää.**
`privacy.html` lupaa tämän käyttäjälle.

**Palvelu ei ole virallinen ajokelivaroitus** eikä sääennuste.
Käyttöliittymäteksti ei saa antaa ymmärtää muuta.

## Tyylisäännöt

**Värit vain tokeneina.** `var(--*)` ja `color-mix(in srgb, ...)`,
ei kovakoodattuja `rgba()`-arvoja. Kiinteät värit rikkovat vaalean
teeman — tämä on jouduttu korjaamaan jälkikäteen kertaalleen.

**Ominaisuuksien välinen tiedonkulku `events.js`:n väylän kautta**
(`EVENTS.ROUTE_CHANGED` jne.). Ei MutationObserveria, ei toisen
moduulin DOM:n tai MapLibre-lähteiden kaivelua. Sekin on jo kertaalleen
purettu pois.

**Kaikki käyttäjän tai rajapinnan data `escapeHtml`:n läpi** ennen
`innerHTML`-sijoitusta.

Kieli: käyttöliittymäteksti, README, CHANGELOG ja backlog **suomeksi**.
Commit-viestit ja koodikommentit **englanniksi**.

## Työnkulku

Ennen committia:

```
npm test              # 34 testiä, node:test + jsdom
npm run lint          # ESLint
npm run format:check  # Prettier
```

CI (`.github/workflows/pages.yml`) ajaa kaikki kolme. `npm run lint` on
`--max-warnings=0`, joten varoituskin kaataa buildin: merkitse
tarkoituksella käyttämätön parametri `_`-etuliitteellä.

**Push `main`:iin deployaa tuotantoon** GitHub Pagesiin. Committaaminen
on turvallista, pushaaminen julkaisee.

Päivitä `CHANGELOG.md`:n Unreleased-osio ja `backlog.md` tehdyn työn
mukaisiksi ennen kuin lopetat. Ne ovat se paikka, josta seuraava
istunto löytää jatkokohdan.

## Version nosto koskee kahdeksaa paikkaa

Versionumero on kovakoodattu useaan tiedostoon, ja `app.js`:n
`BUILD_VERSION` toimii välimuistin ohituksena (`?v=`) moduulien
latauksessa. Kaikki on nostettava yhdessä:

1. `package.json` → `version` (`npm version` hoitaa myös lock-tiedoston)
2. `app.js` → `BUILD_VERSION`
3. `beta.js` → `APP_VERSION`
4. `privacy.html` → näkyvä "Beta · versio X" -teksti
5. `request-guard.js` → **kaksi** `?v=` -parametria import-poluissa
6. `CHANGELOG.md` → uusi päivätty osio Unreleasedin tilalle
7. `README.md` → "Nykyinen versio" ja Digitraffic-tunniste
8. `BETA_TESTING.md` → tarkistuslistan johdanto

`tests/beta.test.mjs` lukee odotetun version `package.json`:sta ja
tarkistaa kohdat 2–5 sekä 7–8. Jos jokin jää nostamatta, `npm test` kaatuu — älä
kovakoodaa versionumeroa testiin takaisin.

## Tunnetut sudenkuopat

- **Digitraffic ei enää hyväksy `includeAreaGeometry`-parametria.**
  Sen käyttö kaataa liikennetiedotteiden haun.
- **Raskas selainpuolen datankäsittely on kaatanut sovelluksen.**
  Versio 1.7.0 (sadetutka, FMI:n GeoTIFF-käsittely selaimessa) peruttiin
  suorituskyky- ja vakausongelmien takia. Ole varovainen kaiken kanssa,
  joka käsittelee koko Suomen kattavaa aineistoa selaimessa.
- **`api-client.js` yrittää hakua kahdesti:** ensin
  `Digitraffic-User`-headerin kanssa, ja jos preflight kaatuu, ilman.
  Älä yksinkertaista tätä pois.
