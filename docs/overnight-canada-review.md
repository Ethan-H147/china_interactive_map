# Overnight Canada dated-maps review (2026-11-05)

Everything is local: nothing is committed, pushed or deployed. The working tree as it stood before this session is saved in the session scratchpad (`baseline/tracked.patch`, `baseline/files/`), and I changed nothing that ChatGPT or the previous session wrote except where listed below.

The review of ChatGPT's shared-file changes and of commit `54fbfed5` is in [canada-shared-files-review.md](canada-shared-files-review.md).

## What changed, file by file

- `dist/outline-detail.mjs` adds `compactRegions()` and `regionFeatures()`. Together they make a compact copy of a dated region file's regions, keyed by riding ID, with each ring in a `Float64Array`. One riding's features can then be rebuilt without decoding the file again. This follows the pattern `compactMosaic`/`unitOutline` uses for mosaics.
- `dist/atlas-data.mjs`: requests for one region of a dated file (`member=regions&unit=…`) are served from a per-worker cache of those compact copies, holding the two most recently used files. An empty `unit` builds the copy and returns nothing. Every other request takes the old path.
- `dist/historic-borders.mjs` changes the dated-file ("frame") path in three ways:
  - Once the dated layers are revealed, the outline source asks for an empty unit, so the outline worker builds its copy before the first selection.
  - A highlight is now a worker-built shape (`transform=parts&unit=…`) instead of a `setFilter` on the fill source.
  - The highlight source and layer are created only when a highlight is first asked for, and elections never ask. An always-present empty source cost about 0.5 s on every election year change (measured; see below).
- `scripts/validate-outline-detail.mjs` (in `npm run test:outline-detail`) adds a check. For Nunavut, Northwest Territories and Toronto—St. Paul's, the worker outline and shape must deep-equal the old whole-file decode. Each file must be fetched and decoded once. The two-file eviction must work.
- `scripts/browser/canada-dated-maps.test.mjs`: the assertion that elections don't fill the selected riding used to check the old `setFilter`. It now checks that the fill layer is absent or its source is empty. A new assertion checks that the selected riding's outline request names a riding ID.
- `docs/canada-dated-maps.md` gets one sentence on the worker cache.
- `docs/canada-shared-files-review.md` (new) is the review report.

The cached path returns exactly what the old path returned (asserted with `deepEqual`), so outlines, fades and colours are unchanged.

## Measurements

Headless Chrome on this machine, 1360×900. I used the previous session's probe: `map.fire('click')` from a fixed camera, timed to map `idle`. I added a fixed-camera replay of each selection's outline request, which isolates the worker cost from the camera flight. The probes and raw output are in the scratchpad (`probe-selection.mjs`, `before*.json`, `after*.json`, `probe-years.mjs`, `abc-years.mjs`).

**Worker cost of a selection** (outline request at a fixed camera, ms, three repeats):

| Place | Ridings before | Ridings after | Historical snapshot (2024) |
| --- | --- | --- | --- |
| Nunavut | 303–324 | 198–224 | 305–363 |
| Northwest Territories | 119–238 | 32–38 | 52–84 |
| Toronto—St. Paul's (snapshot: Ontario) | 99–137 | 8–10 | 59–78 |

Nunavut costs the same in both views because its outline is mostly thousands of island rings. That cost comes from the geometry, not the file decode.

**Click to idle** (ms; round 1 is the first visit to that view, round 2 repeats it):

| Place | Present-day map, round 1 / 2 | Ridings before, round 1 / 2 | Ridings after, round 1 / 2 | Snapshot, round 1 / 2 |
| --- | --- | --- | --- | --- |
| Nunavut | 480–531 / 390–410 | 622–697 / 365–369 | 553–966 / 363–380 | 584–897 / 516–730 |
| Northwest Territories | 344–379 / 333–354 | 940–1186 / 338–349 | 840–1006 / 343–348 | 673–832 / 323–337 |
| Toronto riding (present-day and snapshot: Ontario) | 1040–1059 / 1034–1047 | 733–760 / 692–725 | 729–762 / 705–715 | 1016–1135 / 1019–1026 |

Each range covers three runs; the present-day and snapshot columns pool runs from before and after, since tonight's change doesn't touch them. The "after" runs are two of the first version and one of the final version, which differ only in when the highlight source is created. The selected outline now appears in 16–31 ms for Toronto (was 89–388) and 31–50 ms for the Northwest Territories on a repeat (was 173–199). Click-to-idle barely moved because the camera flight and, on a first visit, building dated fill and edge tiles at the new zoom now set it. Those costs match the historical snapshot's, so riding selection is now as fast as the snapshot. It still isn't as fast as the present-day map on a first visit; see "Still your call".

**Election year changes** (ms to idle, same probe on both versions, alternated):

The probe starts at 2025 and steps through 2021, 2019 and 2015 (which share the 2013 representation order) and back to 2025.

| Version | Same representation order | New riding file |
| --- | --- | --- |
| Before tonight (5 runs) | 1002–1672 (median ≈1.08 s); one 3.3 s outlier | 2652–3850; one 11.2 s outlier |
| First version, highlight source always present (4 runs) | 1524–1918 (median ≈1.6 s); outliers 3.3 s and 5.5 s | 2647–4257 |
| Final version (3 runs) | 983–1254 (median ≈1.06 s); outliers 1.9 s and 3.75 s | 2689–3902 |

A bisect located the first version's 0.5 s: the empty highlight source alone, added to the old engine, reproduced it (1554–1801 ms). The worker cache alone didn't (1031–1426 ms). Two probe runs hung on a crashed headless page, one on the old engine and one on the final version. Two reruns of the final version completed normally.

Riding selections showed no long tasks, before or after. The present-day map has 50–93 ms long tasks on its first Nunavut selection. A riding-file change still has one 140–250 ms long task on the page (`decodeFrame`), before and after.

## Test results

Every heavy run went through a process-tree RAM watchdog (kill above 9 GB), one at a time.

| Command | Result | Peak RAM |
| --- | --- | --- |
| `npm run test:canada-dated-maps` | Passed. The validator reports 161 yearly snapshots and 45 elections with seat totals; browser scenarios 2/2 passed (historical divisions 30.7 s, federal elections 28.1 s). | 7.3 GB (one headless Chrome) |
| `node scripts/browser/run.mjs us-history us-elections historical-coast-selection korea-elections` | 9/9 passed in 247 s | 7.4 GB |
| `npm test` | Stops at the known failure. `node --check dist/app.js` and `validate.mjs` pass, then `validate-boundaries.mjs` fails with `AssertionError: Province and subdivisions disagree: 150000`. Nothing after it in the chain ran. | 0.4 GB |
| `npm run test:outline-detail` (targeted, includes the new riding check) | Passed | 0.65 GB |

`test:canada-dated-maps` was run as written; its 7500 heap flag is a cap, and the validator used 0.9 GB.

## Decisions I made for you

1. **Exact coordinates.** The compact copy keeps double precision, so the worker output equals the old output. The mosaic copy uses `Float32Array`, which would have shifted outlines by up to about 1 m. The cost is 12.6–18.9 MB per riding file per worker that serves an outline, two files at most.
2. **Fades unchanged.** I didn't turn riding files into mosaics to reuse `unitOutline`. A riding is a single face, so the mosaic's "join faces into land masses" fade would treat each riding as one mass, and all of Nunavut's small islands would appear at once at low zoom. `selectionLineData` (per-ring fades) stays, the same as the present-day map.
3. **Warm the outline worker after reveal, not when the sources are added.** The first paint of a new representation order isn't delayed, and the first selection usually finds the copy ready. If you select before the copy is built, the selection waits for it; there's no second decode.
4. **Highlight on first use.** You asked for the highlight to be built in the worker too. A bisect showed the always-present empty highlight source alone slowed every same-order election year change from about 1.05 s to about 1.6 s, so the source is created only when a highlight is requested. Today no riding view requests one, so that code runs only if a future view uses it. The worker side is covered by the new validator check; there's no browser test for it.
5. **Two-file cache, least recently used,** matching the page-side frame cache. The mosaic cache stays FIFO (review P6).
6. **One test assertion rewritten.** The old one checked the mechanism I replaced (`setFilter`); the new one checks the same outcome, that elections don't fill the riding.
7. **Review findings listed, not fixed.** C4 (the US-history Alaska picker) is confirmed against the data, but fixing it changes published US behaviour, so I left it. No other suspected bug held up (C5–C8 were ruled out). C2–C4 and the duplicated-path and performance items are for you.
8. **Center-dot tracker not edited.** Two new visible separators lack entries (review C3). Whether to add entries or remove the dots is your call.
9. **`npm test` not continued past the known China failure,** as you asked. Everything after `validate-boundaries` in that chain didn't run.
10. **The git ownership warning was bypassed per command** (`git -c safe.directory=…`), not added to global config. You may want to add it yourself:

    ```bash
    git config --global --add safe.directory C:/Users/huyus/Projects/boundary-atlas
    ```

## Still your call before publishing

- **Year changes are slow:** about 1.1 s within a representation order and 3–4 s when the riding file changes, before and after tonight's change (review P2). It's the data-driven fill colour re-laying out every tile, plus the extra decodes on each order change. Feature-state colouring would avoid the re-layout but is a larger change.
- **First-visit flights:** the Northwest Territories takes 0.84–1.0 s against 0.34–0.38 s on the present-day map, because the dated fill is tiled at tolerance 0 (review P3). The historical snapshot is no better.
- **Riding names:** the cards and picker show "Toronto--St. Paul's" (review C2).
- **Center dots:** two untracked center dots (review C3), and whether the "45 elections · 1867–2025" line is redundant.
- **Canada-only branches in the shared renderer** (review D1–D3). Per your one-renderer rule, these should become configuration before another country uses dated maps.
- **The US-history Alaska picker band** (review C4): in 1818–1846, Oregon Country's coast west of 129°W, including Haida Gwaii, can't be clicked or hovered. A fix is sketched in the review.
- **Items from commit `54fbfed5`:** an unused 10.6k-line `dist/data/us-canada-frontier-sources.json`, a duplicated source outline, a per-frame filter `JSON.stringify`, and `world-land.bin` growing 22% in the first preload.
- **Heap flags** at or above the 10 GB cap in `build:historical-coasts` and `build:canada-dated-maps` (review P8).

## Follow-up (2026-11-05, morning)

You asked for everything above except the Canada-only branches.

- **US snapshot (C4).** In the band north of 50° and west of 129°W, the US-history picker now returns nothing only for faces the Alaska land display replaces. Oregon Country's Haida Gwaii and northern BC coast answer again in 1818–1846. A click there still opens Canada's atlas, as any click outside the US does, so the fix shows in hover labels. A new `us-history` check uses `currentAtlas().hoverAt`; it fails before the fix and passes after.
- **Riding names (C2).** `scripts/build-canada-elections.mjs` turns `--` into `—` in riding names, and `federal.bin` was rebuilt. Only 1,346 riding names changed; candidates, results and `boundaries.bin` are identical.
- **Center dots (C3).** Rows 49 and 50 were added to `docs/center-dot-usage.md`.
- **Year changes (P2).** A riding file's fill is now coloured by feature state (`['feature-state','fill']`) instead of a data-driven `match`. The election view also no longer recolours the hidden province selection fill. Each election year used to lay out every riding tile and every province tile again. Measured with the same probe:

| Step | Before | After |
| --- | --- | --- |
| Within one representation order | 983–1254 ms (median ≈1.06 s) | 35–40 ms |
| New riding file | 2689–3902 ms | 1085–2042 ms |
| Page long task on a file change | 139–246 ms | 103–105 ms |
