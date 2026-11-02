/**
 * MailSage Code Explainer — Benchmark V2
 * Correct reference implementation
 *
 * This file is part of the private evaluation answer key.
 * Do not provide it to models during blind evaluations.
 *
 * No Gmail connection or production application access.
 */

export class BenchmarkError extends Error {
    constructor(code, message) {
      super(message);
      this.name = "BenchmarkError";
      this.code = code;
    }
  }

  /**
   * Section 1 — Pagination
   *
   * Retrieve every available page of message references.
   * Preserve retrieval order and duplicate references.
   */
  export async function collectAllReferences(listInboxPage) {
    if (typeof listInboxPage !== "function") {
      throw new BenchmarkError(
        "INVALID_INPUT",
        "listInboxPage must be a function."
      );
    }

    const references = [];
    const visitedTokens = new Set();

    let pageToken = null;

    while (true) {
      if (visitedTokens.has(pageToken)) {
        throw new BenchmarkError(
          "PAGINATION_CYCLE",
          "Pagination attempted to revisit a page token."
        );
      }

      visitedTokens.add(pageToken);

      let response;

      try {
        response = await listInboxPage({
          pageToken,
          pageSize: 20,
        });
      } catch {
        throw new BenchmarkError(
          "PAGE_FETCH_FAILED",
          "An inbox page could not be retrieved."
        );
      }

      if (
        response === null ||
        typeof response !== "object" ||
        Array.isArray(response) ||
        !Array.isArray(response.messages) ||
        (
          response.nextPageToken !== null &&
          (
            typeof response.nextPageToken !== "string" ||
            response.nextPageToken.length === 0
          )
        )
      ) {
        throw new BenchmarkError(
          "INVALID_PAGE_RESPONSE",
          "The inbox page response is invalid."
        );
      }

      for (const reference of response.messages) {
        if (
          reference === null ||
          typeof reference !== "object" ||
          Array.isArray(reference) ||
          typeof reference.id !== "string" ||
          reference.id.length === 0
        ) {
          throw new BenchmarkError(
            "INVALID_PAGE_RESPONSE",
            "A page contains an invalid message reference."
          );
        }
      }

      // Preserve duplicates until the deduplication stage.
      references.push(...response.messages);

      if (response.nextPageToken === null) {
        return references;
      }

      if (visitedTokens.has(response.nextPageToken)) {
        throw new BenchmarkError(
          "PAGINATION_CYCLE",
          "The API returned a previously visited page token."
        );
      }

      pageToken = response.nextPageToken;
    }
  }

  /**
   * Section 2 — Deduplication
   *
   * Remove repeated message references by message ID.
   * Keep first occurrences and preserve their original order.
   */
  export function deduplicateReferences(references) {
    if (!Array.isArray(references)) {
      throw new BenchmarkError(
        "INVALID_INPUT",
        "References must be an array."
      );
    }

    for (const reference of references) {
      if (
        reference === null ||
        typeof reference !== "object" ||
        Array.isArray(reference) ||
        typeof reference.id !== "string" ||
        reference.id.length === 0
      ) {
        throw new BenchmarkError(
          "INVALID_INPUT",
          "Every reference must have a non-empty string ID."
        );
      }
    }

    const seenIds = new Set();
    const uniqueReferences = [];

    for (const reference of references) {
      if (seenIds.has(reference.id)) {
        continue;
      }

      seenIds.add(reference.id);
      uniqueReferences.push(reference);
    }

    return uniqueReferences;
  }

  /**
   * Section 3 — Filtering
   *
   * Select eligible inbox messages.
   * Preserve their original relative order.
   * Do not mutate the input or apply a result limit.
   */
  export function filterEligibleMessages(messages, { cutoffMs } = {}) {
    if (
      !Array.isArray(messages) ||
      typeof cutoffMs !== "number" ||
      !Number.isFinite(cutoffMs)
    ) {
      throw new BenchmarkError(
        "INVALID_INPUT",
        "Messages and cutoffMs must be valid."
      );
    }

    for (const message of messages) {
      if (
        message === null ||
        typeof message !== "object" ||
        Array.isArray(message) ||
        typeof message.id !== "string" ||
        message.id.length === 0 ||
        !Array.isArray(message.labelIds) ||
        !message.labelIds.every(
          (label) => typeof label === "string"
        ) ||
        typeof message.timestampMs !== "number" ||
        !Number.isFinite(message.timestampMs)
      ) {
        throw new BenchmarkError(
          "INVALID_INPUT",
          "A message contains invalid required fields."
        );
      }
    }

    return messages.filter((message) => {
      const isInbox = message.labelIds.includes("INBOX");
      const isTrash = message.labelIds.includes("TRASH");
      const meetsCutoff = message.timestampMs >= cutoffMs;

      return isInbox && !isTrash && meetsCutoff;
    });
  }

  /**
   * Section 4 — Concurrent message-detail retrieval
   *
   * Retrieve multiple messages without exceeding maxConcurrent.
   * Preserve successful messages and record individual failures.
   * Return messages and failures in original reference order.
   */
  export async function loadMessageDetails(references, options = {}) {
    if (
      !Array.isArray(references) ||
      options === null ||
      typeof options !== "object" ||
      Array.isArray(options)
    ) {
      throw new BenchmarkError(
        "INVALID_INPUT",
        "References and options must be valid."
      );
    }

    const {
      getMessageDetail,
      maxConcurrent = 3,
    } = options;

    if (
      typeof getMessageDetail !== "function" ||
      !Number.isInteger(maxConcurrent) ||
      maxConcurrent < 1
    ) {
      throw new BenchmarkError(
        "INVALID_INPUT",
        "getMessageDetail and maxConcurrent must be valid."
      );
    }

    const seenIds = new Set();

    for (const reference of references) {
      if (
        reference === null ||
        typeof reference !== "object" ||
        Array.isArray(reference) ||
        typeof reference.id !== "string" ||
        reference.id.length === 0 ||
        seenIds.has(reference.id)
      ) {
        throw new BenchmarkError(
          "INVALID_INPUT",
          "References must contain unique, valid IDs."
        );
      }

      seenIds.add(reference.id);
    }

    if (references.length === 0) {
      return { messages: [], failures: [] };
    }

    const outcomes = new Array(references.length);
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < references.length) {
        const index = nextIndex;
        nextIndex += 1;

        const id = references[index].id;

        try {
          const detail = await getMessageDetail(id);

          const valid =
            detail !== null &&
            typeof detail === "object" &&
            !Array.isArray(detail) &&
            detail.id === id &&
            Array.isArray(detail.labelIds) &&
            detail.labelIds.every(
              (label) => typeof label === "string"
            ) &&
            typeof detail.timestampMs === "number" &&
            Number.isFinite(detail.timestampMs);

          if (valid) {
            outcomes[index] = { message: detail };
          } else {
            outcomes[index] = {
              failure: { id, code: "INVALID_DETAIL" },
            };
          }
        } catch {
          outcomes[index] = {
            failure: { id, code: "FETCH_FAILED" },
          };
        }
      }
    }

    const workerCount = Math.min(
      maxConcurrent,
      references.length
    );

    await Promise.all(
      Array.from({ length: workerCount }, () => worker())
    );

    const messages = [];
    const failures = [];

    for (const outcome of outcomes) {
      if (outcome.message) {
        messages.push(outcome.message);
      } else {
        failures.push(outcome.failure);
      }
    }

    return { messages, failures };
  }

  /**
   * Section 6 — Final workflow orchestration
   *
   * Combine all processing stages into one workflow.
   * Sort eligible messages newest first.
   * Preserve detail-retrieval failures regardless of final limit.
   */
  export async function processInbox(config = {}) {
    if (
      config === null ||
      typeof config !== "object" ||
      Array.isArray(config)
    ) {
      throw new BenchmarkError(
        "INVALID_INPUT",
        "Workflow configuration must be an object."
      );
    }

    const {
      listInboxPage,
      getMessageDetail,
      cutoffMs,
      limit = 50,
      maxConcurrent = 3,
    } = config;

    // Validate all arguments before performing any requests.
    if (
      typeof listInboxPage !== "function" ||
      typeof getMessageDetail !== "function" ||
      typeof cutoffMs !== "number" ||
      !Number.isFinite(cutoffMs) ||
      !Number.isInteger(limit) ||
      limit < 0 ||
      !Number.isInteger(maxConcurrent) ||
      maxConcurrent < 1
    ) {
      throw new BenchmarkError(
        "INVALID_INPUT",
        "Invalid inbox-processing configuration."
      );
    }

    // Step 1 — Pagination.
    const references = await collectAllReferences(listInboxPage);

    // Step 2 — Deduplication.
    const uniqueReferences = deduplicateReferences(references);

    // Step 3 — Concurrent message-detail retrieval.
    const { messages, failures } = await loadMessageDetails(
      uniqueReferences,
      { getMessageDetail, maxConcurrent }
    );

    // Step 4 — Filtering.
    const eligible = filterEligibleMessages(messages, {
      cutoffMs,
    });

    // Step 5 — Sort newest first.
    // Original reference order resolves equal timestamps.
    const sorted = eligible
      .map((message, index) => ({ message, index }))
      .sort((a, b) => {
        if (a.message.timestampMs > b.message.timestampMs) {
          return -1;
        }

        if (a.message.timestampMs < b.message.timestampMs) {
          return 1;
        }

        return a.index - b.index;
      })
      .map(({ message }) => message);

    // Step 6 — Apply the limit only after full processing.
    const finalMessages = sorted.slice(0, limit);

    // Step 7 — Report complete or partial processing.
    return {
      status: failures.length > 0 ? "partial" : "complete",
      messages: finalMessages,
      failures,
    };
  }