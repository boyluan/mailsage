/**
 * MailSage Code Explainer — Benchmark V2
 * Complete workflow integration tests
 *
 * Uses local, simulated email API responses only.
 * No Gmail access, credentials, or external services.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  processInbox,
  BenchmarkError,
} from "../answer-key/reference-inbox-processing.mjs";

// Helpers for creating simulated data.
function refs(...ids) {
  return ids.map((id) => ({ id }));
}

function message(id, timestampMs, labelIds = ["INBOX"]) {
  return { id, timestampMs, labelIds };
}

function singlePage(ids) {
  return async ({ pageToken, pageSize }) => {
    assert.equal(pageToken, null);
    assert.equal(pageSize, 20);
    return { messages: refs(...ids), nextPageToken: null };
  };
}

function hasCode(expected) {
  return (error) =>
    error instanceof BenchmarkError && error.code === expected;
}

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const nextTurn = () =>
  new Promise((resolve) => setImmediate(resolve));

// TEST 1 — Full pipeline, with a retrieval failure.
test("combines pagination, deduplication, filtering, sorting and limiting", async () => {
  const pageCalls = [];
  const detailCalls = [];

  const details = {
    "m-101": message("m-101", 200),
    "m-103": message("m-103", 400),
    "m-104": message("m-104", 99),
  };

  const result = await processInbox({
    listInboxPage: async ({ pageToken, pageSize }) => {
      pageCalls.push({ pageToken, pageSize });
      if (pageToken === null) {
        return {
          messages: refs("m-101", "m-102", "m-101"),
          nextPageToken: "next",
        };
      }
      assert.equal(pageToken, "next");
      return {
        messages: refs("m-103", "m-104"),
        nextPageToken: null,
      };
    },
    getMessageDetail: async (id) => {
      detailCalls.push(id);
      if (id === "m-102") throw new Error("Synthetic failure");
      return details[id];
    },
    cutoffMs: 100,
    limit: 1,
    maxConcurrent: 3,
  });

  assert.deepEqual(pageCalls, [
    { pageToken: null, pageSize: 20 },
    { pageToken: "next", pageSize: 20 },
  ]);
  assert.deepEqual([...detailCalls].sort(), [
    "m-101", "m-102", "m-103", "m-104",
  ]);
  assert.deepEqual(result, {
    status: "partial",
    messages: [details["m-103"]],
    failures: [{ id: "m-102", code: "FETCH_FAILED" }],
  });
});

// TEST 2 — Stable order when timestamps tie, without mutation.
test("sorts newest first and keeps equal timestamps in reference order", async () => {
  const originalRefs = Object.freeze(
    ["A", "B", "C", "D"].map((id) => Object.freeze({ id }))
  );
  const details = Object.fromEntries(
    [
      ["A", 300], ["B", 500], ["C", 500], ["D", 100],
    ].map(([id, timestampMs]) => [
      id,
      Object.freeze({
        id,
        timestampMs,
        labelIds: Object.freeze(["INBOX"]),
        subject: `Message ${id}`,
      }),
    ])
  );

  const result = await processInbox({
    listInboxPage: async () => ({
      messages: originalRefs,
      nextPageToken: null,
    }),
    getMessageDetail: async (id) => details[id],
    cutoffMs: 0,
  });

  assert.equal(result.status, "complete");
  assert.deepEqual(result.failures, []);
  assert.deepEqual(
    result.messages.map((item) => item.id),
    ["B", "C", "A", "D"]
  );
  assert.strictEqual(result.messages[0], details.B);
  assert.strictEqual(result.messages[1], details.C);
  assert.equal(originalRefs.length, 4);
  assert.deepEqual(Object.keys(result).sort(), [
    "failures", "messages", "status",
  ]);
});

// TEST 3 — Default limit of 50 after fetching every unique reference.
test("defaults to 50 results but processes all 52 references", async () => {
  const allIds = Array.from({ length: 52 }, (_, i) => `m${i}`);
  const detailCalls = [];
  const requestedPageSizes = [];

  const result = await processInbox({
    listInboxPage: async ({ pageToken, pageSize }) => {
      requestedPageSizes.push(pageSize);
      const start = pageToken === null ? 0 : Number(pageToken);
      const end = Math.min(start + 20, allIds.length);
      return {
        messages: allIds.slice(start, end).map((id) => ({ id })),
        nextPageToken: end === allIds.length ? null : String(end),
      };
    },
    getMessageDetail: async (id) => {
      detailCalls.push(id);
      return message(id, Number(id.slice(1)));
    },
    cutoffMs: 0,
  });

  assert.deepEqual(requestedPageSizes, [20, 20, 20]);
  assert.equal(detailCalls.length, 52);
  assert.equal(result.messages.length, 50);
  assert.equal(result.messages[0].id, "m51");
  assert.equal(result.messages.at(-1).id, "m2");
  assert.equal(result.status, "complete");
  assert.deepEqual(result.failures, []);
});

// TEST 4 — Empty inbox is a successful result.
test("returns complete with empty arrays for a genuinely empty inbox", async () => {
  let detailCalls = 0;
  const result = await processInbox({
    listInboxPage: singlePage([]),
    getMessageDetail: async () => {
      detailCalls++;
      throw new Error("Must not be called");
    },
    cutoffMs: 0,
  });

  assert.deepEqual(result, {
    status: "complete",
    messages: [],
    failures: [],
  });
  assert.equal(detailCalls, 0);
});

// TEST 5 — No eligible messages is not a failure.
test("returns complete when all retrieved messages are ineligible", async () => {
  const details = {
    A: message("A", 200, ["TRASH"]),
    B: message("B", 99),
    C: message("C", 300, ["SENT"]),
  };

  const result = await processInbox({
    listInboxPage: singlePage(["A", "B", "C"]),
    getMessageDetail: async (id) => details[id],
    cutoffMs: 100,
  });

  assert.deepEqual(result, {
    status: "complete",
    messages: [],
    failures: [],
  });
});

// TEST 6 — All detail failures are reported as partial.
test("reports partial with all failure entries when every detail request fails", async () => {
  const result = await processInbox({
    listInboxPage: singlePage(["A", "B", "C"]),
    getMessageDetail: async () => {
      throw new Error("Simulated unavailable message");
    },
    cutoffMs: 0,
  });

  assert.deepEqual(result, {
    status: "partial",
    messages: [],
    failures: [
      { id: "A", code: "FETCH_FAILED" },
      { id: "B", code: "FETCH_FAILED" },
      { id: "C", code: "FETCH_FAILED" },
    ],
  });
});

// TEST 7 — Malformed successful responses are recoverable failures.
test("records INVALID_DETAIL without discarding valid messages", async () => {
  const details = {
    A: message("A", 200),
    B: message("wrong-id", 300),
    C: { id: "C", timestampMs: 400, labelIds: "INBOX" },
  };

  const result = await processInbox({
    listInboxPage: singlePage(["A", "B", "C"]),
    getMessageDetail: async (id) => details[id],
    cutoffMs: 0,
  });

  assert.deepEqual(result, {
    status: "partial",
    messages: [details.A],
    failures: [
      { id: "B", code: "INVALID_DETAIL" },
      { id: "C", code: "INVALID_DETAIL" },
    ],
  });
});

// TEST 8 — Limit zero still processes every reference and keeps failures.
test("limit zero retains failures and still requests every detail", async () => {
  const seen = [];

  const result = await processInbox({
    listInboxPage: singlePage(["A", "B", "C"]),
    getMessageDetail: async (id) => {
      seen.push(id);
      if (id === "B") throw new Error("Synthetic failure");
      return message(id, 200);
    },
    cutoffMs: 0,
    limit: 0,
  });

  assert.deepEqual(seen, ["A", "B", "C"]);
  assert.deepEqual(result, {
    status: "partial",
    messages: [],
    failures: [{ id: "B", code: "FETCH_FAILED" }],
  });
});

// TEST 9 — Pagination failure must reject, not return empty success.
test("rejects with PAGE_FETCH_FAILED when pagination fails", async () => {
  let detailsStarted = 0;

  await assert.rejects(
    processInbox({
      listInboxPage: async () => {
        throw new Error("Simulated page error");
      },
      getMessageDetail: async () => {
        detailsStarted++;
      },
      cutoffMs: 0,
    }),
    hasCode("PAGE_FETCH_FAILED")
  );

  assert.equal(detailsStarted, 0);
});

// TEST 10 — Invalid pagination response is fatal.
test("rejects malformed pagination responses before fetching details", async () => {
  let detailsStarted = 0;

  await assert.rejects(
    processInbox({
      listInboxPage: async () => ({
        messages: refs("A"),
        // Missing required nextPageToken.
      }),
      getMessageDetail: async () => {
        detailsStarted++;
      },
      cutoffMs: 0,
    }),
    hasCode("INVALID_PAGE_RESPONSE")
  );

  assert.equal(detailsStarted, 0);
});

// TEST 11 — A pagination cycle must terminate the workflow.
test("rejects repeating page tokens with PAGINATION_CYCLE", async () => {
  let detailsStarted = 0;

  await assert.rejects(
    processInbox({
      listInboxPage: async ({ pageToken }) => ({
        messages: refs(pageToken === null ? "A" : "B"),
        nextPageToken: "repeat",
      }),
      getMessageDetail: async () => {
        detailsStarted++;
      },
      cutoffMs: 0,
    }),
    hasCode("PAGINATION_CYCLE")
  );

  assert.equal(detailsStarted, 0);
});

// TEST 12 — Invalid settings must be rejected before any API requests.
test("rejects invalid workflow configuration before starting requests", async () => {
  let pageCalls = 0;
  let detailCalls = 0;
  const listInboxPage = async () => {
    pageCalls++;
    return { messages: [], nextPageToken: null };
  };
  const getMessageDetail = async () => {
    detailCalls++;
    return message("A", 100);
  };

  const valid = { listInboxPage, getMessageDetail, cutoffMs: 0 };
  const invalidCases = [
    null,
    [],
    {},
    { ...valid, listInboxPage: null },
    { ...valid, getMessageDetail: null },
    { ...valid, cutoffMs: undefined },
    { ...valid, cutoffMs: NaN },
    { ...valid, cutoffMs: Infinity },
    { ...valid, cutoffMs: "100" },
    { ...valid, limit: -1 },
    { ...valid, limit: 1.5 },
    { ...valid, maxConcurrent: 0 },
    { ...valid, maxConcurrent: 2.5 },
  ];

  for (const config of invalidCases) {
    await assert.rejects(
      processInbox(config),
      hasCode("INVALID_INPUT")
    );
  }

  assert.equal(pageCalls, 0);
  assert.equal(detailCalls, 0);
});

// TEST 13 — Orchestration forwards the concurrency limit.
test("respects maxConcurrent during the complete workflow", async () => {
  const gates = new Map();
  const started = [];
  let active = 0;
  let peakActive = 0;

  const job = processInbox({
    listInboxPage: singlePage(["A", "B", "C", "D"]),
    getMessageDetail: (id) => {
      started.push(id);
      active++;
      peakActive = Math.max(peakActive, active);
      const gate = deferred();
      gates.set(id, () => {
        active--;
        gate.resolve(message(id, 200));
      });
      return gate.promise;
    },
    cutoffMs: 0,
    maxConcurrent: 2,
  });

  await nextTurn();
  assert.deepEqual(started, ["A", "B"]);

  gates.get("B")();
  await nextTurn();
  assert.deepEqual(started, ["A", "B", "C"]);

  gates.get("C")();
  await nextTurn();
  assert.deepEqual(started, ["A", "B", "C", "D"]);

  gates.get("D")();
  gates.get("A")();

  const result = await job;
  assert.equal(peakActive, 2);
  assert.equal(active, 0);
  assert.deepEqual(result.messages.map((m) => m.id), [
    "A", "B", "C", "D",
  ]);
  assert.equal(result.status, "complete");
  assert.deepEqual(result.failures, []);
});

// TEST 14 — All pages are loaded before requesting any message details.
test("finishes pagination before starting detail retrieval", async () => {
  const trace = [];

  const result = await processInbox({
    listInboxPage: async ({ pageToken }) => {
      trace.push(pageToken === null ? "page:first" : "page:second");
      return pageToken === null
        ? { messages: refs("A"), nextPageToken: "second" }
        : { messages: refs("B"), nextPageToken: null };
    },
    getMessageDetail: async (id) => {
      trace.push(`detail:${id}`);
      return message(id, 100);
    },
    cutoffMs: 0,
  });

  assert.deepEqual(trace, [
    "page:first", "page:second", "detail:A", "detail:B",
  ]);
  assert.equal(result.status, "complete");
});