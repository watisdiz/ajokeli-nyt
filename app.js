const BUILD_VERSION = "1.7.1";
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

document.documentElement.dataset.appVersion = BUILD_VERSION;
document.querySelectorAll(".beta-badge").forEach((badge) => {
  badge.textContent = `Beta · v${BUILD_VERSION}`;
});

const overviewVersion = document.querySelector("#beta-route-overview .muted.small");
if (overviewVersion) overviewVersion.textContent = `v${BUILD_VERSION} beta`;
