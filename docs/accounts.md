# Local accounts

The header's account icon connects directly to Supabase Auth. The publishable
project URL/key in dist/account-config.mjs are public browser configuration, not
administrative credentials. No database password or secret/service-role key is
required. Passwords are sent to Supabase and never written to atlas storage.
Supabase's SDK stores session tokens, refreshes sessions, and broadcasts auth
changes between tabs. Sign out revokes this session on this device.

Supported: email/password sign-up, confirmation resend, sign-in, sign-out,
password-reset email, choosing a replacement password, and editing an account
name. Names are saved as Supabase user metadata (display_name), shown beside the
account icon on desktop, and hidden in the mobile header. They are display names,
not unique login identifiers; sign-in still uses email.

Settings sync automatically through the authenticated user's Supabase metadata.
Each preference uses its own atlas_setting_ key, so saving a preference does not
replace the account name or unrelated preferences from another device. No extra
table, SQL migration, or dashboard permission is required. Only the user's own
access token is used; a request captures that token before sending, so a delayed
save cannot write to a different signed-in account.

Existing account preferences load on sign-in, reload and return to the app. A
first sign-in without saved preferences adopts this device's guest settings.
Changes save after a short delay; the Settings footer reports whether they are
synced or waiting for a connection. Per-account local queues retain offline edits
and retry when the connection returns or the app regains focus. Signing out
restores the guest's settings. Reset settings also syncs to the account. Synced
preferences include place/country labels, country-label language, label size,
heading size, legacy styling, motion and flat/globe projection. Completed quiz
records use the account-owned database described below. Unfinished rounds remain
on this device, separately for each account. User metadata is never used for
authorization decisions.

## Quiz dashboard and records

The signed-in account dialog opens to Quiz dashboard; Profile retains account
details and sign-out. The dashboard shows round totals, accuracy, perfect rounds,
countries played, recent scores and times, and personal bests. The Countries view shows searchable flag cards; selecting one opens its quiz
modes, division choices and personal bests. Recent rounds has a separate view,
with flags alongside the saved scores and times. The launcher offers
the mapped state/province equivalent for 88 modern atlas views and a separate
China prefecture level. Monaco and Vatican City have no mapped subdivisions;
historical snapshots are excluded. Korea and the Congo view offer country scopes.
China prefecture naming requires a province scope. US county quizzes offer all
50 states as separate scopes, using the retained Census 2025 county/equivalent
geography (3,143 units). This includes parishes, boroughs, census areas, independent
cities and Connecticut planning regions. County records use level 2 plus the state
ID; state quiz records remain level 1. Unfinished county rounds are stored
separately for each state and account. The map also has a County quiz tab.

Results include a stable UUID, country, division level, quiz type, scope, exact
place-pool hash, question count, score, hints, reveals, elapsed time and completion
date. Fastest records require a completed perfect round without hints or revealed
answers. Full rounds and shorter question sets have separate records, as do
different pools, scopes and quiz types. The dashboard's fastest display selects
full rounds. Timers stop on the final answer. Practice does not replace a record.

Both published frontends call the Site's /api/quiz-records endpoint. Its Worker
verifies the user's bearer token against Supabase Auth and derives ownership from
the verified response. Every database query binds that user ID; client-supplied
ownership is ignored. Records live in the Site's D1 DB binding, not in Supabase
metadata or JWT claims. No Supabase service-role key is used. CORS admits the two
published origins and local development origins; authenticated responses are
private and uncached.

Pending results have individual per-account local keys and immutable UUIDs.
Retries insert idempotently, and only remove queued results after refreshing the
server snapshot. Reload, focus and connectivity recovery retry uploads. An account
switch clears the displayed snapshot before loading the next account; an in-flight
round retains its original owner. Guest results remain on the device and are not
automatically assigned to a new account. Clearing device storage before an offline
upload removes that pending result; synced records remain in the database.

Schema source is hosting/db/schema.ts. Run npm run db:generate after schema edits;
review and commit the generated hosting/drizzle SQL, snapshot and journal. Never
rewrite migrations after publication. hosting/build-site-worker.mjs assembles a
self-contained static/API Worker from an exact committed atlas revision, sets the
DB binding, and copies these migrations to the hosting repository's root drizzle
folder. The Sites packager includes them; publication applies migrations before
uploading the Worker. Requests never create tables.

Run npm run build:us-county-quizzes to regenerate the county quiz files and
state index. Run npm run test:us-county-quizzes for all-state coverage and browser
checks. The county quiz loads only the selected state and ignores stale geometry
responses after a scope change.

Run npm run build:quiz-geography to regenerate lightweight quiz-only geometries
from retained atlas data. Ordinary exploration geography is unchanged. Run
npm run test:quiz-records and npm run test:first-level-quiz for schema, ownership,
timing, scoring and coverage checks. Run node scripts/browser/run.mjs
quiz-dashboard quiz-record-recovery account settings-sync for real browser flows
against deterministic Auth/API fixtures, without creating real accounts.

Dashboard setup:

1. Authentication > Sign In / Providers: enable Email, new-user sign-up and
   Confirm Email. Public settings were verified enabled on 19 October 2026.
2. Authentication > URL Configuration: set Site URL and an allowed Redirect URL
   to http://127.0.0.1:4174/ for the current local preview. Use the trailing slash.
3. Keep the default confirmation and recovery templates using ConfirmationURL.
   The client uses PKCE and the root query-code callback, preserving atlas hash
   routes. Open email links in the same browser that requested them. Expired or
   cross-browser links show an error and allow a new request.
4. Default Supabase email delivery is restricted to project team addresses and
   rate-limited. Configure custom SMTP before allowing general public sign-ups.
5. Before publishing, set the production Site URL and allow its exact root URL;
   retain the local root under additional Redirect URLs for development.

Supabase creates and manages auth.users. Do not create a public passwords table.
Any future Supabase profile/progress tables must have row-level security. The D1
quiz table is accessed only through the authenticated Worker, which enforces
ownership for every read and write.

Rebuild the pinned, same-origin SDK with npm run build:account-vendor.
Run node scripts/validate-settings-sync.mjs for sync state/queue checks.
Run node scripts/browser/run.mjs settings-sync settings account for the browser
checks. Run npm run test:account for desktop/phone tests against deterministic Auth
responses using the real SDK. Tests do not create live users or send emails.
The public settings endpoint is checked separately; confirmation email delivery
and a real user's first sign-in require manual testing with their own inbox.

References:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/getting-started/api-keys

## Collectible trophies

Quiz dashboard > Collection contains four original 3D models: China's jade disc,
Japan's vermilion torii, the US Liberty Bell and France's brass tower. Select a
model to inspect it by dragging or using arrow keys. Home or Reset view restores
the pose. Locked models can be previewed; collected models can be downloaded.

A collectible requires 100% in all three distinct quiz modes: name every place,
name the highlighted place, and click the named place. Each must be a full
first-level round without hints or revealed answers. Qualifying full pools have at least 34 China
provincial divisions, 47 Japanese prefectures, 51 US states/DC divisions or 13
French regions. Larger full pools also qualify. Short quizzes, practice, scoped
rounds and deeper-level county/prefecture quizzes do not satisfy this first set.

Each mode's completion is derived from the current account's persisted best
records and positive fastest-perfect time, so earlier qualifying results count and collection
status follows the account across devices. The detail view lists each mode and
its score or fastest perfect time; the play button chooses the next unfinished
mode. Duplicate wins in one mode cannot satisfy another. No device-only unlock flag or new
database table is used. Pending offline results participate in the current
account's snapshot and sync through the existing queue.

The models are generated by scripts/build-quiz-trophies.mjs as self-contained
[glTF 2.0 binary assets](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
China, Japan and US collectibles have original geometry. France adapts ingoenius' CC0 Eiffel Tower from https://3dmr.eu/model/4/3, preserving lattice cutouts as embedded alpha masks. Source, license, modifications and checksum are retained in scripts/trophy-sources/eiffel.json. Collection cards use thumbnails rendered from the same models. Locked collectibles show a generic mystery placeholder and do not display names, materials, artwork, attribution or model links. Their posters and meshes are not requested until earned. The detail viewer creates
one WebGL context, renders only on interaction/resize, and releases its buffers
and context on exit, profile navigation, model changes or account closure. A
thumbnail remains available if 3D rendering fails.

Run npm run build:quiz-trophies to generate models and render thumbnails in an
isolated browser. The render script creates and removes its temporary preview
page. Run npm run test:quiz-trophies for geometry and unlock-rule validation,
account restoration, actual quiz completion, touch/keyboard interaction and
checks that the viewer does not run an idle animation loop.

The US map uses one Quiz tab. Its Divisions dropdown switches between States & DC and Counties & equivalents, followed by the state picker for counties. Each quiz engine retains its own settings and draft storage; county records remain scoped to their state. Rapid level changes cancel pending navigation without losing saved rounds.
