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

function normalizeSourceId(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

function normalizeUrl(raw) {
  if (!raw) return "";
  let u = String(raw).trim().toLowerCase();
  if (u.startsWith("http://")) u = "https://" + u.slice(7);
  u = u.replace(/\/+$/, "");
  return u;
}

function derivePublicationSourceId(publication) {
  if (publication.sourceId) return normalizeSourceId(publication.sourceId);
  if (publication.isbn) {
    return normalizeSourceId(buildSourceId("isbn", String(publication.isbn).replace(/[-\s]/g, "")));
  }
  return "";
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

/**
 * Match priority:
 *   1. primary DOI
 *   2. alias DOI
 *   3. sourceId        (also derived from publication.isbn when available)
 *   4. primary URL
 *   5. alias URL
 *   6. exact fallbackKey
 *   7. local id        (last-resort fallback — volatile)
 */
function findPublicationDecision(publication, decisions) {
  if (!Array.isArray(decisions) || !decisions.length) return null;

  const doi = normalizeDoi(publication.doi);
  const sourceId = derivePublicationSourceId(publication);
  const url = normalizeUrl(publication.url);
  const fallbackKey = buildFallbackKey(publication.title, publication.year, publication.authorsText);
  const pubId = publication.id ? String(publication.id) : "";

  if (doi) {
    for (const decision of decisions) {
      if (decision.doi && normalizeDoi(decision.doi) === doi) return decision;
    }
    for (const decision of decisions) {
      if (decision.aliasDoi && normalizeDoi(decision.aliasDoi) === doi) return decision;
    }
  }

  if (sourceId) {
    for (const decision of decisions) {
      if (decision.sourceId && normalizeSourceId(decision.sourceId) === sourceId) return decision;
    }
  }

  if (url) {
    for (const decision of decisions) {
      if (decision.url && normalizeUrl(decision.url) === url) return decision;
    }
    for (const decision of decisions) {
      if (decision.aliasUrl && normalizeUrl(decision.aliasUrl) === url) return decision;
    }
  }

  if (fallbackKey && fallbackKey !== "||") {
    for (const decision of decisions) {
      if (decision.fallbackKey && String(decision.fallbackKey).trim() === fallbackKey) return decision;
    }
  }

  if (pubId) {
    for (const decision of decisions) {
      if (decision.id && decision.id === pubId) return decision;
    }
  }

  return null;
}

module.exports = {
  DECISIONS_PATH,
  normalizeDoi,
  normalizeTitle,
  normalizeUrl,
  normalizeSourceId,
  firstAuthorName,
  buildFallbackKey,
  buildSourceId,
  derivePublicationSourceId,
  loadDecisions,
  findPublicationDecision
};
