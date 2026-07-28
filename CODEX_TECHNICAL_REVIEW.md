# Codex technical and product review for Claude Opus

Date: 2026-07-28  
Reviewed revision: `d1202c3` (`main`, version 1.9.4)

## Purpose

This document records an independent, read-only Codex review of Ajokeli nyt. It is intended for
Claude Opus, which created much of the code and project plan, to challenge with implementation
evidence and original design context.

Please do not modify the project while responding. For each finding, state whether you agree,
partly agree or disagree, cite the relevant code or verified behavior, explain the original trade-off
and recommend a priority. The useful outcome is a better shared assessment, not agreement for its
own sake.

## Verified baseline

- The checkout was clean and `main` matched `origin/main` at `d1202c3`.
- `npm.cmd test`: 42/42 tests passed.
- `npm.cmd run lint`: passed with zero warnings.
- `npm.cmd run format:check`: passed.
- `git diff --check`: passed.
- The GitHub repository was public, active and configured to deploy `main` through GitHub Pages.
- The Pages API reported the custom domain `ajokeli.watisdis.com` and `https_enforced: false`.
- On 2026-07-28, `curl -I http://ajokeli.watisdis.com/` returned `200 OK`, not an HTTPS redirect.
- No files were changed during the review.

## Overall assessment

This is a stronger-than-average beta. The static, dependency-light architecture is appropriate for
the current product size. Pure calculation modules are separated from DOM integration, the risk
model is visible to users, error states have received real attention, and the automated quality
gates are useful rather than ceremonial.

The main gap is no longer framework choice. It is confidence in the meaning, freshness and timing of
safety-adjacent data, followed by the reliability limits of public geocoding and routing services.
Version 1.9.4 represents fast iteration, but not yet broad production readiness.

## What is working well

- Vanilla ES modules and no production build pipeline keep the operational surface small.
- `risk.js`, `route.js`, `traffic.js`, `forecast.js` and `beta.js` contain testable logic without DOM
  dependencies.
- MapLibre and OpenFreeMap are sensible open-map choices.
- CSP and SRI show good security intent.
- External API failures degrade independently instead of taking down every feature.
- Route indexing is a practical, measured performance improvement with equivalence tests.
- UI data is generally escaped before being interpolated into HTML.
- Accessibility has been considered through labels, live regions, keyboard behavior, focus handling
  and contrast tests.
- README, changelog, beta checklist and backlog make the development history unusually traceable.

## Findings for review

### F1 — HTTPS is not enforced

Priority proposed by Codex: **P0, before further public distribution**

The custom domain currently serves the application over plain HTTP. A static application is not
protected from a network attacker if its HTML and JavaScript can be modified in transit.

Suggested action:

- enable Cloudflare **Always Use HTTPS** or an equivalent redirect;
- enable HTTPS enforcement for the GitHub Pages custom domain where applicable;
- add HSTS after confirming that HTTPS works for the complete domain scope;
- add a small production check that fails if HTTP no longer redirects permanently to HTTPS.

Questions for Claude:

- Was serving HTTP intentionally accepted for the beta?
- Is HTTPS enforced elsewhere in a way that the direct production request failed to reveal?

### F2 — A stale core measurement can be treated as fresh

Priority proposed by Codex: **P0/P1, correctness before features**

Evidence: `risk.js:22-31` calculates `latestMeasurementTime` from every usable sensor. That single
latest timestamp becomes `ageMs` at `risk.js:210-211`, while the presence of core observations is
checked separately at `risk.js:223-230`.

A read-only reproduction used:

- a one-hour-old `TIE_1` road temperature;
- a current unrelated humidity measurement;
- current evaluation time.

The result was `level: "normal"`, with the current humidity timestamp reported as the station's
latest time. This proves that the code path permits old core data to inherit another sensor's
freshness. It does not prove how frequently the real Digitraffic payload contains diverging sensor
timestamps.

Suggested action:

- evaluate freshness per selected sensor value;
- exclude stale sensors from scoring;
- mark the station stale when no fresh core observation remains;
- retain or display per-metric age where it materially affects interpretation;
- add regression tests for mixed fresh and stale sensor timestamps.

Questions for Claude:

- Does Digitraffic guarantee synchronized sensor timestamps strongly enough to make this impossible
  in real data?
- If so, where is that contract documented and should it still be guarded defensively?

### F3 — Any Digitraffic fetch failure triggers a second request

Priority proposed by Codex: **P1**

Evidence: `api-client.js:5-19` retries without `Digitraffic-User` after every exception. A stubbed
`TimeoutError` produced two calls. With the 12-second guard, a network outage can therefore become
two consecutive guarded attempts rather than one.

Suggested action:

- retry headerless only for the specific browser/CORS failure the fallback was designed for;
- never retry `TimeoutError`, an explicit abort or a clearly offline state;
- add tests covering CORS-like failure, timeout and abort separately.

Question for Claude: was the broad catch intentional because browser CORS failures cannot be
identified reliably, and if so, what total latency was accepted?

### F4 — Every route section uses the departure-time forecast

Priority proposed by Codex: **P1 product correctness**

Evidence: `forecast.js:446-450` calls `selectForecastForTime` for every matched section using the same
`targetTime`. A section reached several hours into a long route is therefore evaluated at departure
time, not at estimated arrival time.

The current UI accurately calls this a forecast for the selected departure time, but a user can
reasonably read the route result as conditions during the journey.

Suggested action:

- derive cumulative travel time along the route from OSRM annotations, or initially approximate it
  from route position and total duration;
- select each section's forecast at its estimated arrival time;
- present the result as an accessible route timeline: location, ETA, condition, reason, data age and
  coverage;
- keep uncertainty and the non-recommendation disclaimer visible.

Questions for Claude:

- Was same-time comparison a deliberate MVP simplification?
- Is there a reason OSRM duration annotations were avoided beyond response size and complexity?

### F5 — A rapid route change can leave old forecast results visible

Priority proposed by Codex: **P1**

Evidence: `forecast-feature.js:182-187` returns immediately when `state.loading` is true. The active
request is not cancelled or tagged with the route it belongs to. If a second route is selected while
the first forecast request is running, the first request can still write its result after `state.route`
has changed.

Suggested action:

- use an `AbortController`, monotonically increasing request generation, or both;
- commit results only when the completed generation still belongs to the active route;
- add an integration test with two route changes and reversed response order.

Question for Claude: is there another UI lock or event sequence that currently makes this race
unreachable?

### F6 — Public Nominatim and OSRM services define the scale ceiling

Priority proposed by Codex: **P1 before wider or commercial use**

`route-feature.js` correctly avoids autocomplete, caches geocoding results for the session and spaces
requests slightly over one second apart. However, the throttle is local to one browser instance.

The Nominatim policy says the absolute one-request-per-second limit applies to the application across
all users, recommends a proxy and caching, and requires the service to be switchable. The current
client-side queue cannot enforce an aggregate limit:

https://operations.osmfoundation.org/policies/nominatim/

The OSRM demo policy restricts the service to reasonable non-commercial use and explicitly provides
no guarantees for uptime, latency or data updates:

https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server

Suggested action:

- keep the current services only for a deliberately small non-commercial beta;
- run a provider comparison before wider launch: Finnish search quality, route quality, EU data
  processing, SLA, rate limits, cost and vendor portability;
- place provider URLs and credentials behind a small edge/BFF boundary;
- use centralized caching, aggregate rate limiting and synthetic availability monitoring;
- avoid self-hosting Nominatim and OSRM until usage, cost or control justifies the operational load.

Questions for Claude:

- What user volume and usage model did the original plan assume?
- Was a provider migration threshold defined?

### F7 — CSP should be an HTTP response header

Priority proposed by Codex: **P2 hardening**

`index.html` has a restrictive CSP meta element, but `privacy.html` does not. Production responses did
not contain a CSP response header. The current `frame-ancestors 'self'` directive is ineffective in a
meta-delivered policy because the CSP specification requires browsers to ignore it there:

https://www.w3.org/TR/CSP/

Suggested action:

- configure CSP consistently as a Cloudflare response header for all HTML pages;
- add `Strict-Transport-Security`, `Referrer-Policy`, `X-Content-Type-Options` and an intentionally
  scoped `Permissions-Policy`;
- retain SRI, or self-host the pinned MapLibre artifacts and narrow external script access further;
- test the deployed headers, not only repository HTML.

### F8 — Bootstrap relies on hidden global side effects

Priority proposed by Codex: **P2 maintainability**

`app.js` proxies the MapLibre constructor to capture the map as `window.__ajokeliMap`, and
`request-guard.js` replaces `window.fetch`. These choices are understandable in an incrementally
extended no-build application, but they make execution order and dependencies implicit.

Suggested action without a framework rewrite:

- create the map explicitly in one bootstrap module;
- export `initialize...` functions from feature modules;
- pass the map, API client and shared stores as parameters;
- replace the global fetch patch with an explicit request client supporting timeout, abort, retry
  policy and request-completion events;
- add JSDoc types plus `checkJs` before considering TypeScript.

Question for Claude: what constraints led to the Proxy instead of returning the map from
`app-core.js`?

### F9 — Weather observations are loaded through two independent paths

Priority proposed by Codex: **P2 efficiency and consistency**

`app-core.js:194-201` and `route-feature.js:531-546` independently fetch station metadata,
measurements and cameras. Their caches and timestamps are separate. This can create duplicate traffic
and slightly different observation snapshots between the national map and route analysis.

Suggested action: introduce one observation repository/store that owns refresh, normalization,
caching and the `OBSERVATIONS_CHANGED` event.

Question for Claude: was duplication retained intentionally to keep route feature independence?

### F10 — Some relevant information is only available through the map

Priority proposed by Codex: **P2 accessibility/product clarity**

- `route-feature.js:740` limits the text list to 10 stations and says the remainder are on the map.
- `traffic-feature.js:285` limits route incidents to eight visible items.
- `forecast.js:482` limits forecast highlights to five.

Prioritization is useful, but a keyboard or screen-reader user needs a non-map route overview for all
material hazards, not necessarily every normal station.

Suggested action:

- provide an expandable, ordered route timeline or complete material-hazard list;
- make coverage and omitted-item counts explicit;
- complete the documented screen-reader and physical-device tests;
- add a small real-browser accessibility check to CI while retaining manual testing.

### F11 — Documentation has already drifted

Priority proposed by Codex: **P3**

- `backlog.md:8` says production is 1.9.1 although the repository and deployment are 1.9.4.
- `CLAUDE.md:80` says there are 38 tests although the current suite contains 42.

Suggested action: update these values and extend the existing version consistency guard where useful.
Avoid turning every prose statement into a brittle source-shape test.

## Proposed development order

### 1. Correctness and transport hardening

1. HTTPS redirect, HSTS and response security headers.
2. Per-sensor freshness and regression tests.
3. Correct timeout/CORS retry classification.
4. Last-request-wins handling for forecast loading.
5. Documentation synchronization.

### 2. Seasonal and user validation

Before adding feature surface, test the service in actual frost, snow, freezing rain and rapidly
changing conditions. Track false-normal outcomes first. Compare the heuristic with official warnings
and Digitraffic forecast classes without treating either as perfect ground truth.

Complete screen-reader and physical iOS/Android testing, and observe 5-10 repeat-route drivers using
the service before departure.

### 3. Improve the core route decision

Build an ETA-aware route weather timeline. The product should answer quickly:

> Where is the worst condition, when will I reach it, why is it classified that way, and how fresh
> and complete is the underlying data?

Add a direct link to official FMI warnings. Keep Ajokeli nyt explicitly separate from an official
warning or navigation service.

### 4. Resolve provider and operational boundaries

Choose a supported geocoding/routing path, introduce a small replaceable BFF if justified, centralize
caching and rate limiting, and add privacy-preserving synthetic monitoring. Any user analytics should
be a separate explicit product and privacy decision.

### 5. Convenience features after evidence

Saved routes, localization and installability are reasonable later. Codex would not prioritize a
service worker now: stale safety-adjacent data and another cache layer are higher risks than the
benefit of an offline shell. If an offline shell is added later, it must never present cached
observations as current.

## What Codex would not do now

- No React rewrite.
- No broad TypeScript/build migration before simpler typing and dependency cleanup.
- No self-hosted Nominatim/OSRM without a demonstrated operational reason.
- No new radar or other heavy national browser-side processing.
- No additional convenience feature ahead of transport security, freshness correctness and winter
  validation.

## Requested response format for Claude Opus

Please respond to each finding `F1`-`F11` using this structure:

1. **Position:** agree / partly agree / disagree.
2. **Evidence:** exact code, API contract, production behavior or test result.
3. **Original rationale:** why the current implementation or plan was chosen.
4. **Risk assessment:** likelihood, impact and affected users.
5. **Recommendation:** keep, change or investigate further.
6. **Verification:** tests or production checks that would establish the answer.
7. **Priority:** P0-P3 and ordering relative to the other findings.

Also identify:

- any factual mistake or missing context in this review;
- any more serious issue the review missed;
- which proposed product step you would change and why;
- the smallest coherent first change set.

Do not implement changes until the user has reviewed both assessments and chosen the next scope.
