# Quiz history retention

The database migration and matching frontend must be deployed together.

## Storage and reads

Each account keeps its latest 1,000 detailed rounds, ordered by completion timestamp
and round ID. Lifetime rounds, correct answers, total answers, perfect rounds and
per-challenge personal bests live separately. Medals and collectible progress continue
to use those lifetime bests, including perfect rounds whose history was trimmed.

`quiz_snapshot_v2` reads at most 26 history rows and returns 25, with a timestamp/ID
cursor for the next page. Only the initial page includes lifetime totals and bests.
It never downloads the entire attempt history to calculate them. The browser caches
at most 1,000 history entries. Unsynced offline rounds remain queued until acknowledged;
they are not discarded to enforce the history cap.

## Writes, retries and limits

`quiz_submit_v2` accepts at most ten results and 64 KiB per transaction. It derives
the owner from `auth.uid()`, validates results, serializes account writes, updates
totals and bests, and trims details atomically. A failed batch changes none of these.
Authenticated clients cannot write tables directly or modify lifetime records.
Privileged functions live in a non-exposed schema with a fixed empty search path;
public wrappers are invokers. Anonymous callers have no function privileges.

New results are limited to 120 per UTC minute and 2,000 per UTC day per account.
Retries and already-known IDs do not consume the allowance. HTTP 429 supplies a
`Retry-After` until the relevant window resets. The browser retains the upload and
waits before retrying, including when focus or online events fire during the wait.
This limits accepted submissions; it is not an edge/network abuse filter or proof
that a submitted score was earned honestly.

Before sending, the browser persists a batch and monotonically increasing sequence.
Web Locks serialize tabs sharing the same account and storage. The database tracks
one cursor per browser stream, with a maximum of 128 streams per account, instead
of creating a permanent receipt for every new round. Replaying an old batch never
increments totals, even after its detail rows are trimmed. Older-than-current
sequences are rejected rather than falsely acknowledging potentially new results
from an outdated device backup; their local queue remains intact. Storage failures keep
the original batch for retry rather than assigning it a new sequence.

The one-time migration retains only the UUIDs of pre-upgrade rounds in a private
deduplication table. This fixed legacy set prevents old backups from counting twice
after trimming; new rounds never grow it. It contains no historical scores or names.
Old offline rounds not already known still contribute to lifetime records, even
when their timestamps place them outside the retained history immediately.

## Undoing a retained round

Removing a retained round subtracts its contribution from lifetime totals and
recalculates that challenge's personal best, medals and collectibles. Archived
best results remain available as a fallback. Ownership checks prevent removing
another account's results, and repeated requests cannot subtract a round twice.
Rounds already outside the retained history cannot be undone individually.

## Coordinated rollout

1. Back up the hosted database and browser recovery data.
2. Apply `20261110085832_quiz_lifetime_retention.sql` during a coordinated rollout.
   It locks attempts, copies all existing lifetime totals and bests, records legacy
   IDs, and only then deletes detail entries beyond 1,000 per owner.
3. Verify totals, personal bests and medals against the backup before publishing
   this frontend. Older tabs must refresh; direct inserts from old clients are denied
   and their unsynced rounds stay queued locally.
4. Check database security/performance advisors after applying the migration.

Do not publish this frontend before its database migration: it deliberately reports
the missing update and keeps local rounds rather than falling back to full downloads.
Restoring deleted detailed history requires the backup; aggregate totals cannot
reconstruct individual rounds. No rollout, backup operation, or deletion on the
hosted database is performed by the local implementation or its tests.

## Local verification

`node scripts/validate-supabase-quiz.mjs` checks bounded RPC requests and errors.
`node scripts/validate-quiz-records.mjs` checks score merging and legacy adapter behavior.

`scripts/validate-quiz-retention.mjs` executes both migrations in an isolated PGlite
PostgreSQL instance. Install the optional test tool `@electric-sql/pglite@0.3.14` in
a separate local tools directory and set `PGLITE_MODULE` to its `dist/index.js`
file URL, then run `node scripts/validate-quiz-retention.mjs`. It checks backfill,
retention, all 40 history pages, old medal and best preservation, offline submissions,
retries, atomic rollback, rate limits, permissions and account isolation. This is a
development-only test tool; the atlas needs no added browser dependency.

`node scripts/browser/run.mjs quiz-retention supabase-migration "Offline completed round" "Account quiz history"`
checks the new protocol, lost-response recovery, account isolation and local migration
using intercepted test requests rather than the hosted database.
