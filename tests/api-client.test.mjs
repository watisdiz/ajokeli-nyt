import assert from "node:assert/strict";
import test from "node:test";

import { digitrafficJson } from "../api-client.js";

// The headerless retry exists for one specific failure: a browser rejecting
// the Digitraffic-User preflight. Retrying anything else doubled the wait --
// with request-guard's 12 s budget, a dead upstream took 24 s to report.
function stubFetch(failWith, { succeedOnRetry = true } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, headers: init?.headers ?? {} });
    if (calls.length === 1) throw failWith;
    if (!succeedOnRetry) throw failWith;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return calls;
}

function timeoutError() {
  const error = new Error("Pyyntö aikakatkaistiin 12 sekunnin jälkeen.");
  error.name = "TimeoutError";
  return error;
}

function abortError() {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

test("a rejected preflight is retried without the custom header", async () => {
  const original = globalThis.fetch;
  const calls = stubFetch(new TypeError("Failed to fetch"));

  try {
    const body = await digitrafficJson("/api/weather/v1/stations");
    assert.deepEqual(body, { ok: true });
    assert.equal(calls.length, 2, "expected exactly one retry");
    assert.ok("Digitraffic-User" in calls[0].headers, "first attempt carries the header");
    assert.ok(!("Digitraffic-User" in calls[1].headers), "retry drops the header");
  } finally {
    globalThis.fetch = original;
  }
});

test("a timeout is not retried", async () => {
  const original = globalThis.fetch;
  const calls = stubFetch(timeoutError());

  try {
    await assert.rejects(() => digitrafficJson("/api/weather/v1/stations"), {
      name: "TimeoutError",
    });
    assert.equal(calls.length, 1, "a timeout must fail after one attempt, not two");
  } finally {
    globalThis.fetch = original;
  }
});

test("an abort is not retried", async () => {
  const original = globalThis.fetch;
  const calls = stubFetch(abortError());

  try {
    await assert.rejects(() => digitrafficJson("/api/weather/v1/stations"), { name: "AbortError" });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = original;
  }
});
