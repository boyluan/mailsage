/**
 * MailSage Code Explainer — Benchmark V2
 * Deduplication reference tests
 *
 * Uses Node.js's built-in test runner.
 * No Gmail connection or external services.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  deduplicateReferences,
  BenchmarkError,
} from "../answer-key/reference-inbox-processing.mjs";

// Helper: verify that an error has the expected code.
function hasErrorCode(expectedCode) {
  return (error) =>
    error instanceof BenchmarkError &&
    error.code === expectedCode;
}

// TEST 1 — Remove repeated IDs
test("removes duplicates and keeps first occurrences", () => {
  const references = [
    { id: "A" },
    { id: "B" },
    { id: "A" },
    { id: "C" },
    { id: "B" },
  ];

  const result = deduplicateReferences(references);

  assert.deepEqual(
    result.map((reference) => reference.id),
    ["A", "B", "C"]
  );

  // The first matching object must be retained.
  assert.strictEqual(result[0], references[0]);
  assert.strictEqual(result[1], references[1]);
  assert.strictEqual(result[2], references[3]);
});

// TEST 2 — Different messages in the same thread
test("keeps different message IDs sharing a thread", () => {
  const references = [
    { id: "m-101", threadId: "thread-1" },
    { id: "m-102", threadId: "thread-1" },
    { id: "m-103", threadId: "thread-2" },
  ];

  const result = deduplicateReferences(references);

  assert.deepEqual(result, references);
  assert.equal(result.length, 3);
});

// TEST 3 — Case-sensitive identifiers
test("treats differently cased IDs as distinct", () => {
  const references = [
    { id: "abc123" },
    { id: "ABC123" },
    { id: "abc123" },
  ];

  const result = deduplicateReferences(references);

  assert.deepEqual(
    result.map((reference) => reference.id),
    ["abc123", "ABC123"]
  );
});

// TEST 4 — Conflicting metadata
test("retains first occurrence when metadata differs", () => {
  const references = [
    { id: "m-101", from: "alice@example.com" },
    { id: "m-101", from: "bob@example.com" },
  ];

  const result = deduplicateReferences(references);

  assert.equal(result.length, 1);
  assert.strictEqual(result[0], references[0]);
});

// TEST 5 — Empty input
test("returns an empty array for empty input", () => {
  const result = deduplicateReferences([]);

  assert.deepEqual(result, []);
});

// TEST 6 — Do not mutate original input
test("does not modify the input array or objects", () => {
  const first = Object.freeze({
    id: "A",
    threadId: "thread-1",
  });

  const duplicate = Object.freeze({
    id: "A",
    threadId: "thread-1",
  });

  const second = Object.freeze({
    id: "B",
    threadId: "thread-2",
  });

  const references = Object.freeze([
    first,
    duplicate,
    second,
  ]);

  const result = deduplicateReferences(references);

  assert.deepEqual(result, [first, second]);

  // The output must be a different array.
  assert.notStrictEqual(result, references);

  // Original objects must be retained, not copied.
  assert.strictEqual(result[0], first);
  assert.strictEqual(result[1], second);

  // The original input remains unchanged.
  assert.equal(references.length, 3);
  assert.strictEqual(references[1], duplicate);
});

// TEST 7 — Invalid collection
test("rejects inputs that are not arrays", () => {
  const invalidInputs = [
    null,
    undefined,
    "not an array",
    {},
    123,
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => deduplicateReferences(input),
      hasErrorCode("INVALID_INPUT")
    );
  }
});

// TEST 8 — Invalid message IDs
test("rejects references with missing or invalid IDs", () => {
  const invalidReferences = [
    null,
    undefined,
    {},
    [],
    { id: "" },
    { id: 123 },
    { id: null },
  ];

  for (const reference of invalidReferences) {
    assert.throws(
      () => deduplicateReferences([reference]),
      hasErrorCode("INVALID_INPUT")
    );
  }
});

// TEST 9 — Validate the entire input
test("rejects a later invalid reference", () => {
  const references = [
    { id: "A" },
    { id: "B" },
    { id: "A" },
    { id: "" },
  ];

  assert.throws(
    () => deduplicateReferences(references),
    hasErrorCode("INVALID_INPUT")
  );

  // The original input must remain unchanged.
  assert.equal(references.length, 4);
  assert.equal(references[3].id, "");
});
