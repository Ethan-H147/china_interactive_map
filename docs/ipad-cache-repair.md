# Safari cached-version repair

The iPad loaded current football quizzes in Private Browsing while ordinary Safari kept an older interface, including after a fresh query-string navigation. The Cloudflare origin was independently verified to serve commit f32b2e79 and current football code for both desktop and iPad user-agent requests.

A deterministic reproduction found that `sw.js` warmed its versioned Cache Storage with ordinary `fetch(url)` requests. The browser could satisfy those requests from an older HTTP-cache copy. That old script was then retained under the current deployment's cache name, so version checks and ordinary reloads did not discard it.

The repair changes only app delivery:

- Use the `atlas-v2-` cache namespace and discard older `atlas-` app stores after a valid version response.
- Use `cache: 'reload'` when populating a versioned store, including background warming, so the browser HTTP cache cannot poison the new store.
- Register the service worker with `updateViaCache: 'none'`.
- Provide `refresh.html` and `refresh-app.mjs` as an independent recovery page. Its button explicitly updates the worker, requests a fresh version check, removes only atlas app-file caches, and opens a new document. It never clears localStorage, sessionStorage, IndexedDB, cookies or Supabase data. Country routing is retained.
- If the network/version check fails, keep the existing app cache and allow retry. Unrelated cache names are untouched.

After this fix is explicitly authorized and deployed, the iPad recovery link is:

```text
https://china-interactive-map.huyusheng777.workers.dev/refresh.html#united-kingdom
```

Open it in ordinary Safari and tap **Refresh app files**. This page is a new path, allowing it to load even when old app assets are stuck in an existing cache. It must be deployed before the link is shared as usable.

`node scripts/validate-app-cache.mjs` reproduces stale HTTP-cache warming and verifies namespace migration, fresh cache misses, deployment changes, offline preservation, explicit repair, unrelated-cache isolation and unversioned local previews. `node scripts/browser/run.mjs app-cache` tests the real service worker and repair page in narrow/large touch-size layouts, verifies the reload and country route, and preserves sentinel sign-in, settings, saved/pending quiz and unfinished-round entries.

Keep this repair local until publishing is explicitly requested, per AGENTS.md. It can be committed independently of the pending US sports and Google sign-in work.