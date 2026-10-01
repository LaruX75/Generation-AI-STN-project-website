#!/usr/bin/env node
"use strict";

/**
 * Testaa publication-decisions-mekanismia:
 * - DOI-matching
 * - sourceId-matching
 * - fallback-key matching
 * - Idempotenssi (rejected ei palaa syncin jälkeen)
 * - Nykyiset julkaisut ilman päätöstä eivät katoa
 * - Renderöinnin rejected-suodatus
 */

const assert = require("node:assert");
const path = require("node:path");

const {
  normalizeDoi,
  buildFallbackKey,
  buildSourceId,
  findPublicationDecision
} = require("../src/_data/publication-decisions.js");

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

console.log("publication-decisions tests\n");

// ── normalizeDoi ──────────────────────────────────────────────────────
console.log("normalizeDoi:");

test("strips https://doi.org/ prefix", () => {
  assert.strictEqual(normalizeDoi("https://doi.org/10.1234/abc"), "10.1234/abc");
});

test("strips http://doi.org/ prefix", () => {
  assert.strictEqual(normalizeDoi("http://doi.org/10.1234/abc"), "10.1234/abc");
});

test("strips dx.doi.org prefix", () => {
  assert.strictEqual(normalizeDoi("https://dx.doi.org/10.1234/abc"), "10.1234/abc");
});

test("strips doi: prefix", () => {
  assert.strictEqual(normalizeDoi("doi:10.1234/abc"), "10.1234/abc");
});

test("lowercases", () => {
  assert.strictEqual(normalizeDoi("10.1234/ABC"), "10.1234/abc");
});

test("returns empty for null/undefined", () => {
  assert.strictEqual(normalizeDoi(null), "");
  assert.strictEqual(normalizeDoi(undefined), "");
  assert.strictEqual(normalizeDoi(""), "");
});

// ── buildFallbackKey ──────────────────────────────────────────────────
console.log("\nbuildFallbackKey:");

test("normalizes title whitespace and case", () => {
  const key = buildFallbackKey("  Hello   World  ", 2024, "Smith, J");
  assert.strictEqual(key, "hello world|2024|smith, j");
});

test("extracts first author", () => {
  const key = buildFallbackKey("Title", 2024, "Smith, J.; Doe, A.");
  assert.strictEqual(key, "title|2024|smith, j.");
});

test("handles missing year", () => {
  const key = buildFallbackKey("Title", null, "Smith, J");
  assert.strictEqual(key, "title||smith, j");
});

// ── buildSourceId ─────────────────────────────────────────────────────
console.log("\nbuildSourceId:");

test("builds openalex sourceId", () => {
  assert.strictEqual(buildSourceId("openalex", "W123456789"), "openalex:W123456789");
});

test("builds orcid sourceId", () => {
  assert.strictEqual(buildSourceId("orcid", "0000-0001-2345-6789:123456"), "orcid:0000-0001-2345-6789:123456");
});

test("returns empty for missing args", () => {
  assert.strictEqual(buildSourceId("", "W123"), "");
  assert.strictEqual(buildSourceId("openalex", ""), "");
});

// ── findPublicationDecision ───────────────────────────────────────────
console.log("\nfindPublicationDecision:");

const decisions = [
  { doi: "10.1000/a", status: "rejected", reason: "test", date: "2026-01-01" },
  { sourceId: "openalex:W999", status: "approved", reason: "test", date: "2026-01-01" },
  { url: "https://uef.cris.fi/publications/abc123", status: "review", reason: "test", date: "2026-01-01" },
  { fallbackKey: "some title|2024|john smith", status: "rejected", reason: "test", date: "2026-01-01" }
];

test("matches by DOI (with https prefix)", () => {
  const pub = { doi: "https://doi.org/10.1000/a", title: "X", year: 2024, authorsText: "A" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d.status, "rejected");
});

test("matches by DOI (case-insensitive)", () => {
  const pub = { doi: "10.1000/A", title: "X", year: 2024, authorsText: "A" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d.status, "rejected");
});

test("matches by sourceId", () => {
  const pub = { doi: "", title: "Y", year: 2024, authorsText: "B", sourceId: "openalex:W999" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d.status, "approved");
});

test("matches by sourceId (case-insensitive)", () => {
  const pub = { doi: "", title: "Y", year: 2024, authorsText: "B", sourceId: "OPENALEX:W999" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d.status, "approved");
});

test("matches by url", () => {
  const pub = { doi: "", title: "Z", year: 2024, authorsText: "C", url: "https://uef.cris.fi/publications/abc123" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d.status, "review");
});

test("matches by fallbackKey (no DOI, no sourceId, no url)", () => {
  const pub = { doi: "", title: "  Some   Title ", year: 2024, authorsText: "John Smith; Jane Doe" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d.status, "rejected");
});

test("returns null when no match", () => {
  const pub = { doi: "10.9999/unknown", title: "New", year: 2025, authorsText: "Unknown" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d, null);
});

test("returns null for empty decisions array", () => {
  const pub = { doi: "10.1000/a", title: "X", year: 2024, authorsText: "A" };
  const d = findPublicationDecision(pub, []);
  assert.strictEqual(d, null);
});

test("DOI matching takes priority over fallback", () => {
  const d = findPublicationDecision(
    { doi: "10.1000/a", title: "Some Title", year: 2024, authorsText: "John Smith" },
    decisions
  );
  assert.strictEqual(d.doi, "10.1000/a");
});

test("title change but same sourceId still matches", () => {
  const d = findPublicationDecision(
    { doi: "", title: "Completely Different Title", year: 2024, authorsText: "B", sourceId: "openalex:W999" },
    decisions
  );
  assert.strictEqual(d.status, "approved");
});

// ── Simulated idempotency scenario ────────────────────────────────────
console.log("\nIdempotency simulation:");

test("rejected pub is not re-imported (simulated)", () => {
  // 1. API returns publication X
  const apiPub = {
    doi: "10.5555/simulated",
    title: "Simulated Publication X",
    year: 2026,
    authorsText: "Author, A.",
    sourceId: "openalex:W777777",
    url: ""
  };

  // 2. X is imported (would be in scientificPublications.data.json)
  // 3. X is marked rejected
  const rejDecisions = [{ doi: "10.5555/simulated", status: "rejected", reason: "test", date: "2026-01-01" }];

  // 4. X is removed from data file
  const existingDois = new Set();
  const existingTitles = new Set();

  // 5. Sync runs — X should be skipped
  const doi = normalizeDoi(apiPub.doi);
  const title = apiPub.title.toLowerCase().trim();

  let wouldAdd = true;
  if (doi && existingDois.has(doi)) wouldAdd = false;
  if (title && existingTitles.has(title)) wouldAdd = false;
  if (wouldAdd) {
    const candidate = {
      doi,
      title: apiPub.title,
      year: apiPub.year,
      authorsText: apiPub.authorsText,
      sourceId: apiPub.sourceId,
      url: apiPub.url
    };
    const decision = findPublicationDecision(candidate, rejDecisions);
    if (decision?.status === "rejected") wouldAdd = false;
  }

  assert.strictEqual(wouldAdd, false, "Rejected publication should not be re-imported");
});

test("removing rejected decision allows re-import", () => {
  const apiPub = {
    doi: "10.5555/simulated",
    title: "Simulated Publication X",
    year: 2026,
    authorsText: "Author, A.",
    sourceId: "openalex:W777777",
    url: ""
  };

  // 9. Rejected decision is removed
  const emptyDecisions = [];

  const existingDois = new Set();
  const existingTitles = new Set();

  let wouldAdd = true;
  const doi = normalizeDoi(apiPub.doi);
  const title = apiPub.title.toLowerCase().trim();

  if (doi && existingDois.has(doi)) wouldAdd = false;
  if (title && existingTitles.has(title)) wouldAdd = false;
  if (wouldAdd) {
    const candidate = {
      doi,
      title: apiPub.title,
      year: apiPub.year,
      authorsText: apiPub.authorsText,
      sourceId: apiPub.sourceId,
      url: apiPub.url
    };
    const decision = findPublicationDecision(candidate, emptyDecisions);
    if (decision?.status === "rejected") wouldAdd = false;
  }

  assert.strictEqual(wouldAdd, true, "Publication should be importable after decision removal");
});

test("no decision = normal behavior (pub is added)", () => {
  const apiPub = {
    doi: "10.1111/new-pub",
    title: "Brand New Publication",
    year: 2026,
    authorsText: "New, A.",
    sourceId: "openalex:W888888",
    url: ""
  };

  const decisions = [];
  const existingDois = new Set(["10.2222/other"]);
  const existingTitles = new Set(["other title"]);

  const doi = normalizeDoi(apiPub.doi);
  const title = apiPub.title.toLowerCase().trim();

  let wouldAdd = true;
  if (doi && existingDois.has(doi)) wouldAdd = false;
  if (title && existingTitles.has(title)) wouldAdd = false;
  if (wouldAdd) {
    const candidate = { doi, title: apiPub.title, year: apiPub.year, authorsText: apiPub.authorsText, sourceId: apiPub.sourceId, url: apiPub.url };
    const decision = findPublicationDecision(candidate, decisions);
    if (decision?.status === "rejected") wouldAdd = false;
  }

  assert.strictEqual(wouldAdd, true, "Publication without decision should be importable");
});

// ── Render filter simulation ──────────────────────────────────────────
console.log("\nRender filter:");

test("rejected pub is filtered from render", () => {
  const records = [
    { id: "1", doi: "10.1000/a", title: "Rejected Pub", year: 2024, authorsText: "A", status: "Published" },
    { id: "2", doi: "10.1000/b", title: "Kept Pub", year: 2024, authorsText: "B", status: "Published" }
  ];
  const decisions = [{ doi: "10.1000/a", status: "rejected", reason: "x", date: "2026-01-01" }];

  const filtered = records.filter(record => {
    const decision = findPublicationDecision(record, decisions);
    return decision?.status !== "rejected";
  });

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].title, "Kept Pub");
});

test("pub without decision is kept in render", () => {
  const records = [
    { id: "1", doi: "10.1000/c", title: "No Decision Pub", year: 2024, authorsText: "C", status: "Published" }
  ];
  const decisions = [{ doi: "10.1000/a", status: "rejected", reason: "x", date: "2026-01-01" }];

  const filtered = records.filter(record => {
    const decision = findPublicationDecision(record, decisions);
    return decision?.status !== "rejected";
  });

  assert.strictEqual(filtered.length, 1);
});

test("review status does NOT filter out", () => {
  const records = [
    { id: "1", doi: "10.1000/r", title: "Review Pub", year: 2024, authorsText: "R", status: "Published" }
  ];
  const decisions = [{ doi: "10.1000/r", status: "review", reason: "x", date: "2026-01-01" }];

  const filtered = records.filter(record => {
    const decision = findPublicationDecision(record, decisions);
    return decision?.status !== "rejected";
  });

  assert.strictEqual(filtered.length, 1, "Review status should not filter out the publication");
});

test("approved status does NOT filter out", () => {
  const records = [
    { id: "1", doi: "10.1000/ap", title: "Approved Pub", year: 2024, authorsText: "A", status: "Published" }
  ];
  const decisions = [{ doi: "10.1000/ap", status: "approved", reason: "x", date: "2026-01-01" }];

  const filtered = records.filter(record => {
    const decision = findPublicationDecision(record, decisions);
    return decision?.status !== "rejected";
  });

  assert.strictEqual(filtered.length, 1, "Approved status should not filter out the publication");
});

// ── Same publication from two sources ─────────────────────────────────
console.log("\nSame publication from two sources:");

test("DOI match across sources prevents duplicate", () => {
  const pub1 = { doi: "10.3333/same", title: "Same Pub", year: 2025, authorsText: "X", sourceId: "openalex:W111" };
  const pub2 = { doi: "https://doi.org/10.3333/same", title: "Same Pub", year: 2025, authorsText: "X", sourceId: "orcid:0000-0002-1111:222" };

  const doi1 = normalizeDoi(pub1.doi);
  const doi2 = normalizeDoi(pub2.doi);
  assert.strictEqual(doi1, doi2, "Both DOIs should normalize to the same value");
});

test("sourceId match across sources", () => {
  const decisions = [{ sourceId: "openalex:W111", status: "rejected", reason: "x", date: "2026-01-01" }];
  const pub = { doi: "", title: "No DOI Pub", year: 2025, authorsText: "X", sourceId: "openalex:W111" };
  const d = findPublicationDecision(pub, decisions);
  assert.strictEqual(d?.status, "rejected");
});

// ── Summary ───────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failed > 0) {
  process.exit(1);
}
