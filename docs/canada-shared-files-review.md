# Review: ChatGPT's shared-file changes for Canada dated maps

Reviewed 2026-11-05 (overnight, unattended). Scope: the uncommitted changes to `dist/elections.mjs`, `dist/regional-country.mjs`, `dist/app.js`, `dist/geo-pack.mjs` and `dist/atlas-data.mjs`, the engine files they depend on (`dist/historic-borders.mjs`, `dist/historic-view.mjs`, `dist/outline-detail.mjs`), and pushed commit `54fbfed5` ("Fix US-Canada borders and historical map rendering").

The working tree mixes ChatGPT's edits with the previous Claude session's, and git can't tell them apart line by line. I reviewed the whole uncommitted diff of these files. A copy of the tree as it stood before this session is in this session's scratchpad (`baseline/tracked.patch` and `baseline/files/`).

Status key: **Fixed** means changed tonight with a test that confirms it. **Checked** means a suspected problem that the data or a test ruled out. **Your call** means it's listed only and not changed.

## Correctness

| # | Finding | Where | Status |
| --- | --- | --- | --- |
| C1 | Selecting a riding made a worker fetch and decode the whole riding file (2.6–4 MB, 140–220 ms of decoding alone) on every selection. That's the slow selection, not a wrong result. | `historic-borders.mjs` frame `outline()`, `atlas-data.mjs` | **Fixed** (see the overnight summary) |
| C2 | Card headings and the riding picker showed election-result names with ASCII double hyphens ("Toronto--St. Paul's"). | `scripts/build-canada-elections.mjs` | **Fixed**: the build turns `--` into `—`. `federal.bin` was rebuilt; only 1,346 riding names changed. Bilingual names such as "Ottawa Centre / Ottawa-Centre" are unchanged. |
| C3 | Two new visible center-dot separators weren't listed in `docs/center-dot-usage.md`: the election range line and the riding winner status. | `elections.mjs` `buildStrip`, `renderResult` | **Fixed**: tracker rows 49 and 50 |
| C4 | US history's Alaska picker returned "no unit" for any point north of 50° and west of 129°W off Alaska land. In 1818–1846 that hid Oregon Country's Haida Gwaii and northern BC coast from hover labels. | `historical-alaska.mjs`, `historic-borders.mjs` `pick()` | **Fixed**: in that band only faces the Alaska display replaces return nothing. A new `us-history` check fails before the fix and passes after. |
| C5 | Suspected: a US year with no matching Canadian year would break the Rupert's Land context. | `historic-view.mjs` `syncContext` | **Checked**: Canada has every year 1866–1869, so it can't happen |
| C6 | Suspected: picking a Canadian historical division from the picker by ID while `find()` matches by key. | `historic-view.mjs` `selectDated` | **Checked**: key equals ID for every Canadian unit |
| C7 | Suspected: a riding edge naming a riding missing from the file would crash `draw()`'s `visible()` filter. | `historic-borders.mjs` frame `draw()` | **Checked**: every edge's `a` and `b` exist in all 20 riding files |
| C8 | Suspected: matching party colours by candidate name (`c.party||c.name`) and ranking by seats first could recolour US or Korean candidates. | `elections.mjs` `candidateColors`, `rank` | **Checked**: no US candidate without a party matches a pattern, and Korea has no `partyColors` |
| C9 | `lockCamera` now records enabled interactions only when the camera isn't already locked, and a failed fill paint now unlocks the camera. Both are correct fixes of earlier bugs (nested locks and a camera left locked). | `app.js` | Reviewed, no change |

## Duplicated code paths

| # | Finding | Where |
| --- | --- | --- |
| D1 | The shared renderer has six `country==='canada'` branches: two extra `createHistoricBorders` instances, the dated picker markup, the click guard and `reset()`. They should be configuration (`standalone` on the history and election configs) so another country can use them. | `regional-country.mjs` lines 59, 75–77, 95, 354, 367 |
| D2 | `canadaBorders` repeats the generic `historicBorders` creation (same file, plus `scene` and `tag:'history'`, which is the default). The generic call could pass `scene` and drop the copy. | `regional-country.mjs` 75–77 |
| D3 | The election engine is a second engine only because Canada's elections and snapshot use different files. That could be decided generally: a second engine when `electionConfigs[c].historic.file !== historyConfigs[c].file`. | `regional-country.mjs` 76–78 |
| D4 | `standalone` adds about a dozen separate branches to `elections.mjs`: seats tally, riding card, 20-year marks, range line, picker API. Some are general (seat-based tallies); others are really Canada's configuration. | `elections.mjs` |
| D5 | Each riding file is decoded 3–4 times per representation-order change: once on the page (`decodeFrame`, for units, sides and pick shapes) and once each in the fill, edge and outline workers. The outline worker keeps its copy now. The page's copy is used for picking and for the label list. | `historic-borders.mjs` `prepare`/`decodeFrame` |
| D6 | `historical-region-display.mjs` builds `lines` and `frontiers` arrays in `draw()` and then sets both layers' filters to empty lists, so the arrays are never used. | commit `54fbfed5` |
| D7 | `scripts/boundary-sources/us-canada/canada-original-outline.bin` is the same git blob as `dist/data/europe/canada/context.bin` before the commit, a retained copy of an existing asset (git stores it once). `ibc-v1.3.zip` and `ibc-v1.3.geojson.gz` hold the same boundary twice. | commit `54fbfed5` |
| D8 | `dist/data/us-canada-frontier-sources.json` (10,584 lines) ships in `dist/` but nothing in `dist/` reads it. Other `*-sources.json` files in `dist/data` are linked from attributions. | commit `54fbfed5` |

## Performance

| # | Finding | Measurement | Where |
| --- | --- | --- | --- |
| P1 | **Fixed.** Riding selection decoded the whole riding file (C1). | Fixed-camera outline load: NWT 119–238 → 32–38 ms, Toronto—St. Paul's 99–137 → 8–10 ms | `atlas-data.mjs`, `outline-detail.mjs`, `historic-borders.mjs` |
| P1b | **Changed with P1.** A dated-file highlight was a `setFilter` on the fill source. map-scene's feature-state gate doesn't apply to an ID ending in `-selected-fill`, so every highlight change would re-lay out every loaded fill tile. Elections never highlight, so nobody sees it today. | inferred from `map-scene.mjs` `configureGate`; now a worker-built shape on a source created at first use | `historic-borders.mjs` |
| P2 | **Fixed.** Election year changes took about 1.1 s within one representation order and 2.7–3.9 s when the riding file changed. Each year re-laid out every riding tile (a data-driven `match` colour) and every present-day province tile (the hidden selection fill was recoloured). | Now 35–40 ms within an order and 1.1–2.0 s across orders | `historic-borders.mjs` (feature-state colours), `elections.mjs` |
| P3 | A selection's camera flight still dominates click-to-idle time. The first visit to an area builds dated fill and edge tiles at the new zoom. That's 0.84–1.0 s for the Northwest Territories, against 0.34–0.38 s on the present-day map, which has its own pre-tiled pipeline. The historical snapshot is similar (0.67–0.83 s). | see the overnight summary | tile building at tolerance 0 |
| P4 | The dated picker rebuilds and `localeCompare`-sorts all 343 riding options on every selection and year change, even when the list hasn't changed. That's a few ms; no long task was seen. | click handler 12–30 ms | `regional-country.mjs` `datedPicker()` |
| P5 | While the US snapshot is shown, `historical-region-display.mjs` runs `sync()` on every render frame. It calls `map.getFilter` (a deep copy) and `JSON.stringify` on two filters per provider layer each frame. | not measured | commit `54fbfed5` |
| P6 | The workers' mosaic cache (`mosaicFor`) is keyed by blob URLs that are revoked on `dispose()`. Entries outlive the country, and re-entering US history makes a new blob URL, so a stale copy stays until two newer files push it out. It's also FIFO rather than LRU, and a rejected promise can delete a newer entry for the same URL. | not measured | `atlas-data.mjs` |
| P7 | The compact `world-land.bin` grew from 11.9 to 14.5 MB (+22%), and it's in the first preloads for every visitor. | file sizes | commit `54fbfed5` |
| P8 | Build scripts set heap flags at or above the 10 GB cap: `build:historical-coasts` 10000, `build:canada-dated-maps` 8500/9500. `test:canada-dated-maps` sets 7500 for a validator that peaks at 0.9 GB. | measured | `package.json` |
