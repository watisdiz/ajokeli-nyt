export const EVENTS = {
  ROUTE_CHANGED: "ajokeli:route-changed",
  TRAFFIC_CHANGED: "ajokeli:traffic-changed",
  FORECAST_CHANGED: "ajokeli:forecast-changed",
  OBSERVATIONS_CHANGED: "ajokeli:observations-changed",
  REQUEST_COMPLETE: "ajokeli:request-complete",
  REQUEST_TIMEOUT: "ajokeli:request-timeout",
  THEME_CHANGED: "ajokeli:theme-changed",
  FILTERS_CHANGED: "ajokeli:filters-changed",
};

export function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
