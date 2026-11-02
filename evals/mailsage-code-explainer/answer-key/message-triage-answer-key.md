
# MailSage Message Triage — Ground Truth

## Benchmark information

- Fixture: `message-triage.js`
- Experiments: U and V
- Purpose: Evaluate independent defect discovery and false positives
- Status: Reference answer key — not supplied to evaluated models

## Seven predefined defects

### D1 — Case-sensitive header lookup

Function: `readHeader()`

The code uses:

`item.name === name`

This performs case-sensitive comparison, contrary to the documented requirement.

Expected finding:
A header named `from` will not match a request for `From`.

### D2 — Incorrect deduplication key

Function: `summarizeInbox()`

The code stores lowercase sender addresses in `seenSenders`.

Expected finding:
Different messages from the same sender can be incorrectly removed, while repeated IDs with different senders can survive.

The requirement is to deduplicate by message ID.

### D3 — Incorrect sorting direction

Function: `summarizeInbox()`

The code uses:

`a.timestampMs - b.timestampMs`

Expected finding:
Messages are sorted oldest-first rather than newest-first.

### D4 — Zero result limit ignored

Function: `summarizeInbox()`

The code uses:

`unique.slice(0, limit || 20)`

Expected finding:
When `limit` is zero, JavaScript substitutes 20, so the function can return messages instead of an empty array.

### D5 — Inverted unread status

Function: `summarizeInbox()`

The code uses:

`unread: message.isRead === true`

Expected finding:
Messages marked as read become `unread: true`.

The intended behaviour is to mark unread messages when `isRead` is false.

### D6 — HTML preview retains unwanted content

Function: `previewFor()`

The code uses:

`html.replace(/<[^>]*>/g, "")`

Expected finding:
The expression removes HTML tags but can leave script and style contents.

For example, a script element containing `alert(1)` can leave the text `alert(1)` in the preview.

This does not satisfy the documented requirement to exclude script/style content.

Do not claim that this code executes the script.

### D7 — Failure of one detail request rejects batch

Function: `loadDetails()`

The code uses `Promise.all()` without handling individual rejected promises.

Expected finding:
One rejected `fetchMessage()` call can reject the entire batch instead of preserving successful results.

The later `filter(Boolean)` does not handle rejected promises.

## Correct behaviours — Avoid false positives

### B1 — Inclusive date cutoff

`message.timestampMs >= cutoffMs` correctly includes messages exactly at the cutoff, assuming valid numeric inputs.

### B2 — Inbox and trash filtering

The code correctly requires the `INBOX` label and excludes messages with the `TRASH` label.

### B3 — Input-array preservation

`messages.filter()` produces a new array.

Sorting `unique` does not reorder the original `messages` array.

### B4 — Missing header fallback

Returning an empty string when a header is absent is a legitimate fallback, not automatically a defect.

### B5 — Plain-text preview preference

The function correctly prefers a nonempty `textBody` over `htmlBody` and truncates previews to 80 characters.

## Additional findings

Models may identify legitimate issues not included in D1–D7.

Record these separately and verify them against the fixture before accepting or rejecting them.

Do not retrospectively increase the seven-defect denominator.

Potential concerns that depend on undocumented caller behaviour or additional assumptions must be labelled accordingly.

## Scoring rules

True positive (TP):
A predefined defect is correctly identified with an accurate explanation.

False positive (FP):
The model reports a defect that is not supported by the code and documented requirements.

False negative (FN):
The model fails to identify a predefined defect.

Partial finding:
The model identifies the correct area but does not establish the actual behaviour sufficiently to earn a true positive.

Count duplicate descriptions of one underlying defect only once.

Precision = TP / (TP + FP)

Recall = TP / (TP + FN)

If a denominator is zero, report the metric as undefined rather than inventing a score.

Record additional valid discoveries, incorrect consequences and unsupported assumptions separately.

## Experimental controls

- Same GPT-6 model
- Same Medium thinking effort
- Same ChatGPT project
- Same uploaded fixture
- Same prompt
- Fresh conversation for each test
- Test U: without skill
- Test V: with Skill V3

Do not attach this answer key to either test.

Do not revise the fixture or answer key after reviewing model responses without explicitly recording a new benchmark version.