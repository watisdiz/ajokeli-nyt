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
