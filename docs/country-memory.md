# Country memory budget

The application keeps detailed data for at most three countries: the active country and up to two recently used countries. The shared world map, country silhouettes and international border reference remain available for navigation. They are not additional loaded administrative datasets.

`createCountryResidency` in `dist/country-loader.mjs` reserves capacity before a country loads. It protects the active country, evicts the least recently used inactive country, counts pending loads, shares concurrent requests and cleans up failed loads. A country is marked active after switching succeeds. Returning to an evicted country loads it through the same path.

All adapters expose `unload()`. It releases detailed MapLibre layers and sources, object URLs, catalogues, search indexes and selected-place DOM references. China also releases its county data, quiz records and water overlay. The shared eviction callback clears country motion blobs/workers, statistics, comparison profiles and color-data caches. Recent countries retain whatever reusable data their adapter normally keeps on leaving; three is a ceiling, not a requirement to retain all geometry.

Flags load as the interface needs them instead of decoding every regional and city flag on country entry. Browser HTTP and service-worker disk caches can still make returning to an unloaded country faster; those caches do not keep the decoded country dataset alive in the page.

Checks:
- `node scripts/validate-country-memory.mjs`: capacity, LRU order, active protection, concurrency, failures and re-entry.
- `node scripts/browser/run.mjs country-memory`: eviction and search/selection after reload across every adapter.
- `AtlasCountryMemory.snapshot()` in the browser console reports the active country and the current three-slot budget.

This bounds retained country datasets rather than promising a fixed RAM total. Browser garbage collection, worker indexing, map tiles and satellite imagery also use memory.
