await import("./request-guard.js");

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

await import("./app-core.js");

if (OriginalMap) {
  window.maplibregl.Map = OriginalMap;
}

await import("./route-feature.js");
await import("./traffic-feature.js");
await import("./forecast-bootstrap.js");
await import("./beta-feature.js");
