# Backlog

Ideoita ja kesken jääneitä huomioita, jotka nousivat esiin teknisen velan ja
design-uudistuksen aikana (ks. CHANGELOG.md). Ei aikataulutettu — poimi
tästä kun on aika jatkaa.

## Testaus ja laatu

- CI (`.github/workflows/pages.yml`) ajaa vain `npm test`. Nyt kun
  Prettier on ajettu koko koodikannalle, myös `npm run lint` ja
  `npm run format:check` voidaan lisätä workflow'hun ilman että se
  hajoaa heti — aiemmin `format:check` olisi kaatunut.
- Mobiilitestaus (vaalea teema, teemakytkin, mikro-interaktiot) tehtiin
  selaimen automaatiolla ~700 px leveydellä sekä 420 px:n hienosäätö-
  sääntöjen kohdennetulla CSS-injektiolla — kehitysympäristön ikkuna ei
  mennyt fyysisesti kapeammaksi kuin ~650 px. Ei löytynyt layout-ongelmia,
  mutta ei ole vahvistettu oikealla puhelimella.

## Muuta

- Kelikamerakuva epäonnistui kerran manuaalisessa selaintestissä (ei
  toistettu / ei varmistettu onko toistuva Digitrafficin CDN-ongelma vai
  yksittäisen kameran vika). `dom-utils.js`:n `bindImageFallback` piilottaa
  kameran kortin siististi jos kuva ei lataudu, joten tämä on vain
  seurattava asia, ei koodivirhe.
