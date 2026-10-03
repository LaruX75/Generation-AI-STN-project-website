#!/usr/bin/env node
"use strict";

/**
 * Stability simulation for publication-decisions matching.
 * All simulations are in-memory — raw data file is never modified.
 *
 * Reports:
 *   - id-less matching (publication.id removed)
 *   - id-regeneration matching (publication.id replaced with a new string)
 *   - re-import protection (new local id, same stable identifier)
 */

const path = require("node:path");

const { findPublicationDecision, loadDecisions } = require("../src/_data/publication-decisions.js");
const rawRecords = require(path.join(__dirname, "..", "src", "_data", "scientificPublications.data.json"));

const decisions = loadDecisions();

function countMatches(records) {
  const result = { reject: 0, keep: 0, unmatched: [] };
  for (const r of records) {
    const d = findPublicationDecision(r, decisions);
    if (!d) { result.unmatched.push(r); continue; }
    if (d.status === "rejected") result.reject++;
    else if (d.status === "keep") result.keep++;
  }
  return result;
}

function sameDecisionId(decA, decB) {
  if (!decA || !decB) return decA === decB;
  const keyA = decA.doi || decA.sourceId || decA.url || decA.fallbackKey || decA.id;
  const keyB = decB.doi || decB.sourceId || decB.url || decB.fallbackKey || decB.id;
  return keyA === keyB;
}

const baseline = countMatches(rawRecords);
console.log("BASELINE (with ids intact):");
console.log(`  reject: ${baseline.reject}  keep: ${baseline.keep}  unmatched: ${baseline.unmatched.length}`);

const noId = rawRecords.map(r => ({ ...r, id: undefined }));
const noIdMatches = countMatches(noId);
console.log("\nID DROPPED (publication.id removed):");
console.log(`  reject matched without id: ${noIdMatches.reject} / ${baseline.reject}`);
console.log(`  keep   matched without id: ${noIdMatches.keep} / ${baseline.keep}`);
console.log(`  unmatched: ${noIdMatches.unmatched.length}`);
if (noIdMatches.unmatched.length) {
  console.log("  unmatched sample:");
  for (const r of noIdMatches.unmatched.slice(0, 10)) {
    console.log(`    - ${r.id} :: ${(r.title || "").slice(0, 70)}`);
  }
}

const unmatchedByStatus = { reject: 0, keep: 0, none: 0 };
for (const r of noIdMatches.unmatched) {
  const baselineDecision = findPublicationDecision(r, decisions);
  if (!baselineDecision) unmatchedByStatus.none++;
  else if (baselineDecision.status === "rejected") unmatchedByStatus.reject++;
  else if (baselineDecision.status === "keep") unmatchedByStatus.keep++;
}
console.log(`  unresolved REJECT id-only (lost without id): ${unmatchedByStatus.reject}`);
console.log(`  unresolved KEEP   id-only (lost without id): ${unmatchedByStatus.keep}`);

const regen = rawRecords.map(r => ({ ...r, id: `regen-${r.id}` }));
const regenMatches = countMatches(regen);

let surviving = 0;
let lost = 0;
let falsePositive = 0;
for (const r of rawRecords) {
  const regenRec = { ...r, id: `regen-${r.id}` };
  const original = findPublicationDecision(r, decisions);
  const after = findPublicationDecision(regenRec, decisions);
  if (!original && !after) continue;
  if (!original && after) { falsePositive++; continue; }
  if (original && !after) { lost++; continue; }
  if (sameDecisionId(original, after)) surviving++;
  else falsePositive++;
}
console.log("\nID REGENERATED (publication.id -> `regen-<old>`):");
console.log(`  reject: ${regenMatches.reject}  keep: ${regenMatches.keep}  unmatched: ${regenMatches.unmatched.length}`);
console.log(`  matches surviving id regeneration: ${surviving} / 563`);
console.log(`  lost matches: ${lost}`);
console.log(`  false positives: ${falsePositive}`);

const reversed = [...decisions].reverse();
let orderDependent = 0;
for (const r of rawRecords) {
  const forwardMatch = findPublicationDecision(r, decisions);
  const reverseMatch = findPublicationDecision(r, reversed);
  if (!forwardMatch && !reverseMatch) continue;
  if (!forwardMatch || !reverseMatch) { orderDependent++; continue; }
  if (forwardMatch.status !== reverseMatch.status) orderDependent++;
}
console.log("\nDECISION LIST REVERSED:");
console.log(`  order-dependent status differences: ${orderDependent}`);

let reimportProtected = 0;
let reimportLost = 0;
for (const r of rawRecords) {
  const original = findPublicationDecision(r, decisions);
  if (!original || original.status !== "rejected") continue;
  const reimported = { ...r, id: `reimport-${r.id}` };
  const after = findPublicationDecision(reimported, decisions);
  if (after && after.status === "rejected" && sameDecisionId(original, after)) {
    reimportProtected++;
  } else {
    reimportLost++;
  }
}
console.log("\nRE-IMPORT PROTECTION (REJECT re-arriving with a new local id):");
console.log(`  re-import protected REJECT: ${reimportProtected} / ${baseline.reject}`);
console.log(`  re-import LOST (would resurface): ${reimportLost}`);
