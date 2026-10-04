"use strict";

/**
 * Shared library for the publication-review GitHub Issue flow.
 *
 * Responsibilities:
 *   - detect pending publications (no KEEP, no REJECT)
 *   - build the issue body with a machine-safe mapping block
 *   - parse the mapping block out of an existing issue body
 *   - parse decision commands from an issue comment
 *   - build a decision record with stable identifiers (NEVER id-only)
 *
 * Never evaluates user text. All inputs are treated as untrusted strings.
 */

const path = require("node:path");
const {
  findPublicationDecision,
  normalizeDoi,
  normalizeUrl,
  normalizeSourceId,
  derivePublicationSourceId,
  buildFallbackKey,
  loadDecisions
} = require(path.join(__dirname, "..", "..", "src", "_data", "publication-decisions.js"));

const MAP_START = "<!-- publication-review-map";
const MAP_END = "-->";
const AUTHORIZED_USER = "LaruX75";
const DECISION_COMMAND_RE = /^\s*(keep|reject)\s+(\d+)\s*$/i;

/** Collect raw records that currently have NO KEEP and NO REJECT decision. */
function detectPending(rawRecords, decisions) {
  const pending = [];
  for (const r of rawRecords) {
    const dec = findPublicationDecision(r, decisions);
    if (dec && (dec.status === "keep" || dec.status === "rejected")) continue;
    pending.push(r);
  }
  return pending;
}

/** Pick the strongest stable identifier for a raw record (for the mapping block). */
function pickStableIdentifier(record) {
  const doi = normalizeDoi(record.doi);
  if (doi) return { field: "doi", value: doi };

  const sourceId = derivePublicationSourceId({
    sourceId: record.sourceId,
    isbn: record.isbn
  });
  if (sourceId) return { field: "sourceId", value: sourceId };

  const url = normalizeUrl(record.url);
  if (url) return { field: "url", value: url };

  const fallback = buildFallbackKey(record.title, record.year, record.authorsText);
  if (fallback && fallback !== "||") return { field: "fallbackKey", value: fallback };

  return null;
}

/** Build the numbered issue body. Mapping block is embedded as HTML comment. */
function buildIssueBody(pending) {
  if (!pending.length) {
    return [
      "## No pending publications",
      "",
      "All currently discovered publications have been reviewed.",
      "",
      `${MAP_START}`,
      "0 pending",
      `${MAP_END}`
    ].join("\n");
  }

  const lines = [];
  lines.push("## New publications awaiting review");
  lines.push("");
  lines.push(`${pending.length} publication(s) are currently hidden from the public site until an explicit KEEP decision is made.`);
  lines.push("");

  const mapEntries = [];

  for (let i = 0; i < pending.length; i++) {
    const r = pending[i];
    const num = i + 1;
    const title = (r.title || "(no title)").replace(/\s+/g, " ").trim();
    const authors = (r.authorsText || "").replace(/\s+/g, " ").trim();
    const stable = pickStableIdentifier(r);

    lines.push(`### ${num}. ${title}`);
    lines.push("");
    if (authors) lines.push(`- Authors: ${authors}`);
    if (r.year) lines.push(`- Year: ${r.year}`);
    if (r.doi) lines.push(`- DOI: \`${r.doi}\``);
    if (r.url) lines.push(`- URL: ${r.url}`);
    if (r.sourceId) lines.push(`- Source ID: \`${r.sourceId}\``);
    lines.push(`- Raw ID: \`${r.id}\``);
    lines.push(`- Decision basis: \`${stable ? stable.field : "NONE"}\``);
    lines.push("- Status: ⏳ PENDING");
    lines.push("");

    mapEntries.push({
      number: num,
      rawId: r.id,
      stableField: stable ? stable.field : null,
      stableValue: stable ? stable.value : null,
      title: title.slice(0, 80),
      year: r.year || null
    });
  }

  lines.push("## How to decide");
  lines.push("");
  lines.push("Comment with one decision per line:");
  lines.push("");
  lines.push("```");
  lines.push("KEEP 1");
  lines.push("REJECT 2");
  lines.push("```");
  lines.push("");
  lines.push("Commands are case-insensitive. Only authorized reviewer comments are processed.");
  lines.push("");
  lines.push("Undecided publications remain hidden.");
  lines.push("");
  lines.push(MAP_START);
  lines.push(`revision: ${new Date().toISOString()}`);
  lines.push(JSON.stringify({ entries: mapEntries }));
  lines.push(MAP_END);

  return lines.join("\n");
}

/** Extract the mapping JSON + revision timestamp from an issue body. */
function parseMappingFromBody(body) {
  if (!body) return null;
  const start = body.indexOf(MAP_START);
  if (start === -1) return null;
  const end = body.indexOf(MAP_END, start + MAP_START.length);
  if (end === -1) return null;
  const block = body.slice(start + MAP_START.length, end).trim();

  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let revision = null;
  let json = null;
  for (const line of lines) {
    if (line.startsWith("revision:")) {
      revision = line.slice("revision:".length).trim();
    } else if (line.startsWith("{")) {
      try {
        json = JSON.parse(line);
      } catch {
        // ignore malformed
      }
    } else if (line === "0 pending") {
      return { revision: null, entries: [] };
    }
  }
  if (!json || !Array.isArray(json.entries)) return null;
  return { revision, entries: json.entries };
}

/** Parse decision commands from an issue comment. Returns { valid, invalid }. */
function parseCommentCommands(commentBody) {
  const valid = [];
  const invalid = [];
  if (!commentBody) return { valid, invalid };

  const lines = commentBody.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip quoted lines (common in email replies)
    if (line.startsWith(">")) continue;

    const m = line.match(DECISION_COMMAND_RE);
    if (!m) {
      // Only report lines that look like they tried to be commands
      const looksLikeCommand = /^(keep|reject)\b/i.test(line);
      if (looksLikeCommand) invalid.push({ line, reason: "syntax" });
      continue;
    }
    const action = m[1].toUpperCase();
    const number = Number(m[2]);
    if (!Number.isInteger(number) || number <= 0) {
      invalid.push({ line, reason: "number" });
      continue;
    }
    valid.push({ action, number });
  }

  return { valid, invalid };
}

/** Build a decision record ready for publication-decisions.json. */
function buildDecisionRecord({ action, mappingEntry, reason, decidedBy }) {
  if (!mappingEntry) throw new Error("missing mappingEntry");
  if (!mappingEntry.stableField || !mappingEntry.stableValue) {
    throw new Error("refuse to build id-only decision: mappingEntry has no stable identifier");
  }

  const record = {
    status: action === "KEEP" ? "keep" : "rejected",
    reason: reason || `Editorial decision via GitHub publication review issue`,
    decidedAt: new Date().toISOString().slice(0, 10),
    decidedBy: decidedBy || AUTHORIZED_USER
  };
  record[mappingEntry.stableField] = mappingEntry.stableValue;
  if (mappingEntry.rawId) record.id = mappingEntry.rawId;
  return record;
}

/** Determine whether a comment can safely act on the current mapping. */
function commentCanActOnMapping({ commentCreatedAt, mappingRevisionIso }) {
  if (!commentCreatedAt) return false;
  if (!mappingRevisionIso) return true; // no revision = treat as current
  const commentMs = Date.parse(commentCreatedAt);
  const mapMs = Date.parse(mappingRevisionIso);
  if (!Number.isFinite(commentMs) || !Number.isFinite(mapMs)) return true;
  // Comment must have been created at or after the current mapping revision
  return commentMs >= mapMs;
}

/** True if a decision already exists for this stable id (prevents accidental re-decision). */
function existingDecisionFor(mappingEntry, decisions) {
  if (!mappingEntry.stableField || !mappingEntry.stableValue) return null;
  const field = mappingEntry.stableField;
  const value = mappingEntry.stableValue;
  for (const d of decisions) {
    if (field === "doi" && d.doi && normalizeDoi(d.doi) === value) return d;
    if (field === "sourceId" && d.sourceId && normalizeSourceId(d.sourceId) === value) return d;
    if (field === "url" && d.url && normalizeUrl(d.url) === normalizeUrl(value)) return d;
    if (field === "fallbackKey" && d.fallbackKey && d.fallbackKey === value) return d;
  }
  return null;
}

module.exports = {
  AUTHORIZED_USER,
  MAP_START,
  MAP_END,
  DECISION_COMMAND_RE,
  detectPending,
  pickStableIdentifier,
  buildIssueBody,
  parseMappingFromBody,
  parseCommentCommands,
  buildDecisionRecord,
  commentCanActOnMapping,
  existingDecisionFor,
  loadDecisions
};
