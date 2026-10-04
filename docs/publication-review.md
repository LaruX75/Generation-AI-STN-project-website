# Publication review flow

Generation AI's public publication list is **curated**, not auto-imported.
A publication appears on the site only after an **explicit editorial KEEP**
decision has been recorded in `src/_data/publication-decisions.json`.
Everything else — rejected publications, newly discovered publications
waiting for review — stays hidden from the public site.

Reviews are driven by a GitHub Issue plus `KEEP n` / `REJECT n` comments.

## How it works

1. **Scheduled sync** (Mondays, `.github/workflows/sync-publications.yml`)
   fetches new candidates from OpenAlex + Research.fi and appends them to
   `src/_data/scientificPublications.data.json`. The sync already skips any
   candidate that has an existing REJECT decision.
2. The same workflow then runs `scripts/update-publication-review-issue.js`,
   which:
   - detects **pending** publications (no KEEP, no REJECT) via
     `scripts/lib/publication-review.js` → `detectPending`
   - updates (or opens, if missing) the single open issue with label
     `publication-review`
   - assigns it to `LaruX75`
   - writes a numbered pending list AND a machine-safe mapping block as an
     HTML comment at the end of the body
   - if nothing is pending, closes the open issue instead
3. The reviewer comments on the issue with one decision per line:
   ```
   KEEP 1
   REJECT 2
   KEEP 3
   ```
   Commands are case-insensitive. Partial lists are fine — undecided
   items simply stay pending.
4. GitHub webhooks fire `.github/workflows/publication-review-comment.yml`
   which runs `scripts/apply-publication-decisions-from-comment.js`. It:
   - **requires** `comment.user.login === "LaruX75"` (workflow `if:` guard
     + authorization constant inside the script)
   - re-fetches the issue body (not trusting the webhook payload for the
     mapping)
   - checks that the comment was created at or after the current mapping's
     revision timestamp — if not, replies "mapping changed, please repost"
   - parses the comment with a strict regex `^\s*(keep|reject)\s+(\d+)\s*$`
     — nothing is ever evaluated
   - resolves each number against the mapping entries and refuses to re-decide
     a publication that already has a decision
   - writes new decisions to `src/_data/publication-decisions.json` using
     the strongest available **stable identifier** (DOI > sourceId > URL >
     fallbackKey) — the builder **throws** rather than creating an id-only
     decision
   - runs `node scripts/test-publication-decisions.js` and
     `node scripts/simulate-publication-decisions.js`; on failure, posts
     the output back and exits without opening a PR
   - creates a new branch `publication-review/issue-<N>-<ts>`, commits
     the single-file change, pushes it, and opens a PR against `main`
     via the GitHub API
   - comments back on the issue with the accepted/skipped/invalid summary
5. The reviewer approves and merges the PR. The next deploy picks the
   new decisions up and KEEPs render; REJECTs stay out.

## Key invariants (enforced by tests)

- **Render gate**: `src/_data/scientificPublications.js` filters
  `decision?.status === "keep"`. New sync-discovered publications never
  reach the public site until an explicit KEEP exists.
- **Stable identifier matching**: `findPublicationDecision()` in
  `src/_data/publication-decisions.js` matches by DOI, then alias DOI,
  then sourceId, then URL (http/https normalized, trailing slashes
  stripped), then alias URL, then exact fallbackKey, and only as a last
  resort by local id.
- **No id-only decisions**: `buildDecisionRecord()` throws if the mapping
  entry has no stable identifier.
- **No direct push to main**: comment processing opens a PR. The GitHub
  Actions token has `contents: write`, `issues: write`, and
  `pull-requests: write` but all mutating paths go through PR review.
- **Only the authorized reviewer can decide**: workflow `if:` block +
  authorization constant check inside the script. Any other commenter's
  text is ignored.
- **Stale-mapping protection**: comments created before the current
  mapping revision are rejected with a notice; prevents a race where
  "KEEP 2" from an old list silently applies to a new publication.
- **Already-decided protection**: existing KEEP/REJECT decisions are
  never silently overwritten by the automated flow.

## Related files

```
scripts/
  lib/publication-review.js                           # core library
  list-pending-publications.js                        # CLI for inspection
  update-publication-review-issue.js                  # sync post-step
  apply-publication-decisions-from-comment.js         # comment handler
  test-publication-review.js                          # library tests
  test-publication-decisions.js                       # matcher + render-gate tests
  simulate-publication-decisions.js                   # stability simulation

.github/workflows/
  sync-publications.yml                               # weekly sync + issue update
  publication-review-comment.yml                      # issue_comment trigger

src/_data/
  publication-decisions.js                            # matcher + normalizers
  publication-decisions.json                          # curated decisions
  scientificPublications.js                           # render-gate data loader
```

## Local verification

```bash
# Which publications are currently waiting?
node scripts/list-pending-publications.js

# Which publications are waiting? (machine-readable)
node scripts/list-pending-publications.js --json

# Full matcher + render-gate test suite
node scripts/test-publication-decisions.js

# Library test suite (pending detection, mapping, parser, authorization)
node scripts/test-publication-review.js

# Identifier stability simulation
node scripts/simulate-publication-decisions.js
```
