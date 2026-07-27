# Backlog

Ideoita ja kesken jääneitä huomioita, jotka nousivat esiin teknisen velan ja
design-uudistuksen aikana (ks. CHANGELOG.md). Ei aikataulutettu — poimi
tästä kun on aika jatkaa.

## Testaus ja laatu

- Mobiilitestaus (vaalea teema, teemakytkin, mikro-interaktiot) tehtiin
  selaimen automaatiolla ~700 px leveydellä sekä 420 px:n hienosäätö-
  sääntöjen kohdennetulla CSS-injektiolla — kehitysympäristön ikkuna ei
  mennyt fyysisesti kapeammaksi kuin ~650 px. Ei löytynyt layout-ongelmia,
  mutta ei ole vahvistettu oikealla puhelimella. **Tämä on 1.8.0:n suurin
  todentamaton riski** — vaalea teema ja teemakytkin menivät tuotantoon
  ilman testiä fyysisellä laitteella.

## Muuta

- Kelikamerakuva epäonnistui kerran manuaalisessa selaintestissä (ei
  toistettu / ei varmistettu onko toistuva Digitrafficin CDN-ongelma vai
  yksittäisen kameran vika). `dom-utils.js`:n `bindImageFallback` piilottaa
  kameran kortin siististi jos kuva ei lataudu, joten tämä on vain
  seurattava asia, ei koodivirhe.
