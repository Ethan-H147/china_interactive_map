# Stability audit · 18 October 2026

Morocco was added with 12 regions, 75 provinces/prefectures and 1,502 mapped communes, French/Arabic names, common English aliases, 2024 census figures, search, saved views, layer locks, statistical colors and first-level map/naming quizzes. One of the 1,503 official communes has no geometry and is disclosed rather than fabricated. The source territorial convention, ODbL geometry license and canonical Ceuta/Melilla reconciliation are documented in morocco.md.

## Verified results

- All 43 countries passed refresh → switch → satellite → return with rendered administrative fills, border ordering, actual imagery-layer readiness and resident-country checks.
- 89 distinct browser scenarios passed, including desktop/phone, close coastlines, selection during camera movement, search/click/label/saved-view identity, locked subdivisions, quiz scoring/restoration, globe framing and eviction/re-entry.
- The structural audit passed across 32 regional/Russia datasets: 151,041 catalogue identities and 59,492,965 geometry positions, including duplicated whole districts under declared multiple parents. Code uniqueness, parent relationships, ring structure, mapped coverage and chunk byte accounting were checked. Other adapter families retain their dedicated validators.
- Full deepest-level unions in Morocco, Thailand and Vietnam showed no material overlaps or mismatch with parent footprints; selected offshore/foreign water checks passed. Source-specific current administrative classifications and missing coverage remain explicit.
- Shared entry, runtime, compact geometry, color scales, statistics, country pages and the regional publishing gate passed. Preview startup, health, cache bypass, port conflicts, shutdown notification and restart recovery passed.

Two issues were repaired: Italy's Vatican reconciliation left two catalogue chunk-size records stale; the reconciliation now refreshes those records. Compact regeneration previously removed all files before rebuilding them; each replacement is now atomic so an open preview does not receive transient missing-file responses. The audit also accounts explicitly for New Zealand's multi-region districts and US municipalities that legally span counties.

## Measured performance

One isolated desktop Chrome run at 1280 × 900, with no other audit workloads. Countries were visited in table order; the map was selected, panned and zoomed in each. Navigation waits for country/camera/source readiness; the measurement is not a network-independent benchmark. The retained country count stayed at or below three throughout.

| Country | Navigation s | Selection s | Max frame ms | Frames >100 ms | Peak sampled working set GiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| china | 3.80 | 0.22 | 157 | 1 | 3.09 |
| canada | 2.96 | 0.84 | 64 | 0 | 4.00 |
| united-states | 2.17 | 0.33 | 600 | 2 | 4.09 |
| russia | 2.93 | 0.81 | 68 | 0 | 5.18 |
| brazil | 1.38 | 0.43 | 61 | 0 | 5.40 |
| indonesia | 1.67 | 0.19 | 68 | 0 | 5.63 |
| thailand | 1.56 | 0.27 | 50 | 0 | 5.88 |
| vietnam | 2.30 | 0.49 | 36 | 0 | 5.55 |
| morocco | 1.44 | 0.23 | 36 | 0 | 4.64 |

The largest observed main-thread task was 600 ms during the US visit. The summed browser working set reached approximately 5.88 GiB during the sequence and later fell to about 4.64 GiB. This confirms that a three-country count is not a RAM budget. No memory reduction or stall elimination is claimed by this audit. These measurements identify the next performance work: US entry/catalogue work and retained browser/worker/GPU allocations across heavy-country transitions.

Working set is sampled for the owned Chrome process tree, roughly every 500 ms plus enumeration time, and can double-count shared pages. Private bytes are committed memory rather than physical RAM; renderer JS heap excludes workers and GPU resources. Peaks are sampled observations, not guaranteed maxima. The raw baseline, including per-country residency snapshots, is in performance-baselines/2026-10-18.json. Repeat on the same hardware/viewport before comparing timings or setting thresholds.

See stability.md for commands, coverage and limits. Detailed generated reports and screenshots remain in artifacts/stability and artifacts/browser-tests locally; CI saves audit reports on future runs.

## Extended cloud audit follow-up

The full cloud suite exposed a missing Morocco menu stripe and an asynchronous map-view refresh that could overwrite an open native dropdown choice. The stripe now uses the shared gradient format; same-country status updates preserve a pending choice. US/Canada deepest-level fixtures now exercise municipalities, and the Netherlands methodology fixture includes all 18 first-level maps with their own verified economic figures. The expanded suite is split into ten CI shards to stay within job limits, and browser reports checkpoint after every scenario so interrupted runs remain visibly incomplete. Targeted desktop/phone regressions cover these repairs.

The hosted Site uses the version-pinned same-origin delivery adapter in hosting/, which avoids copying the entire 1.03 GiB asset tree into the provider build. Complete data remain in the public GitHub source; the adapter has strict path/method checks, streams unchanged bytes, strips source-view-only headers, and forwards no user credentials or query strings. Its unit and real browser smoke checks are recorded separately from the local atlas baseline.
