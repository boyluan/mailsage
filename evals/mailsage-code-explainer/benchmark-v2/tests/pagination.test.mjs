/**
 * MailSage Code Explainer — Benchmark V2
 * Pagination reference tests
 *
 * Uses Node.js's built-in test runner.
 * No Gmail connection or external services.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  collectAllReferences,
  BenchmarkError,
} from "../answer-key/reference-inbox-processing.mjs";

// Helper: verify that an error has the expected benchmark code.
function hasErrorCode(expectedCode) {
  return (error) =>
    error instanceof BenchmarkError &&
    error.code === expectedCode;
}

// TEST 1 — Multiple pages
test("retrieves all pages in order with page size 20", async () => {
  const calls = [];

  const listInboxPage = async ({ pageToken, pageSize }) => {
    calls.push({ pageToken, pageSize });

    if (pageToken === null) {
      return {
        messages: [{ id: "A" }, { id: "B" }],
        nextPageToken: "page-2",
      };
    }

    if (pageToken === "page-2") {
      return {
        messages: [{ id: "C" }],
        nextPageToken: null,
      };
    }

    throw new Error("Unexpected page token");
  };

  const result = await collectAllReferences(listInboxPage);

  assert.deepEqual(
    result.map((message) => message.id),
    ["A", "B", "C"]
  );

  assert.deepEqual(calls, [
    { pageToken: null, pageSize: 20 },
    { pageToken: "page-2", pageSize: 20 },
  ]);
});

// TEST 2 — Empty intermediate page
test("continues after an empty page with a next token", async () => {
  const pages = new Map([
    [null, {
      messages: [{ id: "A" }],
      nextPageToken: "page-2",
    }],
    ["page-2", {
      messages: [],
      nextPageToken: "page-3",
    }],
    ["page-3", {
      messages: [{ id: "B" }],
      nextPageToken: null,
    }],
  ]);

  const visited = [];

  const result = await collectAllReferences(
    async ({ pageToken }) => {
      visited.push(pageToken);
      return pages.get(pageToken);
    }
  );

  assert.deepEqual(
    result.map((message) => message.id),
    ["A", "B"]
  );

  assert.deepEqual(visited, [null, "page-2", "page-3"]);
});

// TEST 3 — Preserve duplicate references
test("preserves repeated message IDs across pages", async () => {
  const result = await collectAllReferences(
    async ({ pageToken }) => {
      if (pageToken === null) {
        return {
          messages: [{ id: "A" }, { id: "B" }],
          nextPageToken: "page-2",
        };
      }

      return {
        messages: [{ id: "A" }, { id: "C" }],
        nextPageToken: null,
      };
    }
  );

  assert.deepEqual(
    result.map((message) => message.id),
    ["A", "B", "A", "C"]
  );
});

// TEST 4 — Pagination cycle
test("detects repeated page tokens", async () => {
  await assert.rejects(
    () => collectAllReferences(
      async ({ pageToken }) => {
        if (pageToken === null) {
          return {
            messages: [{ id: "A" }],
            nextPageToken: "page-2",
          };
        }

        return {
          messages: [{ id: "B" }],
          nextPageToken: "page-2",
        };
      }
    ),
    hasErrorCode("PAGINATION_CYCLE")
  );
});

// TEST 5 — Failed page request
test("reports a failed API page request", async () => {
  await assert.rejects(
    () => collectAllReferences(async () => {
      throw new Error("Simulated API failure");
    }),
    hasErrorCode("PAGE_FETCH_FAILED")
  );
});

// TEST 6 — Invalid page response
test("rejects a response missing nextPageToken", async () => {
  await assert.rejects(
    () => collectAllReferences(async () => ({
      messages: [{ id: "A" }],
    })),
    hasErrorCode("INVALID_PAGE_RESPONSE")
  );
});

// TEST 7 — Invalid message reference
test("rejects a page containing an empty message ID", async () => {
  await assert.rejects(
    () => collectAllReferences(async () => ({
      messages: [{ id: "" }],
      nextPageToken: null,
    })),
    hasErrorCode("INVALID_PAGE_RESPONSE")
  );
});

// TEST 8 — Invalid function argument
test("rejects a non-function API argument", async () => {
  await assert.rejects(
    () => collectAllReferences(null),
    hasErrorCode("INVALID_INPUT")
  );
});
