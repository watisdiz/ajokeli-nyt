const BUILD_VERSION = "1.7.0";
const asset = (path) => `${path}?v=${BUILD_VERSION}`;

await import(asset("./request-guard.js"));

const OriginalMap = window.maplibregl?.Map;

if (OriginalMap) {
  window.maplibregl.Map = new Proxy(OriginalMap, {
    construct(target, args, newTarget) {
      const instance = Reflect.construct(target, args, newTarget);
      window.__ajokeliMap = instance;
      return instance;
    },
  });
}

await import(asset("./app-core.js"));

if (OriginalMap) {
  window.maplibregl.Map = OriginalMap;
}

await import(asset("./route-feature.js"));
await import(asset("./traffic-feature.js"));
await import(asset("./forecast-bootstrap.js"));
await import(asset("./beta-feature.js"));
await import(asset("./radar-feature.js"));
await import(asset("./radar-ux-hotfix.js"));
await import(asset("./radar-polish.js"));
await import(asset("./unified-map-mode.js"));

const footerText = document.querySelector(".footer p");
if (footerText && !footerText.textContent.includes("Ilmatieteen laitos")) {
  footerText.textContent = `${footerText.textContent.trim()} Sadetutka: Ilmatieteen laitos, CC BY 4.0.`;
}
