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
