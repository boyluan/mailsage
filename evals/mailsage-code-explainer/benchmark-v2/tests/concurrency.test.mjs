/**
 * MailSage Code Explainer — Benchmark V2
 * Concurrent detail retrieval reference tests
 *
 * Uses Node.js's built-in test runner and simulated requests.
 * No Gmail connection or external services.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  loadMessageDetails,
  BenchmarkError,
} from "../answer-key/reference-inbox-processing.mjs";

// Helpers used by the tests.
const references = (...ids) => ids.map((id) => ({ id }));

const message = (id, timestampMs = 200) => ({
  id,
  labelIds: ["INBOX"],
  timestampMs,
});

function deferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function hasErrorCode(code) {
  return (error) =>
    error instanceof BenchmarkError &&
    error.code === code;
}

// Allows pending Promise continuations to execute without
// depending on arbitrary real-world network delays.
const nextTurn = () =>
  new Promise((resolve) => setImmediate(resolve));

// TEST 1 — Empty input.
test("returns two empty arrays when references are empty", async () => {
  let calls = 0;

  const result = await loadMessageDetails([], {
    getMessageDetail: async () => {
      calls += 1;
      throw new Error("Should not be called");
    },
  });

  assert.deepEqual(result, {
    messages: [],
    failures: [],
  });

  assert.equal(calls, 0);
});

// TEST 2 — Default concurrency and prompt replenishment.
test("starts three requests by default and fills a free slot", async () => {
  const gates = new Map();
  const started = [];

  const job = loadMessageDetails(references("A", "B", "C", "D"), {
    getMessageDetail: (id) => {
      started.push(id);
      const gate = deferred();
      gates.set(id, gate);
      return gate.promise;
    },
  });

  assert.deepEqual(started, ["A", "B", "C"]);

  gates.get("C").resolve(message("C"));
  await nextTurn();

  assert.deepEqual(started, ["A", "B", "C", "D"]);

  gates.get("D").resolve(message("D"));
  gates.get("B").resolve(message("B"));
  gates.get("A").resolve(message("A"));

  const result = await job;

  assert.deepEqual(
    result.messages.map((item) => item.id),
    ["A", "B", "C", "D"]
  );

  assert.deepEqual(result.failures, []);
});

// TEST 3 — Explicit maximum of two active requests.
test("never exceeds a limit of two and replenishes capacity", async () => {
  const gates = new Map();
  const started = [];

  let active = 0;
  let peakActive = 0;

  const job = loadMessageDetails(references("A", "B", "C", "D"), {
    maxConcurrent: 2,

    getMessageDetail: (id) => {
      started.push(id);
      active += 1;
      peakActive = Math.max(peakActive, active);

      return new Promise((resolve) => {
        gates.set(id, () => {
          active -= 1;
          resolve(message(id));
        });
      });
    },
  });

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

  assert.deepEqual(
    result.messages.map((item) => item.id),
    ["A", "B", "C", "D"]
  );
});

// TEST 4 — Single-request concurrency.
test("runs requests one at a time when maxConcurrent is one", async () => {
  const gates = new Map();
  const started = [];

  const job = loadMessageDetails(references("A", "B", "C"), {
    maxConcurrent: 1,

    getMessageDetail: (id) => {
      started.push(id);
      const gate = deferred();
      gates.set(id, gate);
      return gate.promise;
    },
  });

  assert.deepEqual(started, ["A"]);

  gates.get("A").resolve(message("A"));
  await nextTurn();

  assert.deepEqual(started, ["A", "B"]);

  gates.get("B").resolve(message("B"));
  await nextTurn();

  assert.deepEqual(started, ["A", "B", "C"]);

  gates.get("C").resolve(message("C"));

  assert.equal((await job).messages.length, 3);
});

// TEST 5 — Out-of-order completion must not reorder results.
test("returns successful messages in reference order, not completion order", async () => {
  const gates = new Map();

  const job = loadMessageDetails(references("A", "B", "C"), {
    getMessageDetail: (id) => {
      const gate = deferred();
      gates.set(id, gate);
      return gate.promise;
    },
  });

  gates.get("C").resolve(message("C"));
  gates.get("B").resolve(message("B"));
  gates.get("A").resolve(message("A"));

  const result = await job;

  assert.deepEqual(
    result.messages.map((item) => item.id),
    ["A", "B", "C"]
  );
});

// TEST 6 — Individual rejection is recoverable.
test("preserves successes when another request rejects", async () => {
  const result = await loadMessageDetails(references("A", "B", "C"), {
    getMessageDetail: async (id) => {
      if (id === "B") {
        throw new Error("Synthetic fetch failure");
      }

      return message(id);
    },
  });

  assert.deepEqual(
    result.messages.map((item) => item.id),
    ["A", "C"]
  );

  assert.deepEqual(result.failures, [
    { id: "B", code: "FETCH_FAILED" },
  ]);
});

// TEST 7 — Failures retain reference order.
test("keeps mixed failure entries in original reference order", async () => {
  const gates = new Map();

  const job = loadMessageDetails(references("A", "B", "C", "D"), {
    maxConcurrent: 4,

    getMessageDetail: (id) => {
      const gate = deferred();
      gates.set(id, gate);
      return gate.promise;
    },
  });

  gates.get("D").resolve(message("D"));

  gates.get("C").reject(new Error("Fetch failed"));

  gates.get("B").resolve({
    id: "WRONG",
    labelIds: ["INBOX"],
    timestampMs: 200,
  });

  gates.get("A").reject(new Error("Fetch failed"));

  const result = await job;

  assert.deepEqual(
    result.messages.map((item) => item.id),
    ["D"]
  );

  assert.deepEqual(result.failures, [
    { id: "A", code: "FETCH_FAILED" },
    { id: "B", code: "INVALID_DETAIL" },
    { id: "C", code: "FETCH_FAILED" },
  ]);
});

// TEST 8 — Invalid fulfilled responses.
test("classifies malformed message details as INVALID_DETAIL", async () => {
  const badDetails = {
    A: null,

    B: {
      labelIds: ["INBOX"],
      timestampMs: 200,
    },

    C: {
      id: "wrong",
      labelIds: ["INBOX"],
      timestampMs: 200,
    },

    D: {
      id: "D",
      labelIds: "INBOX",
      timestampMs: 200,
    },

    E: {
      id: "E",
      labelIds: ["INBOX", 123],
      timestampMs: 200,
    },

    F: {
      id: "F",
      labelIds: ["INBOX"],
      timestampMs: NaN,
    },

    G: {
      id: "G",
      labelIds: ["INBOX"],
      timestampMs: "200",
    },
  };

  const result = await loadMessageDetails(
    references(...Object.keys(badDetails)),
    {
      getMessageDetail: async (id) => badDetails[id],
    }
  );

  assert.deepEqual(result.messages, []);

  assert.deepEqual(
    result.failures,
    Object.keys(badDetails).map((id) => ({
      id,
      code: "INVALID_DETAIL",
    }))
  );
});

// TEST 9 — Input immutability and metadata.
test("preserves object identity, metadata and frozen inputs", async () => {
  const first = Object.freeze({ id: "A" });
  const second = Object.freeze({ id: "B" });

  const input = Object.freeze([first, second]);

  const detailA = Object.freeze({
    id: "A",
    labelIds: Object.freeze(["INBOX"]),
    timestampMs: 10,
    subject: "Keep me",
  });

  const detailB = Object.freeze({
    id: "B",
    labelIds: Object.freeze(["TRASH"]),
    timestampMs: 20,
  });

  const result = await loadMessageDetails(input, {
    getMessageDetail: async (id) =>
      id === "A" ? detailA : detailB,
  });

  assert.strictEqual(result.messages[0], detailA);
  assert.strictEqual(result.messages[1], detailB);
  assert.equal(result.messages[0].subject, "Keep me");

  assert.equal(input.length, 2);
  assert.strictEqual(input[0], first);
  assert.deepEqual(result.failures, []);
});

// TEST 10 — No filtering, sorting or limiting.
test("does not filter, sort or limit retrieved messages", async () => {
  const details = {
    A: {
      id: "A",
      labelIds: ["TRASH"],
      timestampMs: 1,
    },

    B: {
      id: "B",
      labelIds: ["INBOX"],
      timestampMs: 999,
    },

    C: {
      id: "C",
      labelIds: ["INBOX"],
      timestampMs: 20,
    },
  };

  const result = await loadMessageDetails(references("A", "B", "C"), {
    getMessageDetail: async (id) => details[id],
  });

  assert.deepEqual(result.messages, [
    details.A,
    details.B,
    details.C,
  ]);
});

// TEST 11 — Invalid arguments before requests.
test("rejects invalid arguments before starting any request", async () => {
  let calls = 0;

  const getter = async (id) => {
    calls += 1;
    return message(id);
  };

  const invalidCases = [
    [null, { getMessageDetail: getter }],

    [references("A"), null],

    [references("A"), { getMessageDetail: null }],

    [references("A"), {
      getMessageDetail: getter,
      maxConcurrent: 0,
    }],

    [references("A"), {
      getMessageDetail: getter,
      maxConcurrent: 1.5,
    }],

    [references("A"), {
      getMessageDetail: getter,
      maxConcurrent: -1,
    }],

    [references("A", "A"), {
      getMessageDetail: getter,
    }],

    [[{ id: "A" }, { id: "" }], {
      getMessageDetail: getter,
    }],

    [[{ id: "A" }, null], {
      getMessageDetail: getter,
    }],
  ];

  for (const [input, options] of invalidCases) {
    await assert.rejects(
      loadMessageDetails(input, options),
      hasErrorCode("INVALID_INPUT")
    );
  }

  assert.equal(calls, 0);
});

// TEST 12 — All failures and no automatic retries.
test("attempts each reference once and records all failures", async () => {
  const attempts = new Map();

  const result = await loadMessageDetails(references("A", "B", "C"), {
    maxConcurrent: 2,

    getMessageDetail: async (id) => {
      attempts.set(id, (attempts.get(id) ?? 0) + 1);
      throw new Error("Simulated failure");
    },
  });

  assert.deepEqual(result.messages, []);

  assert.deepEqual(result.failures, [
    { id: "A", code: "FETCH_FAILED" },
    { id: "B", code: "FETCH_FAILED" },
    { id: "C", code: "FETCH_FAILED" },
  ]);

  assert.deepEqual([...attempts.values()], [1, 1, 1]);
});