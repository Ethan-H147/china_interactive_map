# Atlas hosting adapter

The full atlas remains a static project: use npm start and the normal build/data/browser checks. The hosted Site uses worker.mjs because its 1.03 GiB static tree exceeds the desktop archive uploader and remote build disk limits. No map features or data were removed.

The Worker serves only the generated allowlist from the immutable public GitHub snapshot in source.json. URLs remain on the Site origin; asset bodies stream without parsing, and the edge cache key includes the source commit. Browser responses revalidate, while version.json gives the existing service worker that same source version. No incoming cookies, authorization, queries or write methods are forwarded. Unknown paths are rejected. Original MIME types are restored and GitHub's source-view CSP/frame headers are not carried into the application.

Run node hosting/test.mjs for path/method restrictions, source pinning, byte preservation, headers, cache failures and upstream errors. The hosting repository also has build/artifact checks and a browser smoke adapter. Its deployable artifact is only the self-contained Worker and hosting identity, with no standalone asset directory.

For an update, first push and test the full atlas on GitHub. Regenerate sourceCommit and the file allowlist in worker.mjs from that exact commit's tracked dist tree; update source.json. Verify representative JS and binary hashes plus the Morocco desktop/phone smoke tests through the adapter. Publish the updated source in artifacts/site-worker using the existing Site identity, current audience and Sites source workflow. Do not merge the hosting transport history into this full GitHub checkout, force-push either remote, or silently follow a moving main branch.

The public asset source is https://github.com/Ethan-H147/china_interactive_map. Compression pass-through follows https://developers.cloudflare.com/workers/runtime-apis/fetch/#passthrough-behavior. Source cached downloads and complete runtime assets stay in this GitHub repository; user quiz/view preferences remain browser-local.
