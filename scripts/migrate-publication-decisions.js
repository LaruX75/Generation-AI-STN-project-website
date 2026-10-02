#!/usr/bin/env node
"use strict";

/**
 * Backfill persistent identifiers into publication decisions that currently
 * rely on the volatile local `id`. For every decision that matches a current
 * raw record only by `id`, add the strongest available stable identifier
 * (doi > url > sourceId:isbn > fallbackKey). Status and reason are preserved.
 *
 * Usage:
 *   node scripts/migrate-publication-decisions.js            # dry run (default)
 *   node scripts/migrate-publication-decisions.js --write    # write back to disk
 */

const fs = require("node:fs");
const path = require("node:path");

const {
  normalizeDoi,
  buildFallbackKey,
  buildSourceId,
  DECISIONS_PATH
} = require("../src/_data/publication-decisions.js");

const RAW_PATH = path.join(__dirname, "..", "src", "_data", "scientificPublications.data.json");

const writeMode = process.argv.includes("--write");

function normalizeUrl(raw) {
  if (!raw) return "";
  return String(raw).trim();
}

function hasStableIdentifier(decision) {
  return Boolean(decision.doi || decision.sourceId || decision.url || decision.fallbackKey);
}

function buildRawUrlCounts(rawRecords) {
  const counts = new Map();
  for (const r of rawRecords) {
    const url = normalizeUrl(r.url);
    if (!url) continue;
    counts.set(url, (counts.get(url) || 0) + 1);
  }
  return counts;
}

function pickStableIdentifier(rawRecord, rawUrlCounts) {
  const doi = normalizeDoi(rawRecord.doi);
  if (doi) return { field: "doi", value: doi };

  const url = normalizeUrl(rawRecord.url);
  if (url && (rawUrlCounts.get(url) || 0) === 1) {
    return { field: "url", value: url };
  }

  if (rawRecord.isbn) {
    const sourceId = buildSourceId("isbn", String(rawRecord.isbn).replace(/[-\s]/g, ""));
    if (sourceId) return { field: "sourceId", value: sourceId };
  }

  const fallback = buildFallbackKey(rawRecord.title, rawRecord.year, rawRecord.authorsText);
  if (fallback && fallback !== "||") return { field: "fallbackKey", value: fallback };

  if (url) return { field: "url", value: url };

  return null;
}

function main() {
  const decisionsRaw = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf8"));
  const decisions = decisionsRaw.decisions;
  const rawRecords = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
  const rawById = new Map(rawRecords.map(r => [r.id, r]));
  const rawUrlCounts = buildRawUrlCounts(rawRecords);

  const report = {
    total: decisions.length,
    idOnlyBefore: 0,
    idOnlyAfter: 0,
    backfilled: { doi: 0, url: 0, sourceId: 0, fallbackKey: 0 },
    unresolved: []
  };

  const migrated = decisions.map(decision => {
    if (hasStableIdentifier(decision)) return decision;
    if (!decision.id) return decision;

    report.idOnlyBefore++;

    const rawRecord = rawById.get(decision.id);
    if (!rawRecord) {
      report.unresolved.push({
        id: decision.id,
        status: decision.status,
        reason: decision.reason,
        why: "no matching raw record"
      });
      report.idOnlyAfter++;
      return decision;
    }

    const stable = pickStableIdentifier(rawRecord, rawUrlCounts);
    if (!stable) {
      report.unresolved.push({
        id: decision.id,
        status: decision.status,
        reason: decision.reason,
        why: "raw record has no usable identifier"
      });
      report.idOnlyAfter++;
      return decision;
    }

    report.backfilled[stable.field]++;

    const next = { ...decision };
    const insertAfter = ["status", "reason", "date", "decidedAt", "decidedBy"];
    const ordered = {};
    for (const key of Object.keys(next)) {
      if (key === "id") continue;
      ordered[key] = next[key];
    }
    ordered[stable.field] = stable.value;
    if (next.id) ordered.id = next.id;

    const final = {};
    for (const key of ["status", "reason", "date", "decidedAt", "decidedBy"]) {
      if (ordered[key] !== undefined) final[key] = ordered[key];
    }
    for (const key of ["doi", "aliasDoi", "sourceId", "aliasSourceId", "url", "aliasUrl", "fallbackKey", "aliasFallbackKey", "aliasOf", "id"]) {
      if (ordered[key] !== undefined) final[key] = ordered[key];
    }
    for (const key of Object.keys(ordered)) {
      if (final[key] === undefined) final[key] = ordered[key];
    }
    return final;
  });

  const migratedById = {
    reject: migrated.filter(d => d.status === "rejected").length,
    keep: migrated.filter(d => d.status === "keep").length,
    total: migrated.length,
    stillIdOnly: migrated.filter(d => !hasStableIdentifier(d) && d.id).length
  };

  console.log("Migration report");
  console.log("================");
  console.log(JSON.stringify({
    total: report.total,
    idOnlyBefore: report.idOnlyBefore,
    idOnlyAfter: report.idOnlyAfter,
    backfilled: report.backfilled,
    postMigration: migratedById,
    unresolvedCount: report.unresolved.length
  }, null, 2));
  if (report.unresolved.length) {
    console.log("\nUnresolved id-only decisions:");
    for (const x of report.unresolved) {
      console.log(`  - ${x.id} [${x.status}] ${x.why} :: ${x.reason}`);
    }
  }

  if (writeMode) {
    const output = { ...decisionsRaw, decisions: migrated };
    fs.writeFileSync(DECISIONS_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
    console.log(`\nWrote ${DECISIONS_PATH}`);
  } else {
    console.log("\n(dry run — pass --write to persist)");
  }
}

main();
