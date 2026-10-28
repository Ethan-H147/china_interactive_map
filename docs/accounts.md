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

Quiz dashboard > Collection contains thirteen 3D models for China, Japan, the US, France, Korea, Russia, Germany, Argentina, Chile, Brazil, the UK, Spain and Italy. Unlocked models can be rotated and downloaded. Locked cards reveal only the country, goal and progress; their artwork and names stay hidden.

A collectible requires 100% in name-every-place, highlighted-place naming and map-clicking modes, each in a full first-level round without hints or reveals. Minimum pools are 34 Chinese divisions, 47 Japanese prefectures, 51 US states/DC divisions, 13 French regions, 83 Russian federal subjects and 16 German states. The additional minimum pools are 24 Argentine provinces/capital, 16 Chilean regions, 27 Brazilian states/federal district, 12 UK regions/countries, 20 Spanish first-level quiz divisions and 20 Italian regions. Korea requires both existing scopes in each mode: 16 South Korean divisions and 13 North Korean divisions. The play shortcut chooses the next missing mode and scope. Short rounds and deeper-level quizzes do not qualify.

Creation timestamps and immutable addition sequence numbers live in quiz-trophies-core.mjs and the generated manifest. Repairs do not change a model's original addition metadata. The collection sorts by newest addition or country A–Z and remembers the choice on the device; dates and rank numbers are never displayed.

Each mode's completion is derived from the current account's persisted best
records and positive fastest-perfect time, so earlier qualifying results count and collection
status follows the account across devices. The detail view lists each mode and
its score or fastest perfect time; the play button chooses the next unfinished
mode. Duplicate wins in one mode cannot satisfy another. No device-only unlock flag or new
database table is used. Pending offline results participate in the current
account's snapshot and sync through the existing queue.

The models are generated by scripts/build-quiz-trophies.mjs as self-contained
[glTF 2.0 binary assets](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
The first-level rewards for China, the US, Korea and Russia are the Great Wall, Statue of Liberty, Gyeongbokgung’s Geunjeongjeon throne hall and Saint Basil’s Cathedral. Their source modules are scripts/collectible-great-wall-design.mjs, scripts/collectible-liberty-design.mjs and scripts/collectible-palace-design.mjs and scripts/collectible-saint-basil-design.mjs. Their country IDs, qualifying modes and score history are unchanged. The jade disc, celadon vase, Liberty bell and floral matryoshka are held in Developer mode → Quiz dashboard → Collection → Reserved collectibles, with no quiz assigned. They do not count toward the public collection. Their original meshes and thumbnails are retained byte-for-byte under data/trophies/reserved/, and all four remain reproducible from their original source geometry. Reserved metadata and previews load only when developer mode is enabled and the collection is active; leaving developer mode removes them and releases the preview.

The six additional models are the Obelisco on a blue enamel base with a raised 32-ray Sun of May medallion; a moai on a stone ahu; Christ the Redeemer with sculpted robe and hands; Elizabeth Tower with four original clock dials; an interpretation of the Sagrada Família’s planned eighteen-tower scheme; and the Colosseum with open arcades, cavea and hypogeum. They use the collectible design modules and stay below 110,000 triangles and 8 MB each. These are artistic architectural miniatures, not survey reconstructions.

All models except France, the US and Brazil have original geometry. The reserved Korean celadon and Russian matryoshka use original embedded painted textures; scripts/collectible-designs.mjs contains their parametric surfaces and the German colonnade. France adapts ingoenius' CC0 Eiffel Tower from https://3dmr.eu/model/4/3, preserving lattice cutouts as embedded alpha masks. Source, license, modifications and checksum are retained in scripts/trophy-sources/eiffel.json. Collection cards use thumbnails rendered from the same models. Locked collectibles show a generic mystery placeholder and do not display names, materials, artwork, attribution or model links. Their posters and meshes are not requested until earned. The detail viewer creates
one WebGL context, renders only on interaction/resize, and releases its buffers
and context on exit, profile navigation, model changes or account closure. A
thumbnail remains available if 3D rendering fails.

Run npm run build:quiz-trophies to generate models and render thumbnails in an
isolated browser. The render script creates and removes its temporary preview
page. Run npm run test:quiz-trophies for geometry and unlock-rule validation,
account restoration, actual quiz completion, touch/keyboard interaction and
checks that the viewer does not run an idle animation loop. Use node scripts/render-trophy-posters.mjs --audit to render front, left, right and rear views. Geometry checks explicitly verify that the jade cradle clears the disc rim along its faces, not just at its vertices. Design references are recorded in scripts/trophy-sources/design-references.json.

The US map uses one Quiz tab. Its Divisions dropdown switches between States & DC and Counties & equivalents, followed by the state picker for counties. Each quiz engine retains its own settings and draft storage; county records remain scoped to their state. Rapid level changes cancel pending navigation without losing saved rounds.

Russia’s cathedral uses distinct spiral-striped and raised diamond-pattern onion domes, clustered chapels, kokoshniks, a central tent and open belfry. The original matryoshka remains byte-identical in the developer shelf, with no quiz assigned. Russia keeps the same 83-division first-level requirement and earlier qualifying results.

The revised Liberty adapts Metron3D’s CC BY 4.0 scan of a replica: https://sketchfab.com/3d-models/statue-of-liberty-3d-scan-8e808365b5a6453497826b114b02f155 . The creator credit and license appear in the earned collectible view, manifest and downloadable GLB. The prepared source and checksum/provenance are retained in scripts/trophy-sources/liberty-metron-prepared.glb and liberty-metron.json. The scan is welded and reduced from 1,035,539 to 90,000 triangles, oriented upright and recolored with patina, stone and gold. The Node build needs only the retained prepared source. Optional source preparation uses scripts/prepare-liberty-scan.py with numpy, trimesh 5.2.0 and fast-simplification 0.2.0; the original download URL and checksum are recorded in the provenance.

Liberty’s retained source is leveled by the area-weighted normal of its scanned pedestal, correcting a 4.2479-degree forward/side tilt with a rigid rotation. Only the lowest 0.01-unit contact strip is flattened. The prepared-source provenance records the correction matrix; the mesh validator checks that the exported pedestal is level within one degree. The display camera does not compensate for the lean.

Brazil’s revised Christ the Redeemer adapts JuanG3D’s original CC BY 4.0 Art Deco sculpture, not a scan: https://sketchfab.com/3d-models/christ-the-redeemer-d143e5357efd42529777438d0f72c79c . It retains the source face, hands and layered drapery, replaces the tall print plinth with an original proportional octagonal pedestal, and uses a pale soapstone finish. Source, checksum, license and preparation notes live in scripts/trophy-sources/christ-juan*. The optional scripts/prepare-christ-model.py reproduces the retained prepared source. Creator credit and license remain in the earned preview, manifest and downloadable GLB. Quiz requirements and historical results are unchanged.
