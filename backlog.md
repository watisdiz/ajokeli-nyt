# Backlog

Ideoita ja kesken jääneitä huomioita, jotka nousivat esiin tekninen velka
+ design-uudistuksen aikana (ks. CHANGELOG.md). Ei aikataulutettu — poimi
tästä kun on aika jatkaa.

## Testaus ja laatu

- ESLint ja Prettier on nyt asennettu (`npm run lint`, `npm run format`),
  mutta Prettieria ei ole ajettu koko koodikannalle — olemassa oleva koodi
  ei vielä noudata sen oletusmuotoilua. Ajaminen (`npm run format`)
  aiheuttaisi ison, ei-toiminnallisen diffin lähes joka tiedostoon;
  tietoinen päätös jättää tämä myöhemmäksi.
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
