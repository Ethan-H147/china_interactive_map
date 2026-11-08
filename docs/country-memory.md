# Country memory budget

The application keeps detailed data for one country: the active country. The shared world map, country silhouettes and international border reference remain available for navigation. They are not additional loaded administrative datasets.

`createCountryResidency` in `dist/country-loader.mjs` reserves capacity before a country loads. The application uses a one-country budget on all devices and releases the previous country before admitting its replacement; the reusable controller also supports larger LRU budgets. It counts pending loads, shares concurrent requests and cleans up failed loads. A country is marked active after switching succeeds. Returning to an evicted country loads it through the same path.

All adapters expose `unload()`. It releases detailed MapLibre layers and sources, object URLs, catalogues, search indexes and selected-place DOM references. China also releases its county data, quiz records and water overlay. The shared eviction callback clears country motion blobs/workers, statistics, comparison profiles and color-data caches. Inactive countries release their detailed geometry.

US county, municipal, area-code and ZIP-area geometry loads for one state or territory at a time. Changing the parent, changing map type or leaving the US removes those detailed sources and revokes their object URLs. Nationwide search uses small catalogues without retaining every state’s geometry; the US still occupies one country slot.

Flags load as the interface needs them instead of decoding every regional and city flag on country entry. Browser HTTP and service-worker disk caches can still make returning to an unloaded country faster; those caches do not keep the decoded country dataset alive in the page.

Checks:
- `node scripts/validate-country-memory.mjs`: capacity, LRU order, active protection, concurrency, failures and re-entry.
- `node scripts/browser/run.mjs country-memory`: eviction and search/selection after reload across every adapter.
- `AtlasCountryMemory.snapshot()` in the browser console reports the active country and the current one-slot budget.

This bounds retained country datasets rather than promising a fixed RAM total. Browser garbage collection, worker indexing, map tiles and satellite imagery also use memory.

## Historical snapshots

The compact decoder can select an archive member before expanding coordinates. Each map source now expands only the geometry it uses. The page omits historical selection outlines and arc coordinates; Precomputed selection outlines expand only the selected unit; other selection workers build a compact copy for only the selected period on demand. Worker history caches expire after ten seconds of inactivity. China releases its history archive, shapes and object URLs on leaving the snapshot, cancels unfinished loading, and closes history before destination-country preparation. Tile retention is capped at 48 tiles per source (12 on low-memory devices), across two zoom levels. Boundary coordinates are unchanged.

Local isolated Node decoding of the current China history archive retained approximately 449 MiB with full decoding versus 160 MiB with the page selector after garbage collection. This measures one decoding step, not total browser or GPU memory.

Spain card headings use English, followed by Spanish only when it differs from English, then labeled regional-language names.

Additional checks: `node --expose-gc scripts/validate-history-memory.mjs` compares every historical face, arc and border exactly, and `node scripts/browser/run.mjs history-memory country-memory china-history` checks rendering, repeated switches, reloads and cancellation.
