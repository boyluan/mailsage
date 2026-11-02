/**
 * MailSage Code Explainer — Benchmark V2
 * Filtering reference tests
 *
 * Uses Node.js's built-in test runner.
 * No Gmail connection or external services.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  filterEligibleMessages,
  BenchmarkError,
} from "../answer-key/reference-inbox-processing.mjs";

// Helper: verify that an error has the expected code.
function hasErrorCode(expectedCode) {
  return (error) =>
    error instanceof BenchmarkError &&
    error.code === expectedCode;
}

// Helper: create a valid synthetic message.
function makeMessage(id, labelIds, timestampMs) {
  return { id, labelIds, timestampMs };
}

// TEST 1 — Recent INBOX messages
test("keeps eligible recent inbox messages", () => {
  const messages = [
    makeMessage("A", ["INBOX"], 200),
    makeMessage("B", ["INBOX", "STARRED"], 300),
  ];

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  assert.deepEqual(result, messages);
});

// TEST 2 — TRASH exclusion
test("excludes messages labelled INBOX and TRASH", () => {
  const messages = [
    makeMessage("A", ["INBOX"], 200),
    makeMessage("B", ["INBOX", "TRASH"], 300),
  ];

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  assert.deepEqual(
    result.map((message) => message.id),
    ["A"]
  );
});

// TEST 3 — Missing INBOX label
test("excludes messages without the INBOX label", () => {
  const messages = [
    makeMessage("A", ["SENT"], 200),
    makeMessage("B", ["STARRED"], 300),
    makeMessage("C", [], 400),
    makeMessage("D", ["INBOX"], 500),
  ];

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  assert.deepEqual(
    result.map((message) => message.id),
    ["D"]
  );
});

// TEST 4 — Inclusive cutoff
test("includes messages exactly at the cutoff", () => {
  const messages = [
    makeMessage("A", ["INBOX"], 100),
    makeMessage("B", ["INBOX"], 101),
  ];

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  assert.deepEqual(
    result.map((message) => message.id),
    ["A", "B"]
  );
});

// TEST 5 — Older messages
test("excludes messages older than the cutoff", () => {
  const messages = [
    makeMessage("A", ["INBOX"], 99),
    makeMessage("B", ["INBOX"], 100),
    makeMessage("C", ["INBOX"], 101),
  ];

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  assert.deepEqual(
    result.map((message) => message.id),
    ["B", "C"]
  );
});

// TEST 6 — Case-sensitive labels
test("treats label identifiers as case-sensitive", () => {
  const messages = [
    makeMessage("A", ["inbox"], 200),
    makeMessage("B", ["INBOX"], 200),
    makeMessage("C", ["INBOX", "TRASH"], 200),
    makeMessage("D", ["INBOX", "trash"], 200),
  ];

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  assert.deepEqual(
    result.map((message) => message.id),
    ["B", "D"]
  );
});

// TEST 7 — Original order and metadata
test("preserves relative order and additional metadata", () => {
  const messages = [
    {
      id: "A",
      labelIds: ["INBOX"],
      timestampMs: 200,
      subject: "First message",
    },
    {
      id: "B",
      labelIds: ["TRASH"],
      timestampMs: 500,
      subject: "Excluded message",
    },
    {
      id: "C",
      labelIds: ["INBOX"],
      timestampMs: 400,
      subject: "Third message",
    },
  ];

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  // Filtering does not sort by timestamp.
  assert.deepEqual(
    result.map((message) => message.id),
    ["A", "C"]
  );

  // Original objects and metadata are preserved.
  assert.strictEqual(result[0], messages[0]);
  assert.strictEqual(result[1], messages[2]);
  assert.equal(result[0].subject, "First message");
  assert.equal(result[1].subject, "Third message");
});

// TEST 8 — Input immutability
test("does not modify the original array or objects", () => {
  const first = Object.freeze({
    id: "A",
    labelIds: Object.freeze(["INBOX"]),
    timestampMs: 200,
  });

  const second = Object.freeze({
    id: "B",
    labelIds: Object.freeze(["TRASH"]),
    timestampMs: 300,
  });

  const messages = Object.freeze([first, second]);

  const result = filterEligibleMessages(messages, {
    cutoffMs: 100,
  });

  assert.deepEqual(result, [first]);
  assert.notStrictEqual(result, messages);
  assert.strictEqual(result[0], first);

  assert.equal(messages.length, 2);
  assert.strictEqual(messages[1], second);
});

// TEST 9 — Empty input
test("returns an empty array for empty input", () => {
  const result = filterEligibleMessages([], {
    cutoffMs: 100,
  });

  assert.deepEqual(result, []);
});

// TEST 10 — Invalid cutoff
test("rejects missing or invalid cutoff values", () => {
  const messages = [
    makeMessage("A", ["INBOX"], 200),
  ];

  const invalidCutoffs = [
    undefined,
    null,
    NaN,
    Infinity,
    -Infinity,
    "100",
  ];

  for (const cutoffMs of invalidCutoffs) {
    assert.throws(
      () => filterEligibleMessages(messages, { cutoffMs }),
      hasErrorCode("INVALID_INPUT")
    );
  }
});

// TEST 11 — Invalid collection
test("rejects message collections that are not arrays", () => {
  const invalidInputs = [
    null,
    undefined,
    "not an array",
    {},
    123,
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => filterEligibleMessages(input, { cutoffMs: 100 }),
      hasErrorCode("INVALID_INPUT")
    );
  }
});

// TEST 12 — Invalid message data
test("rejects malformed messages, including later entries", () => {
  const invalidMessages = [
    null,
    undefined,
    [],
    {},
    { id: "", labelIds: ["INBOX"], timestampMs: 200 },
    { id: 123, labelIds: ["INBOX"], timestampMs: 200 },
    { id: "A", labelIds: "INBOX", timestampMs: 200 },
    { id: "A", labelIds: ["INBOX", 123], timestampMs: 200 },
    { id: "A", labelIds: ["INBOX"], timestampMs: NaN },
    { id: "A", labelIds: ["INBOX"], timestampMs: Infinity },
    { id: "A", labelIds: ["INBOX"], timestampMs: "200" },
  ];

  for (const invalidMessage of invalidMessages) {
    const messages = [
      makeMessage("valid", ["INBOX"], 200),
      invalidMessage,
    ];

    assert.throws(
      () => filterEligibleMessages(messages, { cutoffMs: 100 }),
      hasErrorCode("INVALID_INPUT")
    );
  }
});