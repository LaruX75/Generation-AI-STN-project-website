#!/usr/bin/env node
"use strict";

/**
 * Open/update/close the single GitHub Issue that lists publications
 * waiting for a KEEP/REJECT decision.
 *
 * Intended to be invoked at the end of the scheduled sync workflow:
 *
 *   node scripts/update-publication-review-issue.js
 *
 * Requires environment:
 *   GITHUB_TOKEN         — token with issues:write (GITHUB_TOKEN is enough)
 *   GITHUB_REPOSITORY    — e.g. "LaruX75/Generation-AI-STN-project-website"
 *
 * Behavior:
 *   - detects pending publications
 *   - looks for an open issue with label publication-review
 *   - if pending > 0:
 *       * reuses the open issue if one exists (updates title + body)
 *       * otherwise creates a new one
 *       * assigns LaruX75
 *   - if pending == 0:
 *       * if an open review issue exists, closes it with a "all reviewed" comment
 *       * otherwise does nothing
 *
 * Never evaluates arbitrary strings. Writes nothing to publication-decisions.json.
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  detectPending,
  buildIssueBody,
  loadDecisions,
  AUTHORIZED_USER
} = require(path.join(__dirname, "lib", "publication-review.js"));

const DATA_PATH = path.join(__dirname, "..", "src", "_data", "scientificPublications.data.json");
const LABEL = "publication-review";
const TITLE_PREFIX = "Publication review required";

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;

if (!token || !repo) {
  console.error("GITHUB_TOKEN and GITHUB_REPOSITORY must be set.");
  process.exit(1);
}

const [owner, repoName] = repo.split("/");

async function gh(method, pathSuffix, body) {
  const url = `https://api.github.com${pathSuffix}`;
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": `GenerationAI-publication-review/1.0`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`GitHub API ${method} ${pathSuffix} → ${resp.status}: ${txt.slice(0, 400)}`);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

async function findOpenReviewIssue() {
  const res = await gh(
    "GET",
    `/repos/${owner}/${repoName}/issues?state=open&labels=${encodeURIComponent(LABEL)}&per_page=10`
  );
  return Array.isArray(res) && res.length ? res[0] : null;
}

async function ensureLabel() {
  try {
    await gh("GET", `/repos/${owner}/${repoName}/labels/${encodeURIComponent(LABEL)}`);
  } catch {
    await gh("POST", `/repos/${owner}/${repoName}/labels`, {
      name: LABEL,
      color: "fbca04",
      description: "Publication awaiting editorial KEEP/REJECT decision"
    });
  }
}

async function main() {
  const rawRecords = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const decisions = loadDecisions();
  const pending = detectPending(rawRecords, decisions);

  console.log(`Pending: ${pending.length}`);

  await ensureLabel();
  const existing = await findOpenReviewIssue();

  if (pending.length === 0) {
    if (existing) {
      console.log(`Closing issue #${existing.number} — nothing pending`);
      await gh("POST", `/repos/${owner}/${repoName}/issues/${existing.number}/comments`, {
        body: "All currently discovered publications have been reviewed. Closing."
      });
      await gh("PATCH", `/repos/${owner}/${repoName}/issues/${existing.number}`, {
        state: "closed",
        state_reason: "completed"
      });
    } else {
      console.log("No open review issue; nothing to do.");
    }
    return;
  }

  const title = `${TITLE_PREFIX} — ${pending.length} pending`;
  const body = buildIssueBody(pending);

  if (existing) {
    console.log(`Updating issue #${existing.number}`);
    await gh("PATCH", `/repos/${owner}/${repoName}/issues/${existing.number}`, {
      title,
      body
    });
    // Ensure assignee stays set (idempotent)
    const existingAssignees = (existing.assignees || []).map(a => a.login);
    if (!existingAssignees.includes(AUTHORIZED_USER)) {
      try {
        await gh("POST", `/repos/${owner}/${repoName}/issues/${existing.number}/assignees`, {
          assignees: [AUTHORIZED_USER]
        });
      } catch (err) {
        console.warn(`Could not assign ${AUTHORIZED_USER}: ${err.message}`);
      }
    }
  } else {
    console.log("Creating new review issue");
    const created = await gh("POST", `/repos/${owner}/${repoName}/issues`, {
      title,
      body,
      labels: [LABEL],
      assignees: [AUTHORIZED_USER]
    });
    console.log(`Created issue #${created.number}`);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
