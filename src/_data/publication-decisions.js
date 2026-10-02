"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DECISIONS_PATH = path.join(__dirname, "publication-decisions.json");

function normalizeDoi(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase()
    .trim();
}

function normalizeTitle(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function firstAuthorName(authorsText) {
  if (!authorsText) return "";
  const parts = String(authorsText).split(/;\s*|\s*&\s*/);
  return (parts[0] || "").trim().toLowerCase();
}

function buildFallbackKey(title, year, authorsText) {
  return [
    normalizeTitle(title),
    String(year || "").trim(),
    firstAuthorName(authorsText)
  ].join("|");
}

function buildSourceId(source, stableId) {
  if (!source || !stableId) return "";
  return `${source}:${String(stableId).trim()}`;
}

function loadDecisions() {
  try {
    const raw = fs.readFileSync(DECISIONS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.decisions) ? parsed.decisions : [];
  } catch {
    return [];
  }
}

function findPublicationDecision(publication, decisions) {
  if (!Array.isArray(decisions) || !decisions.length) return null;

  const doi = normalizeDoi(publication.doi);
  const sourceId = publication.sourceId ? String(publication.sourceId).trim().toLowerCase() : "";
  const url = publication.url ? String(publication.url).trim().toLowerCase() : "";
  const fallbackKey = buildFallbackKey(publication.title, publication.year, publication.authorsText);

  for (const decision of decisions) {
    if (decision.id && publication.id && decision.id === publication.id) {
      return decision;
    }
    if (decision.doi && doi && normalizeDoi(decision.doi) === doi) {
      return decision;
    }
    if (decision.sourceId && sourceId && String(decision.sourceId).trim().toLowerCase() === sourceId) {
      return decision;
    }
    if (decision.url && url && String(decision.url).trim().toLowerCase() === url) {
      return decision;
    }
    if (decision.fallbackKey && fallbackKey && String(decision.fallbackKey).trim() === fallbackKey) {
      return decision;
    }
    if (decision.aliasDoi && doi && normalizeDoi(decision.aliasDoi) === doi) {
      return decision;
    }
    if (decision.aliasUrl && url && String(decision.aliasUrl).trim().toLowerCase() === url) {
      return decision;
    }
  }

  return null;
}

module.exports = {
  DECISIONS_PATH,
  normalizeDoi,
  normalizeTitle,
  firstAuthorName,
  buildFallbackKey,
  buildSourceId,
  loadDecisions,
  findPublicationDecision
};
