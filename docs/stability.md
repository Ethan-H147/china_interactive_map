# Atlas stability audit

Run the atlas from its project directory with npm start. The fixed preview is http://127.0.0.1:4174/. Keep that terminal running; Ctrl+C stops it. A local-only banner appears after two failed health checks and clears when the same server returns. Port conflicts produce a clear startup error. Preview responses bypass deployed service-worker versions and browser caching. The health endpoint and banner script are injected by the preview server and are absent from the published site.

## Repeatable checks

- npm run test:regression-map: every registered country, including developer routes, exercises refresh → switch → satellite → return. Real Chrome checks rendered administrative fills, rendered borders, shared scene ordering and the three-country residency ceiling. Imagery uses a deterministic tile fixture, so an imagery-provider outage cannot masquerade as an atlas regression. Screenshots and a per-country coverage matrix are saved.
- npm run test:regression-features: selected coastlines at close zoom, Arctic/Great Lakes outline detail, level locks on desktop/phone, selecting during movement, shared identity through map clicks/labels/search/saved views, quiz scoring and restoration, globe framing and country eviction/re-entry. Country-specific scenarios retain real mouse/touch/keyboard interactions.
- npm run test:stability-data: duplicate identities, parent relationships, mapped coverage, closed/nondegenerate finite rings and exact chunk byte accounting across regional/Russia datasets; Morocco source hashes and official identities; full polygon unions and offshore sentinel points in Morocco, Thailand and Vietnam; shared map/naming quiz pools.
- npm run test:preview: startup, health, cache bypass, path containment, port conflict, visible stopped-server feedback and recovery.
- npm run measure:stability: nine representative heavy/new countries, measuring navigation and selection completion, frame p95/max and stalls over 50/100 ms, long tasks, renderer JS heap and sampled browser memory. Run alone after browser/data checks finish. Windows samples the owned Chrome process tree; it never includes unrelated browser sessions.

npm run test:regression combines the map and feature suites. The browser runner supports --shard=i/n and scenario/file filters. Every scenario fails on unexpected page exceptions, console errors or failed requests. Deliberately blocked requests in failure-recovery scenarios are handled explicitly.

## Evidence and limits

Reports live in artifacts/stability and screenshots in artifacts/browser-tests. These generated directories are ignored by Git. Browser summaries identify each scenario and record duration/failure; the map matrix records the last completed country, so a partial run is distinguishable from a complete pass. CI runs the browser suite in shards and requires the data audit before deploying GitHub Pages, retaining audit reports as artifacts.

Geometry structure is checked across all regional/Russia administrative chunks. Source-specific validators remain responsible for current administrative identities and published coverage exceptions. New Zealand territorial authorities can have several regional parents and must retain identical geometry in each parent chunk. US municipalities attach directly to their state because legal governments may span county lines; optional Census places use the combined coverage chunk. Neither case is an orphan hierarchy.

The spatial union audit compares the sum of deepest-level land polygons with their union and first-level footprints, using a 0.1 km² tolerance for coordinate rounding. Sentinel points exercise known offshore/foreign exclusions. These tests detect overlaps and water-mask regressions at their tested locations; they do not prove that every coastline or source vintage worldwide is authoritative. Thailand's islands, municipal footprint and legacy local polygons remain explicitly classified rather than relabeled as current subdistricts.

The three-country cache bounds resident datasets, not process RAM. The data audit reports compressed/decoded byte totals by country, and the performance run observes actual process memory. Sampled working sets may count shared pages more than once; private bytes are committed memory rather than physical RAM; renderer heap excludes workers/GPU. Recorded peaks are sampled peaks, not a guaranteed maximum. Compare repeated runs on the same machine and viewport. Hardware-independent pass/fail timing or RAM limits are deliberately not inferred from one machine.

## Repair found during this audit

Italy's Vatican enclave repair changed two lazy geometry chunks without updating their catalogue byte sizes. The catalogue is corrected and reconcile-vatican now refreshes accounting after geometry changes, so future rebuilds cannot recreate that mismatch.

Compact-data rebuilds keep old files available until replacements are ready and replace each file atomically. This prevents transient missing-data responses in an already open preview while shared geometry is being rebuilt.

The first completed audit and isolated performance baseline are recorded in stability-audit-2026-10-18.md and performance-baselines/2026-10-18.json.
