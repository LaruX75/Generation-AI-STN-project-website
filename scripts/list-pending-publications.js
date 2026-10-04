#!/usr/bin/env node
"use strict";

/**
 * List publications that currently have NO KEEP and NO REJECT decision.
 * These are the publications held back from the public site by the
 * explicit-KEEP render gate until a reviewer decides.
 *
 * Usage:
 *   node scripts/list-pending-publications.js              # pretty text
 *   node scripts/list-pending-publications.js --json       # machine-readable JSON
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  detectPending,
  pickStableIdentifier,
  loadDecisions
} = require(path.join(__dirname, "lib", "publication-review.js"));

const DATA_PATH = path.join(__dirname, "..", "src", "_data", "scientificPublications.data.json");

const asJson = process.argv.includes("--json");

const rawRecords = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const decisions = loadDecisions();
const pending = detectPending(rawRecords, decisions);

if (asJson) {
  const payload = pending.map((r, i) => {
    const stable = pickStableIdentifier(r);
    return {
      number: i + 1,
      id: r.id,
      title: r.title || "",
      authors: r.authorsText || "",
      year: r.year || null,
      doi: r.doi || "",
      url: r.url || "",
      sourceId: r.sourceId || "",
      fallbackKey: stable && stable.field === "fallbackKey" ? stable.value : "",
      stableField: stable ? stable.field : null,
      stableValue: stable ? stable.value : null
    };
  });
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  return;
}

console.log(`Pending publications: ${pending.length}`);
console.log("");
for (let i = 0; i < pending.length; i++) {
  const r = pending[i];
  const stable = pickStableIdentifier(r);
  console.log(`${i + 1}. ${r.title || "(no title)"}`);
  if (r.authorsText) console.log(`   Authors: ${r.authorsText}`);
  if (r.year) console.log(`   Year: ${r.year}`);
  if (r.doi) console.log(`   DOI: ${r.doi}`);
  if (r.url) console.log(`   URL: ${r.url}`);
  console.log(`   Raw ID: ${r.id}`);
  console.log(`   Decision basis: ${stable ? stable.field : "NONE"}`);
  console.log("");
}
