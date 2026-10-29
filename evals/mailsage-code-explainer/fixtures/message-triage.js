
/**
 * MailSage Email Triage — Evaluation Fixture
 *
 * This is a synthetic learning example, not application code.
 *
 * Intended behaviour:
 * - Read email headers without depending on letter casing.
 * - Include only INBOX messages, excluding TRASH.
 * - Include messages on or after the specified date cutoff.
 * - Deduplicate messages by ID, retaining the first occurrence.
 * - Return messages newest first without modifying the input.
 * - Respect the requested result limit, including zero.
 * - Mark an email unread when isRead is false.
 * - Prefer plain-text previews; HTML previews must exclude
 *   markup and script/style content.
 * - Keep successfully fetched details when individual fetches fail.
 *
 * No real Gmail connection is required.
 */

export function readHeader(headers = [], name) {
    const header = headers.find((item) => item.name === name);
    return header?.value ?? "";
  }

  export function isEligible(message, cutoffMs) {
    if (!Array.isArray(message.labels)) return false;

    if (!message.labels.includes("INBOX")) return false;
    if (message.labels.includes("TRASH")) return false;

    return (
      Number.isFinite(message.timestampMs) &&
      message.timestampMs >= cutoffMs
    );
  }

  export function previewFor(message) {
    if (
      typeof message.textBody === "string" &&
      message.textBody.length > 0
    ) {
      return message.textBody.slice(0, 80);
    }

    const html =
      typeof message.htmlBody === "string"
        ? message.htmlBody
        : "";

    return html.replace(/<[^>]*>/g, "").slice(0, 80);
  }

  export function summarizeInbox(
    messages,
    { nowMs, days = 7, limit = 20 } = {}
  ) {
    if (!Array.isArray(messages)) return [];

    const cutoffMs = nowMs - days * 24 * 60 * 60 * 1000;

    const eligible = messages.filter((message) =>
      isEligible(message, cutoffMs)
    );

    const seenSenders = new Set();

    const unique = eligible.filter((message) => {
      const sender = readHeader(
        message.headers ?? [],
        "From"
      ).toLowerCase();

      if (seenSenders.has(sender)) return false;

      seenSenders.add(sender);
      return true;
    });

    unique.sort((a, b) => a.timestampMs - b.timestampMs);

    return unique.slice(0, limit || 20).map((message) => ({
      id: message.id,
      from: readHeader(message.headers ?? [], "From"),
      unread: message.isRead === true,
      preview: previewFor(message),
    }));
  }

  export async function loadDetails(ids, fetchMessage) {
    const results = await Promise.all(
      ids.map((id) => fetchMessage(id))
    );

    return results.filter(Boolean);
  }