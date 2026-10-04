#!/usr/bin/env node
"use strict";

/**
 * Tests for the publication-review library (pending detection, mapping,
 * command parsing, decision record building, authorization, mapping
 * freshness check).
 *
 * Does NOT touch the file system, GitHub API, or the production
 * publication-decisions.json. All inputs are synthetic.
 */

const assert = require("node:assert");
const path = require("node:path");
const {
  AUTHORIZED_USER,
  detectPending,
  pickStableIdentifier,
  buildIssueBody,
  parseMappingFromBody,
  parseCommentCommands,
  buildDecisionRecord,
  commentCanActOnMapping,
  existingDecisionFor
} = require(path.join(__dirname, "lib", "publication-review.js"));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

console.log("publication-review library tests\n");

// ── Pending detection ──────────────────────────────────────────────
console.log("Pending detection:");

const sampleRaw = [
  { id: "p-1", doi: "10.1/a", title: "A", year: 2026, authorsText: "X" },
  { id: "p-2", doi: "10.1/b", title: "B", year: 2026, authorsText: "Y" },
  { id: "p-3", doi: "10.1/c", title: "C", year: 2026, authorsText: "Z" },
  { id: "p-4", url: "https://portal.example/x", title: "D", year: 2026, authorsText: "W" }
];
const sampleDec = [
  { doi: "10.1/a", status: "keep",    reason: "r" },
  { doi: "10.1/b", status: "rejected", reason: "r" }
];

test("no decision → pending", () => {
  const p = detectPending(sampleRaw, sampleDec);
  const ids = p.map(r => r.id);
  assert.ok(ids.includes("p-3"), "p-3 (no decision) must be pending");
  assert.ok(ids.includes("p-4"), "p-4 (no decision) must be pending");
});

test("keep → not pending", () => {
  const p = detectPending(sampleRaw, sampleDec);
  assert.ok(!p.map(r => r.id).includes("p-1"), "p-1 (keep) must not be pending");
});

test("rejected → not pending", () => {
  const p = detectPending(sampleRaw, sampleDec);
  assert.ok(!p.map(r => r.id).includes("p-2"), "p-2 (rejected) must not be pending");
});

test("regenerated local id + stable KEEP → not pending", () => {
  const raw = [{ id: "regen-x", doi: "10.1/a", title: "A", year: 2026, authorsText: "X" }];
  const p = detectPending(raw, sampleDec);
  assert.strictEqual(p.length, 0, "stable DOI must still match keep decision after id regen");
});

test("regenerated local id + stable REJECT → not pending", () => {
  const raw = [{ id: "regen-y", doi: "10.1/b", title: "B", year: 2026, authorsText: "Y" }];
  const p = detectPending(raw, sampleDec);
  assert.strictEqual(p.length, 0, "stable DOI must still match rejected decision after id regen");
});

// ── pickStableIdentifier ───────────────────────────────────────────
console.log("\npickStableIdentifier (priority: DOI > sourceId > URL > fallbackKey):");

test("picks DOI first when available", () => {
  const r = { doi: "10.1/x", url: "https://x", title: "T", year: 2026, authorsText: "A" };
  const s = pickStableIdentifier(r);
  assert.strictEqual(s.field, "doi");
  assert.strictEqual(s.value, "10.1/x");
});

test("falls back to URL when no DOI", () => {
  const r = { url: "https://Example.ORG/p/", title: "T", year: 2026, authorsText: "A" };
  const s = pickStableIdentifier(r);
  assert.strictEqual(s.field, "url");
  assert.strictEqual(s.value, "https://example.org/p");
});

test("falls back to fallbackKey when no DOI/sourceId/URL", () => {
  const r = { title: "The Title", year: 2026, authorsText: "Smith, J." };
  const s = pickStableIdentifier(r);
  assert.strictEqual(s.field, "fallbackKey");
  assert.strictEqual(s.value, "the title|2026|smith, j.");
});

test("returns null when NO identifier derivable", () => {
  const r = { id: "orphan", title: "", year: null, authorsText: "" };
  assert.strictEqual(pickStableIdentifier(r), null);
});

// ── Issue body round-trip ──────────────────────────────────────────
console.log("\nIssue body build + parse:");

const pendingSample = [
  { id: "p-3", doi: "10.1/c", title: "Publication C", year: 2026, authorsText: "C author" },
  { id: "p-4", url: "https://portal.example/x", title: "Publication D", year: 2026, authorsText: "D author" }
];

test("buildIssueBody emits numbered list for pending items", () => {
  const body = buildIssueBody(pendingSample);
  assert.match(body, /### 1\. Publication C/);
  assert.match(body, /### 2\. Publication D/);
});

test("buildIssueBody emits mapping block parseable by parseMappingFromBody", () => {
  const body = buildIssueBody(pendingSample);
  const m = parseMappingFromBody(body);
  assert.ok(m, "mapping should parse");
  assert.strictEqual(m.entries.length, 2);
  assert.strictEqual(m.entries[0].number, 1);
  assert.strictEqual(m.entries[0].stableField, "doi");
  assert.strictEqual(m.entries[0].stableValue, "10.1/c");
  assert.strictEqual(m.entries[1].number, 2);
  assert.strictEqual(m.entries[1].stableField, "url");
  assert.strictEqual(m.entries[1].stableValue, "https://portal.example/x");
});

test("buildIssueBody for empty pending list emits '0 pending' marker", () => {
  const body = buildIssueBody([]);
  assert.match(body, /0 pending/);
  const m = parseMappingFromBody(body);
  assert.ok(m);
  assert.strictEqual(m.entries.length, 0);
});

test("parseMappingFromBody returns null when no mapping block", () => {
  assert.strictEqual(parseMappingFromBody("just some text"), null);
});

test("parseMappingFromBody returns null on malformed block", () => {
  assert.strictEqual(parseMappingFromBody("<!-- publication-review-map\n not json \n-->"), null);
});

// ── Command parsing ────────────────────────────────────────────────
console.log("\nparseCommentCommands:");

test("accepts canonical KEEP / REJECT lines", () => {
  const { valid, invalid } = parseCommentCommands("KEEP 1\nREJECT 2\n");
  assert.deepStrictEqual(valid, [{ action: "KEEP", number: 1 }, { action: "REJECT", number: 2 }]);
  assert.strictEqual(invalid.length, 0);
});

test("accepts case-insensitive commands with extra whitespace", () => {
  const { valid } = parseCommentCommands("  keep   3\nReject   4  ");
  assert.deepStrictEqual(valid, [{ action: "KEEP", number: 3 }, { action: "REJECT", number: 4 }]);
});

test("ignores blank lines and quoted lines", () => {
  const { valid } = parseCommentCommands("\n> KEEP 1\nREJECT 2\n\n> old thread\n");
  assert.deepStrictEqual(valid, [{ action: "REJECT", number: 2 }]);
});

test("rejects 'KEEP' with no number", () => {
  const { valid, invalid } = parseCommentCommands("KEEP\n");
  assert.strictEqual(valid.length, 0);
  assert.strictEqual(invalid.length, 1);
  assert.strictEqual(invalid[0].reason, "syntax");
});

test("rejects 'KEEP abc' (non-numeric)", () => {
  const { valid, invalid } = parseCommentCommands("KEEP abc\n");
  assert.strictEqual(valid.length, 0);
  assert.strictEqual(invalid.length, 1);
});

test("rejects unknown command verbs", () => {
  const { valid, invalid } = parseCommentCommands("DELETE 1\n");
  assert.strictEqual(valid.length, 0);
  assert.strictEqual(invalid.length, 0, "non-command lines are quietly ignored (not reported as errors)");
});

test("rejects negative numbers", () => {
  const { valid, invalid } = parseCommentCommands("KEEP -1\n");
  assert.strictEqual(valid.length, 0);
  // Regex requires \d+ so -1 doesn't even match the "looks like command" pattern after number; the line starts with "KEEP" so it is detected as command attempt
  assert.strictEqual(invalid.length, 1);
});

test("rejects zero", () => {
  const { valid, invalid } = parseCommentCommands("KEEP 0\n");
  assert.strictEqual(valid.length, 0);
  assert.strictEqual(invalid.length, 1, "0 is not a positive integer");
});

test("mixes valid and invalid without crosstalk", () => {
  const { valid, invalid } = parseCommentCommands("KEEP 1\nKEEP abc\nREJECT 3\n");
  assert.strictEqual(valid.length, 2);
  assert.strictEqual(invalid.length, 1);
});

// ── buildDecisionRecord ────────────────────────────────────────────
console.log("\nbuildDecisionRecord (never id-only):");

test("writes DOI-backed KEEP record", () => {
  const entry = { number: 1, rawId: "p-1", stableField: "doi", stableValue: "10.1/a", title: "A" };
  const r = buildDecisionRecord({ action: "KEEP", mappingEntry: entry, decidedBy: "LaruX75" });
  assert.strictEqual(r.status, "keep");
  assert.strictEqual(r.doi, "10.1/a");
  assert.strictEqual(r.decidedBy, "LaruX75");
  assert.ok(r.decidedAt);
});

test("writes URL-backed REJECT record", () => {
  const entry = { number: 1, rawId: "p-2", stableField: "url", stableValue: "https://x/y", title: "B" };
  const r = buildDecisionRecord({ action: "REJECT", mappingEntry: entry });
  assert.strictEqual(r.status, "rejected");
  assert.strictEqual(r.url, "https://x/y");
});

test("writes fallbackKey-backed decision when that is the strongest identifier", () => {
  const entry = { number: 1, rawId: "p-3", stableField: "fallbackKey", stableValue: "title|2026|smith", title: "C" };
  const r = buildDecisionRecord({ action: "REJECT", mappingEntry: entry });
  assert.strictEqual(r.fallbackKey, "title|2026|smith");
});

test("REFUSES to build id-only decision", () => {
  const entry = { number: 1, rawId: "orphan", stableField: null, stableValue: null };
  assert.throws(() => buildDecisionRecord({ action: "KEEP", mappingEntry: entry }), /id-only/);
});

// ── Mapping freshness ──────────────────────────────────────────────
console.log("\ncommentCanActOnMapping (stale-mapping protection):");

test("comment created AFTER mapping revision → can act", () => {
  const canAct = commentCanActOnMapping({
    commentCreatedAt: "2026-10-03T12:00:00Z",
    mappingRevisionIso: "2026-10-03T11:00:00Z"
  });
  assert.strictEqual(canAct, true);
});

test("comment created BEFORE mapping revision → cannot act", () => {
  const canAct = commentCanActOnMapping({
    commentCreatedAt: "2026-10-03T10:00:00Z",
    mappingRevisionIso: "2026-10-03T11:00:00Z"
  });
  assert.strictEqual(canAct, false);
});

test("comment at exactly mapping revision time → can act (inclusive)", () => {
  const canAct = commentCanActOnMapping({
    commentCreatedAt: "2026-10-03T11:00:00Z",
    mappingRevisionIso: "2026-10-03T11:00:00Z"
  });
  assert.strictEqual(canAct, true);
});

test("missing revision → defaults to allow", () => {
  const canAct = commentCanActOnMapping({
    commentCreatedAt: "2026-10-03T12:00:00Z",
    mappingRevisionIso: null
  });
  assert.strictEqual(canAct, true);
});

test("missing comment timestamp → cannot act (defensive)", () => {
  const canAct = commentCanActOnMapping({
    commentCreatedAt: null,
    mappingRevisionIso: "2026-10-03T11:00:00Z"
  });
  assert.strictEqual(canAct, false);
});

// ── existingDecisionFor (already-decided protection) ───────────────
console.log("\nexistingDecisionFor (already-decided protection):");

test("returns existing decision when DOI matches", () => {
  const entry = { stableField: "doi", stableValue: "10.1/a" };
  const d = existingDecisionFor(entry, [{ doi: "10.1/a", status: "keep" }]);
  assert.ok(d);
  assert.strictEqual(d.status, "keep");
});

test("returns null when no decision matches entry", () => {
  const entry = { stableField: "doi", stableValue: "10.1/x" };
  const d = existingDecisionFor(entry, [{ doi: "10.1/a", status: "keep" }]);
  assert.strictEqual(d, null);
});

test("URL match is scheme/trailing-slash aware", () => {
  const entry = { stableField: "url", stableValue: "http://example.org/a" };
  const d = existingDecisionFor(entry, [{ url: "https://example.org/a/", status: "rejected" }]);
  assert.ok(d);
  assert.strictEqual(d.status, "rejected");
});

// ── Authorization check (string identity) ──────────────────────────
console.log("\nAuthorization constant:");

test("AUTHORIZED_USER is LaruX75", () => {
  assert.strictEqual(AUTHORIZED_USER, "LaruX75");
});

// ── Integration: full round trip ───────────────────────────────────
console.log("\nIntegration: comment → mapping → decision:");

test("full happy path with KEEP 2 against built body", () => {
  const body = buildIssueBody(pendingSample);
  const map = parseMappingFromBody(body);
  const { valid } = parseCommentCommands("KEEP 2\n");
  assert.strictEqual(valid.length, 1);
  const entry = map.entries.find(e => e.number === valid[0].number);
  const record = buildDecisionRecord({ action: valid[0].action, mappingEntry: entry });
  assert.strictEqual(record.status, "keep");
  assert.strictEqual(record.url, "https://portal.example/x");
  assert.strictEqual(record.id, "p-4");
});

test("stale number does not resolve to any entry", () => {
  const body = buildIssueBody(pendingSample);
  const map = parseMappingFromBody(body);
  const { valid } = parseCommentCommands("REJECT 99\n");
  const entry = map.entries.find(e => e.number === valid[0].number);
  assert.strictEqual(entry, undefined, "number 99 must not be in a 2-entry mapping");
});

// ── Summary ────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failed > 0) process.exit(1);
