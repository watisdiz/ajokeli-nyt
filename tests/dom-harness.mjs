import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

// Loads the real index.html into jsdom (script tags are not executed by
// jsdom unless explicitly told to, so this gives us the real markup without
// triggering the real app.js bootstrap), stubs the browser APIs the feature
// modules assume exist (maplibregl, fetch), and lets a test import the real
// feature modules against that DOM. This is what actually exercises the
// event-bus wiring between modules, not just their source text.

class FakeMap {
  constructor() {
    this._sources = new Map();
    this._layers = new Map();
    globalThis.window.__ajokeliMap = this;
  }

  // Mirrors MapLibre's overloaded on(event, handler) / on(event, layerId,
  // handler). The third argument is unused here but kept to document the
  // signature we are standing in for.
  on(event, layerIdOrHandler, _maybeHandler) {
    if (event === "load") {
      queueMicrotask(() => layerIdOrHandler());
      return this;
    }
    return this;
  }

  once(event, handler) {
    if (event === "load") queueMicrotask(() => handler());
    return this;
  }

  loaded() {
    return true;
  }

  addControl() {
    return this;
  }

  addSource(id, definition) {
    this._sources.set(id, {
      ...definition,
      data: definition.data,
      setData(data) {
        this.data = data;
      },
      serialize() {
        return { data: this.data };
      },
    });
    return this;
  }

  getSource(id) {
    return this._sources.get(id);
  }

  addLayer(definition) {
    this._layers.set(definition.id, definition);
    return this;
  }

  getLayer(id) {
    return this._layers.get(id);
  }

  setLayoutProperty() {}

  getCanvas() {
    return { style: {} };
  }

  getZoom() {
    return 5;
  }

  easeTo() {}

  fitBounds() {}

  resize() {}
}

class FakeMarker {
  setLngLat() {
    return this;
  }
  setPopup() {
    return this;
  }
  addTo() {
    return this;
  }
  remove() {}
}

class FakePopup {
  setLngLat() {
    return this;
  }
  setText() {
    return this;
  }
  setDOMContent() {
    return this;
  }
  addTo() {
    return this;
  }
  remove() {}
}

class FakeLngLatBounds {
  constructor(sw, ne) {
    this.sw = sw;
    this.ne = ne;
  }
  extend() {
    return this;
  }
}

function createMapLibreStub() {
  return {
    Map: FakeMap,
    Marker: FakeMarker,
    Popup: FakePopup,
    NavigationControl: class {},
    AttributionControl: class {},
    LngLatBounds: FakeLngLatBounds,
  };
}

export function createFetchMock(handlers) {
  return async function fetchMock(input) {
    const url = typeof input === "string" ? input : input.url;
    for (const [pattern, handler] of handlers) {
      const matches = typeof pattern === "string" ? url.includes(pattern) : pattern.test(url);
      if (!matches) continue;
      const body = typeof handler === "function" ? handler(url) : handler;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unmocked fetch in test: ${url}`);
  };
}

export async function createHarness({ search = "", fetchHandlers = [] } = {}) {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const dom = new JSDOM(html, {
    url: `http://localhost/${search}`,
    pretendToBeVisual: true,
  });

  const { window } = dom;
  const timers = new Set();
  const realSetTimeout = window.setTimeout.bind(window);
  const realSetInterval = window.setInterval.bind(window);

  window.setTimeout = (...args) => {
    const handle = realSetTimeout(...args);
    timers.add(handle);
    return handle;
  };
  window.setInterval = (...args) => {
    const handle = realSetInterval(...args);
    timers.add(handle);
    return handle;
  };

  // jsdom doesn't implement layout, so it has no scrollIntoView.
  window.Element.prototype.scrollIntoView = () => {};

  globalThis.window = window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
  });
  globalThis.CustomEvent = window.CustomEvent;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Event = window.Event;
  globalThis.maplibregl = createMapLibreStub();
  window.maplibregl = globalThis.maplibregl;
  globalThis.fetch = createFetchMock(fetchHandlers);

  function cleanup() {
    for (const handle of timers) {
      window.clearTimeout(handle);
      window.clearInterval(handle);
    }
    window.close();
  }

  return { window, document: window.document, cleanup };
}

export function waitFor(predicate, { timeout = 2000, interval = 10 } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const result = predicate();
      if (result) {
        resolve(result);
        return;
      }
      if (Date.now() - startedAt >= timeout) {
        reject(new Error("waitFor: condition never became true"));
        return;
      }
      setTimeout(check, interval);
    };
    check();
  });
}

let importCounter = 0;

export function freshImport(path) {
  importCounter += 1;
  return import(`${path}?harness=${importCounter}-${Date.now()}`);
}
