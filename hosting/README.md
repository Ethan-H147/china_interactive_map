# Atlas hosting adapter

The atlas frontend remains static: use npm start and the normal build/data/browser checks. The hosted Site uses worker.mjs because its 1.03 GiB static tree exceeds the desktop archive uploader and remote build disk limits. Account quiz records use the same Worker's authenticated API and D1 database. No map features or data were removed.

The Worker serves only the generated allowlist from the immutable public GitHub snapshot in source.json. URLs remain on the Site origin; asset bodies stream without parsing, and the edge cache key includes the source commit. Browser responses revalidate, while version.json gives the existing service worker that same source version. No incoming cookies, authorization, queries or write methods are forwarded. Unknown paths are rejected. Original MIME types are restored and GitHub's source-view CSP/frame headers are not carried into the application.

Run node hosting/test.mjs for path/method restrictions, source pinning, byte preservation, headers, cache failures and upstream errors. The hosting repository also has build/artifact checks and a browser smoke adapter. Its deployable artifact is only the self-contained Worker and hosting identity, with no standalone asset directory.

For an update, first push and test the full atlas on GitHub. Regenerate sourceCommit and the file allowlist in worker.mjs from that exact commit's tracked dist tree; update source.json. Verify representative JS and binary hashes plus the Morocco desktop/phone smoke tests through the adapter. Publish the updated source in artifacts/site-worker using the existing Site identity, current audience and Sites source workflow. Do not merge the hosting transport history into this full GitHub checkout, force-push either remote, or silently follow a moving main branch.

The public asset source is https://github.com/Ethan-H147/china_interactive_map. Compression pass-through follows https://developers.cloudflare.com/workers/runtime-apis/fetch/#passthrough-behavior. Source cached downloads and complete runtime assets stay in this GitHub repository. Account settings sync through Supabase Auth metadata; account quiz records use private D1 rows. Unfinished quiz rounds and guest results remain device-local.

For releases with quiz storage, run node hosting/build-site-worker.mjs with three
absolute arguments: the full atlas checkout, its tested/pushed commit SHA, and the
existing hosting checkout. This replaces the hosting Worker's static pin and
allowlist, embeds quiz-api.mjs, enables DB, copies immutable generated migrations
to root drizzle/, and updates provenance. Run the hosting build, tests and artifact
validator before packaging with the official Sites helper. The generated Worker
has no runtime imports. Keep both repositories' histories separate. See
docs/accounts.md for ownership, offline retries, schema changes and quiz checks.
