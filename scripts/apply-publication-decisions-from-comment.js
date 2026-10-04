#!/usr/bin/env node
"use strict";

/**
 * Apply KEEP/REJECT decisions received as a GitHub Issue comment.
 *
 * Intended entrypoint: GitHub Actions workflow triggered by issue_comment
 * on the single open publication-review issue.
 *
 * Required env:
 *   GITHUB_TOKEN
 *   GITHUB_REPOSITORY            e.g. "owner/repo"
 *   GITHUB_EVENT_PATH            path to the event payload JSON
 *
 * Guarantees:
 *   - Only comments authored by LaruX75 are processed
 *   - Comment body is parsed as literal text, NEVER evaluated
 *   - Decisions written always carry a stable identifier (never id-only)
 *   - Changes committed to a new branch and surfaced as a PR
 *   - Never force-pushes
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const {
  AUTHORIZED_USER,
  parseMappingFromBody,
  parseCommentCommands,
  buildDecisionRecord,
  commentCanActOnMapping,
  existingDecisionFor,
  detectPending,
  loadDecisions
} = require(path.join(__dirname, "lib", "publication-review.js"));

const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;

if (!REPO || !TOKEN || !EVENT_PATH) {
  console.error("GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_EVENT_PATH must be set.");
  process.exit(1);
}

const DECISIONS_PATH = path.join(__dirname, "..", "src", "_data", "publication-decisions.json");
const DATA_PATH = path.join(__dirname, "..", "src", "_data", "scientificPublications.data.json");
const [OWNER, REPO_NAME] = REPO.split("/");

async function gh(method, pathSuffix, body) {
  const resp = await fetch(`https://api.github.com${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GenerationAI-publication-review/1.0"
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

async function postComment(issueNumber, body) {
  await gh("POST", `/repos/${OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`, { body });
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", ...opts }).trim();
}

async function main() {
  const event = JSON.parse(fs.readFileSync(EVENT_PATH, "utf8"));

  // ── Authorization ────────────────────────────────────────────────
  const author = event.comment?.user?.login || "";
  if (author !== AUTHORIZED_USER) {
    console.log(`Author "${author}" is not authorized; ignoring.`);
    return;
  }

  // Only process comments on open issues with the correct label
  const labels = (event.issue?.labels || []).map(l => (typeof l === "string" ? l : l.name));
  if (!labels.includes("publication-review")) {
    console.log("Comment is not on a publication-review issue; ignoring.");
    return;
  }
  if (event.issue?.state !== "open") {
    console.log("Issue is not open; ignoring.");
    return;
  }

  // ── Fetch issue body fresh (do not trust event payload for mapping) ──
  const issueNumber = event.issue.number;
  const freshIssue = await gh("GET", `/repos/${OWNER}/${REPO_NAME}/issues/${issueNumber}`);
  const mapping = parseMappingFromBody(freshIssue.body || "");
  if (!mapping) {
    console.log("No mapping block in issue body; ignoring.");
    await postComment(issueNumber, "⚠ Could not find decision mapping in this issue. Nothing processed.");
    return;
  }

  // ── Mapping freshness check ─────────────────────────────────────
  const canAct = commentCanActOnMapping({
    commentCreatedAt: event.comment.created_at,
    mappingRevisionIso: mapping.revision
  });
  if (!canAct) {
    console.log("Comment predates current mapping revision; ignoring and asking reviewer to repost.");
    await postComment(issueNumber,
      "⚠ The publication list was updated after this comment was posted. " +
      "Please re-check the current numbering and repost your decisions."
    );
    return;
  }

  // ── Parse commands ──────────────────────────────────────────────
  const commentBody = event.comment.body || "";
  const { valid, invalid } = parseCommentCommands(commentBody);
  if (!valid.length && !invalid.length) {
    console.log("Comment has no decision commands; ignoring.");
    return;
  }

  // ── Resolve commands against mapping ────────────────────────────
  const decisions = loadDecisions();
  const applied = [];
  const skipped = [];
  for (const cmd of valid) {
    const entry = mapping.entries.find(e => e.number === cmd.number);
    if (!entry) {
      skipped.push({ cmd, reason: `no entry for number ${cmd.number}` });
      continue;
    }
    if (!entry.stableField || !entry.stableValue) {
      skipped.push({ cmd, reason: `entry has no stable identifier` });
      continue;
    }
    const already = existingDecisionFor(entry, decisions);
    if (already) {
      skipped.push({ cmd, entry, reason: `already decided as ${already.status}` });
      continue;
    }
    applied.push({ cmd, entry });
  }

  if (!applied.length) {
    const lines = [];
    lines.push("No decisions were applied.");
    if (invalid.length) {
      lines.push("");
      lines.push("Unrecognized commands:");
      for (const i of invalid) lines.push(`- \`${i.line}\``);
    }
    if (skipped.length) {
      lines.push("");
      lines.push("Skipped:");
      for (const s of skipped) {
        lines.push(`- ${s.cmd.action} ${s.cmd.number}: ${s.reason}`);
      }
    }
    lines.push("");
    lines.push("Valid syntax: `KEEP <number>` or `REJECT <number>`, one decision per line.");
    await postComment(issueNumber, lines.join("\n"));
    return;
  }

  // ── Write decisions to a new branch + open PR ───────────────────
  // Load decisions file verbatim to preserve ordering/formatting outside the
  // added rows
  const decisionsRaw = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf8"));
  const prBranch = `publication-review/issue-${issueNumber}-${Date.now()}`;

  for (const { cmd, entry } of applied) {
    const reason = `Editorial decision via GitHub publication review issue #${issueNumber}`;
    const record = buildDecisionRecord({
      action: cmd.action,
      mappingEntry: entry,
      reason,
      decidedBy: AUTHORIZED_USER
    });
    decisionsRaw.decisions.push(record);
  }

  fs.writeFileSync(DECISIONS_PATH, JSON.stringify(decisionsRaw, null, 2) + "\n", "utf8");

  // Run tests + simulation BEFORE committing
  let testOutput = "";
  let simOutput = "";
  try {
    testOutput = run("node scripts/test-publication-decisions.js");
  } catch (err) {
    const stderr = (err.stderr && err.stderr.toString()) || "";
    const stdout = (err.stdout && err.stdout.toString()) || "";
    testOutput = stdout + "\n" + stderr;
    await postComment(issueNumber,
      `❌ Tests failed; no PR opened.\n\n\`\`\`\n${testOutput.slice(-1500)}\n\`\`\``
    );
    process.exit(1);
  }
  try {
    simOutput = run("node scripts/simulate-publication-decisions.js");
  } catch (err) {
    const stderr = (err.stderr && err.stderr.toString()) || "";
    const stdout = (err.stdout && err.stdout.toString()) || "";
    simOutput = stdout + "\n" + stderr;
    await postComment(issueNumber,
      `❌ Simulation failed; no PR opened.\n\n\`\`\`\n${simOutput.slice(-1500)}\n\`\`\``
    );
    process.exit(1);
  }

  // Commit on a new branch and push via GITHUB_TOKEN
  run(`git config user.email "github-actions[bot]@users.noreply.github.com"`);
  run(`git config user.name "github-actions[bot]"`);
  run(`git checkout -b "${prBranch}"`);
  run(`git add src/_data/publication-decisions.json`);
  const commitSubject = `fix: apply publication review decisions from issue #${issueNumber}`;
  const keepList = applied.filter(a => a.cmd.action === "KEEP").map(a => `  - #${a.cmd.number} ${a.entry.title}`).join("\n");
  const rejectList = applied.filter(a => a.cmd.action === "REJECT").map(a => `  - #${a.cmd.number} ${a.entry.title}`).join("\n");
  const bodyLines = [];
  if (keepList) { bodyLines.push("KEEP:"); bodyLines.push(keepList); }
  if (rejectList) { bodyLines.push(""); bodyLines.push("REJECT:"); bodyLines.push(rejectList); }
  const commitBody = bodyLines.join("\n");
  const commitMsg = commitBody ? `${commitSubject}\n\n${commitBody}` : commitSubject;
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  const remote = `https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO_NAME}.git`;
  run(`git push "${remote}" "${prBranch}":"${prBranch}"`);

  // Determine still-pending for PR body
  const rawRecords = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const nowDecisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf8")).decisions;
  const stillPending = detectPending(rawRecords, nowDecisions);

  const prBodyLines = [];
  prBodyLines.push(`Review publications from issue #${issueNumber}`);
  prBodyLines.push("");
  if (keepList) { prBodyLines.push("### KEEP"); prBodyLines.push(keepList); prBodyLines.push(""); }
  if (rejectList) { prBodyLines.push("### REJECT"); prBodyLines.push(rejectList); prBodyLines.push(""); }
  prBodyLines.push("### Validation");
  prBodyLines.push("```");
  prBodyLines.push(testOutput.split("\n").slice(-6).join("\n"));
  prBodyLines.push("");
  prBodyLines.push(simOutput.split("\n").slice(-8).join("\n"));
  prBodyLines.push("```");
  prBodyLines.push("");
  if (stillPending.length) {
    prBodyLines.push(`### Still pending: ${stillPending.length}`);
    for (const r of stillPending.slice(0, 20)) {
      prBodyLines.push(`- ${r.id} — ${(r.title || "").slice(0, 80)}`);
    }
    if (stillPending.length > 20) prBodyLines.push(`- …and ${stillPending.length - 20} more`);
  } else {
    prBodyLines.push("### Still pending: 0");
    prBodyLines.push("All pending publications have been reviewed.");
  }
  if (skipped.length) {
    prBodyLines.push("");
    prBodyLines.push("### Skipped commands");
    for (const s of skipped) {
      prBodyLines.push(`- ${s.cmd.action} ${s.cmd.number}: ${s.reason}`);
    }
  }
  if (invalid.length) {
    prBodyLines.push("");
    prBodyLines.push("### Invalid commands");
    for (const i of invalid) prBodyLines.push(`- \`${i.line}\``);
  }
  prBodyLines.push("");
  prBodyLines.push(`Closes nothing automatically; please review and merge if the validation above is green.`);

  const pr = await gh("POST", `/repos/${OWNER}/${REPO_NAME}/pulls`, {
    title: `Review publications from issue #${issueNumber}`,
    head: prBranch,
    base: "main",
    body: prBodyLines.join("\n"),
    maintainer_can_modify: true
  });

  // Reply on the issue
  const replyLines = [];
  replyLines.push("Accepted decisions:");
  replyLines.push("");
  for (const a of applied) replyLines.push(`- ${a.cmd.action} ${a.cmd.number} — ${a.entry.title}`);
  replyLines.push("");
  replyLines.push(`PR #${pr.number} opened.`);
  replyLines.push("");
  replyLines.push(`Remaining pending: ${stillPending.length}`);
  if (skipped.length) {
    replyLines.push("");
    replyLines.push("Skipped:");
    for (const s of skipped) replyLines.push(`- ${s.cmd.action} ${s.cmd.number}: ${s.reason}`);
  }
  if (invalid.length) {
    replyLines.push("");
    replyLines.push("Invalid syntax:");
    for (const i of invalid) replyLines.push(`- \`${i.line}\``);
  }
  await postComment(issueNumber, replyLines.join("\n"));
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
