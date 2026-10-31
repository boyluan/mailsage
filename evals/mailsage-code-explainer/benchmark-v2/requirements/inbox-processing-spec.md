# MailSage Code Explainer — Benchmark V2

## Purpose

Define the expected behaviour of a synthetic email-processing system used to evaluate AI code-review accuracy.

The system is a standalone learning fixture. It does not connect to Gmail, access real accounts, or modify the MailSage application.

The implementation will be evaluated against this specification.

## 1. Pagination

### 1.1 Objective

Retrieve all available message references across multiple pages using a simulated email API.

### 1.2 API contract

The simulated API exposes:

`listInboxPage({ pageToken, pageSize })`

The function returns a Promise resolving to an object containing:

- `messages`: An array of message references.
- `nextPageToken`: A string identifying the next page, or `null` when no further pages exist.

Each stored message has its own message identifier. However, a reference to the **same stored message** (and therefore the same ID) may appear on more than one API page.

The requested `pageSize` is 20.

### 1.3 Required behaviour

P1. Begin retrieval with `pageToken: null`.

P2. Request pages sequentially, using the previous response's `nextPageToken`.

P3. Continue requesting pages until `nextPageToken` is `null`.

P4. Combine message references from every successfully retrieved page.

P5. Preserve the order in which references are retrieved during this stage.

P6. Continue pagination when a page contains zero messages but provides a valid next-page token.

P7. Detect repeated page tokens that would cause the retrieval process to revisit a page, and report an error rather than continuing indefinitely.

P8. Do not remove duplicate message references during pagination. Deduplication is a separate processing stage.

P9. If a page request fails, do not silently return the incomplete collection as though retrieval succeeded. Failure recovery will be defined in the error-handling section.

### 1.4 Example

First request:

`pageToken: null`

Response:

- Messages: A, B
- Next page token: `"page-2"`

Second request:

`pageToken: "page-2"`

Response:

- Messages: C
- Next page token: `"page-3"`

Third request:

`pageToken: "page-3"`

Response:

- Messages: none
- Next page token: `"page-4"`

Fourth request:

`pageToken: "page-4"`

Response:

- Messages: D
- Next page token: `null`

Expected aggregated references:

`[A, B, C, D]`

The empty third page must not prematurely terminate pagination.

### 1.5 Acceptance criteria

A pagination implementation passes this section when:

- Every reachable page in a valid, non-cyclic page sequence is retrieved exactly once.
- All returned references are collected in retrieval order.
- Empty intermediate pages do not terminate retrieval.
- Pagination stops when no next-page token exists.
- Repeated page tokens cannot cause an infinite loop.
- Duplicate references are preserved for the later deduplication stage.
- Page-request failures are not incorrectly reported as complete success.

## 2. Deduplication

### 2.1 Objective

Remove repeated **references to the same message** after pagination, retaining exactly one reference for each unique message ID.

Deduplication removes extra entries in the collected references array. It does **not** delete emails from Gmail or from any other mailbox.

### 2.2 Function contract

The system exposes:

`deduplicateReferences(references)`

Input:

- `references`: An array of message reference objects.
- Each reference must contain an `id` property.
- Each `id` must be a non-empty string.
- Other metadata, such as `threadId`, may be present on a reference.

Output:

- A new array containing one reference per unique message ID.
- References remain in their original first-occurrence order.
- The original input array must not be modified.

Message IDs are treated as opaque, case-sensitive identifiers. A thread ID is **not** a message ID: different messages can belong to the same thread.

### 2.3 Required behaviour

D1. Compare references using their `id` property.

D2. Retain the first occurrence of each unique message ID.

D3. Remove subsequent references with an already encountered ID.

D4. Preserve the original order of retained references.

D5. Do not deduplicate by sender, subject, timestamp, thread ID, or object identity.

D6. Treat message IDs as case-sensitive. Do not lowercase, trim, or otherwise transform valid IDs.

D7. Return an empty array when the input array is empty.

D8. Do not mutate the original input array or its reference objects.

D9. Reject invalid input rather than silently treating references with missing, empty, or non-string IDs as duplicates.

D10. Apply deduplication after pagination has collected references from all pages.

### 2.4 Example — Exactly which entries are removed?

Suppose pagination has retrieved five references. Two of those references are repeated appearances of messages already listed earlier. **The example is deliberately about duplicated list entries, not emails from different senders.**

**Input: five references, in the order collected**

```json
[
  { "id": "m-101", "threadId": "t-1" },
  { "id": "m-102", "threadId": "t-1" },
  { "id": "m-101", "threadId": "t-1" },
  { "id": "m-103", "threadId": "t-2" },
  { "id": "m-102", "threadId": "t-1" }
]
```

The function examines the entries **from top to bottom**:

| Input position | Message ID | Decision | Explanation |
|---|---|---|---|
| 1 | `m-101` | **Keep** | First appearance of `m-101`. |
| 2 | `m-102` | **Keep** | First appearance of `m-102`. Although its thread ID is also `t-1`, it is a different message from `m-101`. |
| 3 | `m-101` | **Remove this entry** | `m-101` was already kept at position 1. This is a repeated reference to that same message. |
| 4 | `m-103` | **Keep** | First appearance of `m-103`. |
| 5 | `m-102` | **Remove this entry** | `m-102` was already kept at position 2. This is a repeated reference to that same message. |

**Expected output: only the three retained references**

```json
[
  { "id": "m-101", "threadId": "t-1" },
  { "id": "m-102", "threadId": "t-1" },
  { "id": "m-103", "threadId": "t-2" }
]
```

**Before and after, by input position:**

```text
BEFORE DEDUPLICATION                 AFTER DEDUPLICATION

1. m-101  ── KEEP ────────────────►  1. m-101
2. m-102  ── KEEP ────────────────►  2. m-102
3. m-101  ── REMOVE (same ID as #1)
4. m-103  ── KEEP ────────────────►  3. m-103
5. m-102  ── REMOVE (same ID as #2)

5 input references                  3 output references
2 repeated entries removed         0 messages deleted
```

The entries at **positions 3 and 5** are removed **from the new output array**. The original five-entry input array is left unchanged.

Notice that `m-101` and `m-102` share `threadId: "t-1"`. That does **not** make them duplicates: they are two distinct messages in the same conversation. Only a repeated **message `id`** counts as a duplicate.

If a later reference has the same `id` but conflicting metadata, this function still retains the first occurrence under D2–D3. The conflicting metadata may warrant a separate data-integrity check; it is not evidence that two different messages should share a single message ID.

### 2.5 Acceptance criteria

A deduplication implementation passes when:

- Exactly one reference per unique ID is returned.
- The first occurrence is retained.
- Later entries with an already-seen message ID are omitted from the new output array.
- The original relative order is preserved.
- Different IDs are never merged merely because their metadata or thread IDs match.
- Identical IDs are recognised even across different API pages.
- Valid IDs differing only by letter case remain distinct.
- Empty input produces empty output.
- Invalid references produce an explicit error.
- The original input array and its objects remain unchanged.

## 3. Filtering

### 3.1 Objective

Select messages that satisfy the inbox eligibility rules after pagination, deduplication, and message-detail retrieval.

Filtering operates on full message records, not on the lightweight references returned by pagination.

### 3.2 Function contract

The system exposes:

`filterEligibleMessages(messages, { cutoffMs })`

Input:

- `messages`: An array of fully retrieved message objects.
- Each message contains an `id`, `labelIds`, and `timestampMs`.
- `id`: A non-empty string identifying the message.
- `labelIds`: An array of strings representing its labels.
- `timestampMs`: A finite number representing a timestamp in milliseconds since the Unix epoch.
- `cutoffMs`: A finite number representing the inclusive date cutoff.

A message may contain additional properties such as `isRead`, `threadId`, `subject`, and `from`.

Output:

- A new array containing only eligible messages.
- Messages remain in their original relative order.
- The original input array and message objects must not be modified.

The synthetic fixture uses the label identifiers `INBOX` and `TRASH`. Label matching is case-sensitive.

### 3.3 Required behaviour

F1. Include a message only when `labelIds` contains `INBOX`.

F2. Exclude a message when `labelIds` contains `TRASH`, even if it also contains `INBOX`.

F3. Include a message only when `timestampMs >= cutoffMs`.

F4. Include messages whose timestamp is exactly equal to `cutoffMs`.

F5. Preserve the original relative order of eligible messages.

F6. Do not modify the original messages or their properties.

F7. Return an empty array when no messages qualify.

F8. Return an empty array when the input array is empty.

F9. Do not exclude an otherwise eligible message merely because it is marked as read.

F10. Validate the required message fields and `cutoffMs`. Invalid inputs must produce an explicit error rather than being silently accepted or excluded. The broader error-handling policy will be defined in Section 5.

F11. Do not apply the final result limit during filtering. Limiting and ordering will be defined in Section 6.

F12. Apply filtering after successful message-detail retrieval and before final output ordering and limiting.

### 3.4 Example — Which messages are included?

Suppose the date cutoff is:

`cutoffMs = 1700000000000`

Input:

```json
[
  {
    "id": "m-101",
    "labelIds": ["INBOX"],
    "timestampMs": 1700000000100,
    "isRead": false
  },
  {
    "id": "m-102",
    "labelIds": ["INBOX", "TRASH"],
    "timestampMs": 1700000000200,
    "isRead": false
  },
  {
    "id": "m-103",
    "labelIds": ["INBOX"],
    "timestampMs": 1699999999999,
    "isRead": false
  },
  {
    "id": "m-104",
    "labelIds": ["INBOX"],
    "timestampMs": 1700000000000,
    "isRead": true
  },
  {
    "id": "m-105",
    "labelIds": ["STARRED"],
    "timestampMs": 1700000000300,
    "isRead": false
  }
]
```

The system evaluates each message:

| Message | Decision | Reason |
|---|---|---|
| m-101 | KEEP | In inbox, not in trash, newer than cutoff |
| m-102 | EXCLUDE | Has the TRASH label |
| m-103 | EXCLUDE | Older than the cutoff |
| m-104 | KEEP | Exactly at cutoff; read status does not affect eligibility |
| m-105 | EXCLUDE | Does not have the INBOX label |

Expected output:

```json
[
  {
    "id": "m-101",
    "labelIds": ["INBOX"],
    "timestampMs": 1700000000100,
    "isRead": false
  },
  {
    "id": "m-104",
    "labelIds": ["INBOX"],
    "timestampMs": 1700000000000,
    "isRead": true
  }
]
```

The output contains two eligible messages.

Filtering excludes three messages from the new result array. It does not delete or modify their underlying records.

### 3.5 Acceptance criteria

A filtering implementation passes when:

- Only messages with the INBOX label are included.
- Messages labelled TRASH are excluded.
- The timestamp cutoff is inclusive.
- Messages older than the cutoff are excluded.
- Read and unread messages are treated equally for eligibility.
- Eligible messages retain their original relative order.
- An empty input produces an empty output.
- No eligible messages produces an empty output.
- Required fields and configuration are validated.
- Invalid inputs are not silently treated as valid records.
- The original input remains unchanged.
- No final result limit is applied prematurely.

## 4. Concurrent message-detail processing

### 4.1 Objective

Retrieve full message details for deduplicated message references while allowing multiple requests to run concurrently.

The system must preserve successful results when individual requests fail, respect a concurrency limit, and return results in the original reference order.

### 4.2 Function contract

The system exposes:

`loadMessageDetails(references, { getMessageDetail, maxConcurrent: 3 })`

Input:

- `references`: An array of unique message reference objects, each containing a non-empty string `id`.
- `getMessageDetail(id)`: An asynchronous function that retrieves the full details of a message.
- `maxConcurrent`: A positive integer defining the maximum number of detail requests that may be in progress simultaneously.
- The default concurrency limit is 3.

The preceding deduplication stage is responsible for ensuring that each message ID appears only once.

The simulated detail API:

`getMessageDetail(id)`

Returns a Promise resolving to a message object containing:

- `id`: The requested message identifier.
- `labelIds`: An array of message labels.
- `timestampMs`: A finite numeric timestamp in milliseconds.

Additional fields may be present.

The Promise may reject to simulate a failed API request.

Output:

A Promise resolving to an object containing:

- `messages`: An array of successfully retrieved, valid message objects.
- `failures`: An array describing unsuccessful message-detail retrievals.

Each failure entry contains:

- `id`: The identifier of the message whose retrieval failed.
- `code`: Either `FETCH_FAILED` or `INVALID_DETAIL`.

`FETCH_FAILED` represents a rejected detail request.

`INVALID_DETAIL` represents a fulfilled request whose returned object is invalid, including a missing or mismatched ID, invalid labels, or an invalid timestamp.

Both arrays must preserve the relative order of their corresponding input references.

### 4.3 Required behaviour

C1. Retrieve full message details using the IDs in the supplied reference array.

C2. Never have more than `maxConcurrent` detail requests in progress simultaneously.

C3. When references are available, begin up to the smaller of `maxConcurrent` and the number of references without waiting for earlier requests to finish. Whenever an in-progress request settles and unattempted references remain, promptly start another request as capacity becomes available. Never exceed `maxConcurrent` simultaneous requests.

C4. Requests may finish in any order, but successful messages must appear in their original reference order.

C5. An individual rejected detail request must not automatically discard other successfully retrieved messages.

C6. Record each rejected request in `failures` using its message ID and the code `FETCH_FAILED`.

C7. Validate returned message details against the required fields and their types, including verifying that the returned ID matches the requested ID.

C8. Record invalid returned details in `failures` using the code `INVALID_DETAIL`. Do not include those invalid records in `messages`.

C9. Preserve the original relative order of failure entries, regardless of when requests fail.

C10. Do not mutate the supplied references or successfully returned message objects.

C11. Return `{ messages: [], failures: [] }` when the reference array is empty.

C12. Reject invalid function arguments, including malformed reference entries, a non-function `getMessageDetail`, or a non-positive/non-integer concurrency limit, before starting any requests.

C13. Do not apply filtering, sorting, or the final result limit during message-detail retrieval.

C14. If all requests fail, return an empty `messages` array and a failure entry for every input reference. Do not report the batch as fully successful.

C15. Attempt each supplied unique reference once. Automatic retries are not part of this function's contract.

C16. Continue processing remaining references after individual request failures, subject to the concurrency limit.

### 4.4 Example — Completion order versus result order

Suppose the deduplication stage produces these four references:

```json
[
  { "id": "m-101" },
  { "id": "m-102" },
  { "id": "m-103" },
  { "id": "m-104" }
]
```

The concurrency limit is 3.

The system starts by requesting:

- `m-101`
- `m-102`
- `m-103`

The fourth request must not begin until one of the first three requests finishes.

Suppose the following events occur:

1. `m-103` succeeds first.
2. `m-104` begins because a request slot becomes available.
3. `m-102` rejects.
4. `m-104` succeeds.
5. `m-101` succeeds last.

The completion order is therefore:

```text
m-103  SUCCESS
m-102  FAILURE
m-104  SUCCESS
m-101  SUCCESS
```

The successful results must nevertheless be returned in their original reference order.

Expected output:

```json
{
  "messages": [
    {
      "id": "m-101",
      "labelIds": ["INBOX"],
      "timestampMs": 1700000000100
    },
    {
      "id": "m-103",
      "labelIds": ["INBOX"],
      "timestampMs": 1700000000300
    },
    {
      "id": "m-104",
      "labelIds": ["INBOX"],
      "timestampMs": 1700000000400
    }
  ],
  "failures": [
    {
      "id": "m-102",
      "code": "FETCH_FAILED"
    }
  ]
}
```

Notice that:

- `m-101` appears first despite finishing last.
- `m-102` does not appear in `messages` because its request failed.
- `m-102` appears in `failures` so the failure is not hidden.
- `m-103` and `m-104` remain available.
- No more than three detail requests are in progress simultaneously.

The missing message is omitted from this processing result, not deleted from any mailbox.

### 4.5 Acceptance criteria

A concurrent processing implementation passes when:

- Every valid unique reference is attempted exactly once.
- The concurrency limit is never exceeded.
- New requests can begin as capacity becomes available.
- Successful results preserve reference order.
- Failed requests do not automatically discard successful results.
- Each rejected request produces an appropriate failure entry.
- Invalid returned details are rejected from the successful message collection and recorded as failures.
- Failure records preserve reference order.
- Empty input produces empty results.
- All-failure scenarios produce an explicit collection of failures.
- Invalid function arguments produce an explicit error before requests begin.
- The input references and returned message objects are not mutated.
- Filtering, sorting, and final output limiting are left to later stages.
- No automatic retries are performed.

## 5. Error handling

### 5.1 Objective

Define how the synthetic inbox-processing system responds to failures across pagination, deduplication, message-detail retrieval, filtering, and final result preparation.

The system must distinguish between:

- Fatal errors that prevent the workflow from producing a trustworthy result.
- Recoverable errors affecting individual messages.
- Valid empty results that do not indicate an error.

The system must never silently report incomplete processing as fully successful.

### 5.2 Error categories

The workflow recognises the following error categories.

| Error code | Category | Meaning |
|---|---|---|
| `PAGE_FETCH_FAILED` | Fatal | An inbox-page request fails. |
| `PAGINATION_CYCLE` | Fatal | A page token repeats, creating a pagination cycle. |
| `INVALID_PAGE_RESPONSE` | Fatal | A pagination response violates the expected API contract. |
| `INVALID_INPUT` | Fatal | Required inputs or configuration are invalid. |
| `FETCH_FAILED` | Recoverable | An individual message-detail request fails. |
| `INVALID_DETAIL` | Recoverable | A detail request succeeds but returns an invalid message object. |

Fatal errors terminate the workflow.

Recoverable errors are recorded without automatically discarding other successful results.

These error codes belong to the synthetic benchmark. They are not claims about Gmail's actual API error codes.

### 5.3 Fatal errors

A fatal error occurs when the system cannot safely continue or cannot guarantee the completeness and validity of its results.

#### E1. Pagination request failure

If `listInboxPage()` rejects, the workflow must terminate with `PAGE_FETCH_FAILED`.

Previously retrieved pages must not be returned as though the complete inbox was retrieved.

#### E2. Pagination cycle

If pagination encounters a previously visited page token that would cause a page to be revisited, it must terminate with `PAGINATION_CYCLE`.

The system must not enter an infinite loop.

#### E3. Invalid pagination response

If a pagination response violates the required API contract, terminate with `INVALID_PAGE_RESPONSE`.

Examples include:

- `messages` is missing or is not an array.
- `nextPageToken` is neither a string nor `null`.
- `nextPageToken` is an empty string.

A pagination response is also invalid if any entry in its `messages` array is not an object containing a non-empty string `id`. Such a response must produce `INVALID_PAGE_RESPONSE`, even when the surrounding response structure is otherwise valid.

Message-reference validation is also required before deduplication; malformed references must not silently proceed.

#### E4. Invalid function arguments

Invalid function arguments must produce an explicit `INVALID_INPUT` error.

Examples include:

- A non-array reference collection.
- Missing or invalid message IDs.
- An invalid `cutoffMs`.
- A non-function `getMessageDetail`.
- A non-positive or non-integer `maxConcurrent`.

Validation must occur before starting operations that depend on the invalid inputs.

`INVALID_INPUT` applies to invalid arguments supplied directly to the system's functions. A malformed message reference returned by `listInboxPage()` is instead classified as `INVALID_PAGE_RESPONSE`.

#### E5. Invalid filtering input

`filterEligibleMessages()` must reject malformed input under its existing Section 3 contract.

The workflow should normally prevent malformed message details from reaching filtering by validating them during Section 4.

If invalid data nevertheless reaches filtering, it must not be silently accepted.

#### E6. Fatal-error reporting

A fatal error must be distinguishable from a successful processing result.

The error must expose its error code and must not be represented as a normal, complete result.

The caller must be able to identify which failure category caused processing to stop.

### 5.4 Recoverable message-detail errors

Individual message-detail failures are recoverable because other messages may still be processed successfully.

#### E7. Failed detail request

When `getMessageDetail(id)` rejects:

- Record the affected message ID.
- Record the error code `FETCH_FAILED`.
- Exclude that message from the successful details array.
- Continue processing remaining references.

#### E8. Invalid returned details

If a detail request resolves with an invalid object:

- Record the affected message ID.
- Record the error code `INVALID_DETAIL`.
- Do not include the invalid object in the successful details array.
- Continue processing other references.

#### E9. Preserve successful results

Failures affecting individual messages must not cause the system to discard successfully retrieved, valid message details.

#### E10. Preserve failure information

Every unsuccessful message-detail retrieval must produce a corresponding failure entry.

Failures must not disappear simply because the overall operation completes.

#### E11. Preserve reference order

Successful messages and recorded failures must each preserve their original relative reference order.

The order in which asynchronous requests finish must not determine the order of these arrays.

#### E12. No automatic retries

The synthetic system does not automatically retry failed requests.

A rejected message-detail request produces one failure entry.

Retry policies may be explored in later benchmarks but are outside the scope of Benchmark V2.

### 5.5 Distinguishing empty results from failures

An empty result does not necessarily indicate a problem.

The system must distinguish between the following scenarios.

#### E13. No messages exist

If pagination completes successfully and retrieves no message references:

- The workflow may complete successfully.
- The final message collection is empty.
- There are no message-detail failures.

#### E14. No messages satisfy filtering

If message details are retrieved successfully but all messages fail the filtering criteria:

- The workflow may complete successfully.
- The final message collection is empty.
- There are no message-detail failures.

#### E15. All message-detail requests fail

If every detail request fails:

- The successful details collection is empty.
- Every failed request is recorded.
- The workflow must not report full success.
- The recoverable failures remain visible to the caller.

#### E16. Some message-detail requests fail

If some requests succeed and others fail:

- Preserve successful, valid messages.
- Record each failed request.
- Continue filtering and processing successful details.
- Indicate that the overall result is incomplete.

### 5.6 Workflow outcome states

The final workflow will distinguish these outcomes.

| Outcome | Meaning |
|---|---|
| `complete` | All required stages completed, and no individual detail retrievals failed. |
| `partial` | Required stages completed, but one or more message-detail retrievals failed. |
| Fatal error | Processing terminated without producing a normal result. |

A workflow can return zero eligible messages and still be `complete`.

A workflow with zero eligible messages and recorded detail failures is `partial`.

A fatal error is not represented as a successful result with an empty array.

The exact final result structure will be defined in Section 6.

### 5.7 Example — Partial failure

Suppose pagination and deduplication successfully identify four unique messages:

```json
[
  { "id": "m-101" },
  { "id": "m-102" },
  { "id": "m-103" },
  { "id": "m-104" }
]
```

The detail requests produce these outcomes:

| Message | Outcome |
|---|---|
| `m-101` | Successful retrieval |
| `m-102` | Request rejected |
| `m-103` | Successful retrieval |
| `m-104` | Invalid returned details |

The message-detail stage must preserve the two successful messages and report the two unsuccessful requests.

Illustrative result:

```json
{
  "messages": [
    {
      "id": "m-101",
      "labelIds": ["INBOX"],
      "timestampMs": 1700000000100
    },
    {
      "id": "m-103",
      "labelIds": ["INBOX"],
      "timestampMs": 1700000000300
    }
  ],
  "failures": [
    {
      "id": "m-102",
      "code": "FETCH_FAILED"
    },
    {
      "id": "m-104",
      "code": "INVALID_DETAIL"
    }
  ]
}
```

The workflow may continue to filtering with the successfully retrieved messages.

Its final outcome must be `partial` because two message-detail retrievals were unsuccessful.

### 5.8 Example — Fatal pagination failure

Suppose the API successfully returns Page 1 and Page 2.

The request for Page 3 then fails.

```text
Page 1 --> SUCCESS
Page 2 --> SUCCESS
Page 3 --> FAILURE
               |
               v
        PAGE_FETCH_FAILED
               |
               v
         STOP WORKFLOW
```

Even though some references have already been retrieved, the system cannot guarantee that all available references have been collected.

Therefore:

- Do not report a complete result.
- Do not continue with deduplication and message-detail retrieval.
- Terminate with `PAGE_FETCH_FAILED`.

### 5.9 Acceptance criteria

An implementation passes the error-handling requirements when:

- Fatal pagination failures terminate processing.
- Pagination cycles are detected and reported.
- Invalid pagination responses are rejected.
- Invalid function arguments produce explicit errors.
- Individual detail failures are recorded without discarding successful messages.
- Invalid returned details are excluded and reported.
- Successful results preserve their required ordering.
- Failure entries preserve their required ordering.
- No automatic retries are performed.
- Valid empty results are not misclassified as errors.
- All-detail-failure scenarios are not reported as fully successful.
- Partial processing is distinguishable from complete processing.
- Fatal errors are never disguised as normal empty results.
- Failure reporting does not hide missing or unsuccessful operations.

## 6. Final output and workflow orchestration

### 6.1 Objective

Combine pagination, deduplication, concurrent message-detail retrieval, filtering, sorting, and limiting into a single synthetic inbox-processing workflow.

The system must return correctly ordered messages, preserve relevant failure information, and accurately report whether processing completed fully or partially.

### 6.2 Function contract

The system exposes:

`processInbox({ listInboxPage, getMessageDetail, cutoffMs, limit = 50, maxConcurrent = 3 })`

Input:

- `listInboxPage`: The simulated asynchronous pagination function defined in Section 1.
- `getMessageDetail`: The simulated asynchronous detail-retrieval function defined in Section 4.
- `cutoffMs`: A finite numeric timestamp in milliseconds.
- `limit`: A non-negative integer specifying the maximum number of messages to return. Defaults to 50.
- `maxConcurrent`: A positive integer specifying the maximum number of simultaneous message-detail requests. Defaults to 3.

The pagination stage requests a page size of 20.

Required function arguments and configuration must be validated before the workflow begins.

Output:

A Promise resolving to an object with exactly these top-level fields:

- `status`: Either `complete` or `partial`.
- `messages`: An array of eligible, successfully retrieved message objects.
- `failures`: An array of message-detail retrieval failures.

A fatal error rejects the Promise instead of returning a normal result object.

### 6.3 Required processing sequence

O1. Validate the workflow's function arguments and configuration before starting requests.

O2. Retrieve all message references through pagination, following the requirements in Section 1.

O3. Deduplicate the collected references by message ID, following Section 2.

O4. Retrieve message details concurrently, respecting the concurrency limit and preserving failure information according to Section 4.

O5. Filter successfully retrieved message details using Section 3.

O6. Sort eligible messages by `timestampMs` in descending order, newest first.

O7. If two messages have identical timestamps, preserve their original relative order from the deduplicated reference collection.

O8. Apply the final result limit only after filtering and sorting.

O9. Never return more than `limit` messages.

O10. A limit of zero must produce an empty final `messages` array.

O11. Do not remove failure entries when applying the message limit.

O12. Return `status: "complete"` when all required stages finish without any individual detail-retrieval failures.

O13. Return `status: "partial"` when one or more individual detail-retrieval failures occurred, even if some successful messages remain.

O14. If all message-detail requests fail, return `status: "partial"`, an empty `messages` array, and the corresponding failure records.

O15. Fatal errors must terminate the workflow using the error-handling requirements in Section 5.

O16. Do not mutate the original message references or successfully retrieved message objects.

O17. Do not retry failed requests automatically.

O18. The workflow must distinguish a valid empty result from an incomplete result caused by failures.

O19. Failure entries must preserve their original reference order, independently of message sorting and final result limiting.

O20. For this benchmark, all deduplicated message references must be processed before the final limit is applied, including when `limit` is zero. This ensures consistent failure reporting.

### 6.4 Sorting requirements

Messages must be sorted by their numeric `timestampMs` value.

The newest timestamp appears first.

Example:

Input:

```json
[
  { "id": "m-101", "timestampMs": 100 },
  { "id": "m-102", "timestampMs": 400 },
  { "id": "m-103", "timestampMs": 200 },
  { "id": "m-104", "timestampMs": 300 }
]
```

Expected sorted order:

```json
[
  { "id": "m-102", "timestampMs": 400 },
  { "id": "m-104", "timestampMs": 300 },
  { "id": "m-103", "timestampMs": 200 },
  { "id": "m-101", "timestampMs": 100 }
]
```

If `limit = 2`, the final messages array contains:

```json
[
  { "id": "m-102", "timestampMs": 400 },
  { "id": "m-104", "timestampMs": 300 }
]
```

### 6.5 Equal timestamp behaviour

Two messages may have identical timestamps.

Example:

```json
[
  { "id": "m-201", "timestampMs": 500 },
  { "id": "m-202", "timestampMs": 700 },
  { "id": "m-203", "timestampMs": 700 },
  { "id": "m-204", "timestampMs": 300 }
]
```

Expected sorted order:

`[m-202, m-203, m-201, m-204]`

Messages `m-202` and `m-203` have equal timestamps.

They must retain their original relative order, with `m-202` before `m-203`.

Sorting must not arbitrarily reverse equally dated messages.

### 6.6 Complete workflow example

Suppose pagination retrieves these references:

```json
[
  { "id": "m-101" },
  { "id": "m-102" },
  { "id": "m-101" },
  { "id": "m-103" },
  { "id": "m-104" }
]
```

Deduplication removes the second occurrence of `m-101`.

Remaining references:

`[m-101, m-102, m-103, m-104]`

The detail-retrieval stage produces:

| Message | Detail retrieval | Timestamp | Labels |
|---|---|---|---|
| m-101 | Success | 1700000000200 | INBOX |
| m-102 | Failure | Not available | Not available |
| m-103 | Success | 1700000000400 | INBOX |
| m-104 | Success | 1699999999999 | INBOX |

Configuration:

- `cutoffMs = 1700000000000`
- `limit = 1`
- `maxConcurrent = 3`

Filtering removes `m-104` from the eligible collection because its timestamp is older than the cutoff.

The eligible messages are:

`[m-101, m-103]`

Sorting newest first produces:

`[m-103, m-101]`

Applying `limit = 1` produces:

`[m-103]`

The failed retrieval of `m-102` remains recorded.

Expected final result:

```json
{
  "status": "partial",
  "messages": [
    {
      "id": "m-103",
      "labelIds": ["INBOX"],
      "timestampMs": 1700000000400
    }
  ],
  "failures": [
    {
      "id": "m-102",
      "code": "FETCH_FAILED"
    }
  ]
}
```

The result is `partial` because a message-detail retrieval failed.

The fact that the requested limit was satisfied does not make the processing complete.

### 6.7 Valid empty result

Suppose pagination completes successfully but returns no message references.

Expected result:

```json
{
  "status": "complete",
  "messages": [],
  "failures": []
}
```

An empty inbox is not an error.

Similarly, when all successfully retrieved messages fail the eligibility rules and no detail requests fail, the result is complete with an empty messages array.

### 6.8 All-detail-failure result

Suppose pagination and deduplication produce two references:

`[m-101, m-102]`

Both detail requests fail.

Expected result:

```json
{
  "status": "partial",
  "messages": [],
  "failures": [
    {
      "id": "m-101",
      "code": "FETCH_FAILED"
    },
    {
      "id": "m-102",
      "code": "FETCH_FAILED"
    }
  ]
}
```

The workflow must not confuse this outcome with a genuinely empty inbox.

### 6.9 Fatal error behaviour

If pagination fails, processing must stop.

The Promise returned by `processInbox()` must reject with the appropriate fatal error code.

For example:

`PAGE_FETCH_FAILED`

The caller must be able to distinguish this from a valid result containing no messages.

The workflow must not return:

```json
{
  "status": "complete",
  "messages": [],
  "failures": []
}
```

after encountering a fatal pagination failure.

### 6.10 Input validation

The workflow must reject invalid configuration before starting any API requests.

Examples include:

- `listInboxPage` is not a function.
- `getMessageDetail` is not a function.
- `cutoffMs` is missing or is not a finite number.
- `limit` is negative or is not an integer.
- `maxConcurrent` is zero, negative, or not an integer.

The corresponding fatal error code is:

`INVALID_INPUT`

For this benchmark:

- `limit = 0` is valid.
- `limit = 1` is valid.
- `limit = 50` is valid.
- `maxConcurrent = 1` is valid.
- `maxConcurrent = 3` is valid.

### 6.11 Acceptance criteria

The final workflow implementation passes when:

- All required processing stages run in the specified sequence.
- Pagination completes before deduplication.
- Deduplication completes before detail retrieval.
- Filtering occurs after successful detail retrieval.
- Sorting occurs after filtering.
- Limiting occurs after sorting.
- Newest messages appear first.
- Equal timestamps preserve original reference order.
- The final result never exceeds the requested limit.
- A limit of zero returns no messages.
- The limit does not discard or conceal failure information.
- Successful message details are preserved when other detail requests fail.
- Complete and partial outcomes are correctly distinguished.
- Valid empty results are not classified as failures.
- Fatal errors reject rather than returning misleading normal results.
- Invalid configuration is rejected before any requests begin.
- Message-detail failures remain in their original reference order.
- No automatic retries occur.
- Original references and message objects are not mutated.

## 7. Benchmark scope and evaluation principles

### 7.1 Purpose

Benchmark V2 evaluates whether an AI model can explain source code accurately, trace data flow across connected functions, discover implementation defects, and avoid unsupported conclusions.

### 7.2 Evaluation boundaries

The synthetic fixture must not:

- Connect to real Gmail accounts.
- Access external services.
- Read production credentials.
- Modify the MailSage application.
- Perform actual email operations.

All execution tests must use local synthetic inputs and simulated asynchronous functions.

### 7.3 Ground-truth requirements

Before evaluating AI models:

1. Finalise this specification.
2. Construct the synthetic JavaScript fixture.
3. Create independent executable tests.
4. Verify intended and actual behaviours.
5. Document the predefined defects.
6. Record correct behaviours that should not be classified as defects.
7. Lock the benchmark version.

The answer key must not be supplied to evaluated models.

### 7.4 Controlled comparison

Tests W and X will use the same:

- Source fixture.
- Requirements specification.
- Model and thinking effort.
- Evaluation prompt.
- Evaluation rubric.

The intended difference is whether MailSage Code Explainer Skill V3 is supplied.

Test W runs without Skill V3.

Test X runs with Skill V3.

Both evaluations must be conducted in appropriately isolated contexts.

### 7.5 Evaluation objectives

The evaluation will measure:

- Defect-discovery precision.
- Defect-discovery recall.
- False positives.
- False negatives.
- Technical accuracy.
- Data-flow accuracy.
- Completeness.
- Grounding.
- Beginner accessibility.
- Quality of explanations and visual reasoning.

Multiple runs should be considered to assess result consistency.

Changes to the benchmark after evaluating model responses must be recorded as a new benchmark version.
