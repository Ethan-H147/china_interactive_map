Shared map performance audit — 17 October 2026

This update profiles selection, country switching, high-rate pointer movement, panning and zooming across 14 representative regions: Nunavut, Alaska, Sakha, Magallanes, Maluku, Palawan, Sarawak, Scotland, Amazonas, Tierra del Fuego, Hokkaido, Busan, Khövsgöl and Chengdu. The audit uses the real local site and Chrome through scripts/browser/harness.mjs. The original three-country residency cap stayed within its limit throughout the run.

The main recurring cost was pointer work. One short burst could perform hundreds of geometry queries, repeatedly decode the same rendered geometry and serialize the full map style. Statistical hover also replaced the same legend text over and over. The shared pointer-performance.mjs module now retains the latest input and samples all canvas-hover consumers once per animation frame. The country tooltip uses the same scheduling primitive. Pointer down, leaving the canvas and camera movement cancel queued samples; keyboard previews and click selection remain immediate. Stale callbacks cannot resurrect old tooltips.

The statistical color controller caches visible layer profiles during its existing style refresh. Hover reads those profiles without serializing every layer's paint expressions. It checks that cached layers still exist before querying. The legend keeps its DOM while the hovered unit and metric are unchanged. Tooltip dimensions are measured when the text changes and invalidated on map resize. Argentina's city-point picker also uses an ID index instead of scanning its complete record list for each hit.

The table shows the same 240-event pointer burst before and after the changes. Times include waiting for the next animation frame in the optimized run and depend on the local machine.

| Region | Geometry queries before → after | Hover burst before → after |
| --- | ---: | ---: |
| Nunavut | 240 → 1 | 51.4 → 19.7 ms |
| Alaska | 240 → 1 | 34.5 → 16.0 ms |
| Sakha | 240 → 1 | 29.3 → 6.0 ms |
| Magallanes | 480 → 2 | 195.2 → 7.4 ms |
| Maluku | 480 → 2 | 45.2 → 9.6 ms |
| Palawan | 480 → 2 | 94.4 → 5.3 ms |
| Sarawak | 240 → 1 | 47.4 → 8.0 ms |
| Scotland | 479 → 2 | 277.5 → 8.9 ms |

A separate 160-event test over US municipalities with population shading reduced 320 geometry queries and 160 complete style copies to 2 queries and zero hover-triggered style copies. The original dispatch took 194.8 ms; the optimized dispatch plus its frame update took 14.8 ms. Additional renderer-family samples used 1–4 queries for the whole burst. Panning and zooming remained healthy in this sweep, so their geometry and movement settings were kept intact. Country-switch durations include fetching, source readiness and the existing camera transition.

All boundary files, coordinates, geometry sources, close-up tolerances and zoom levels are unchanged. The optimization removes repeated work rather than changing what renders. Existing Great Lakes/Arctic exact-detail checks and northern island-preservation checks remain applicable.

Repeat the checks locally:

- npm run test:pointer-performance — shared frame sampling, point queries, keyboard previews, cancellation and cleanup.
- node scripts/browser/run.mjs pointer-performance — every renderer family, source stability, memory cap, statistical hover and stale-tooltip prevention.
- npm run measure:map-performance -- final — the full 14-region measurement sequence. An optional comma-separated country list after the run name limits the sweep.
- npm run measure:shaded-hover -- final — municipal population-shading measurements and CPU profile.
- npm run test:outline-detail — overview reduction and exact maximum-zoom stroke geometry.
- npm run test:island-selection — every original northern polygon, hole and vertex survives selected-outline extraction.

Measurements and CPU profiles are written under the ignored artifacts/map-performance/ directory. Future map-specific hover consumers should use onMapHover; future tooltip-like surfaces can use createFrameTask. This keeps the same bounded input work across countries without geographic exceptions.

Local preview: http://127.0.0.1:4174/?preview=map-performance#canada

No commit or publishing is part of this update.


Panning follow-up — 19 October 2026

Russia's default view was maintaining 137 GeoJSON sources. Nineteen were empty optional international-border references. Their visible borders are supplied by the existing shared frontier layers, and the empty references have no pixels or click targets. The compact-data build now records which FeatureCollections contain zero features. The regional loader skips those optional sources and their empty layers. Nonempty, unknown and explicitly required sources still load normally. The manifest validator checks the empty list against every retained input, so a future source update cannot silently remain on that list after a normal build.

Russia's default view now maintains 118 sources and 120 layers, down from 137 sources and 139 layers: about 14% fewer sources. Boundary files, polygon coordinates, fill precision, line tolerances, antialiasing, labels, camera settings and the three-country residency limit are unchanged.

The real-drag profile uses three 600 ms mouse drags at a 1440 × 900 viewport. Initial local Chrome measurements, without CPU throttling, were:

| View | Sources before → after | 95th-percentile moving frame before → after |
| --- | ---: | ---: |
| Russia default | 137 → 118 | 10.7 → 7.1 ms |
| European Russia | 137 → 118 | 7.1 → 3.7 ms |
| Sakhalin coast | 140 → 121 | 7.2 → 7.1 ms |
| Europe overview | 140 → 121 | 7.2 → 7.2 ms |

A separate sequential comparison with two-times CPU slowdown and a warm-up drag measured 14.3 → 14.2 ms at the 95th percentile on Russia's default view. The reduction in source bookkeeping is deterministic; frame timing varies with GPU, caching and machine load, so this is a modest overhead reduction rather than a fixed FPS gain. Benchmark-only restoration of the original empty sources provides the before configuration without changing the user's preview.

The browser regression reinstalls all 19 original empty references and compares the actual WebGL framebuffer before and after. Every pixel matched exactly at Russia's overview, a detailed coast, and a European view. The 10 targeted browser scenarios also cover refresh/country switch/satellite/return in Russia, Canada and Brunei, Borneo border continuity through zoom, Cambodia/Ukraine navigation and mobile quizzes, Crimea entry from Russia, and background frontier pixels.

Repeat with npm run test:empty-map-sources. Run node scripts/browser/measure-pan-performance.mjs after for the four-view profile. Add --with-empty-borders to restore the original source arrangement in the benchmark browser; --case=russia-default limits the sweep. BROWSER_CPU_SLOWDOWN can be set for a slower-machine comparison. Run benchmarks sequentially, separately from other browser tests. Measurements and CPU profiles are saved under artifacts/map-performance/. No publishing is part of this change.
