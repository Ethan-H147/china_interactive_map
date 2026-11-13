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


Globe rendering follow-up — 21 October 2026

The globe was rebuilding identical tile-clipping stencils whenever the renderer moved to another source. Most overview sources cover the same tile IDs, but each source switch repeated both globe mask passes. The pinned 6.11.2 renderer now reuses the immediately preceding stencil when its ordered tile IDs and reference table still match. A frame clear, native stencil invalidation, different coverage or replaced reference table prevents reuse. Terrain, custom layers, render-to-texture and flat projections retain the native path. Hooks reinstall after WebGL context restoration.

The source-update pass also repeated the same globe tile-visibility traversal for sources with matching tiling settings. It now shares that traversal within one synchronous update only. Each source receives independent mutable tile IDs. Native loading, retention, fading, bounds filtering and source events still run. Camera changes invalidate coverage through the globe's replaced frustum and clipping plane. Terrain and custom tile-zoom callbacks bypass the cache. No camera results remain cached between update passes. The vendor build checks the renderer version and both exact integration points before writing patched code.

The comparison below averages two 2.4-second pans per mode on Windows Chrome, at a 1366 × 1024 CSS viewport and moving pixel ratio 1. The map canvas was 1014 × 933 pixels. Both optimizations were disabled for the baseline; native geography, active layers, antialiasing and labels were the same. The profiler counts graphics submissions and time inside the main rendering call, including source updates. These are instrumented PC measurements, not iPad FPS or GPU presentation timings.

| Country overview | Draw calls per frame, before → after | Submitted vertex references, before → after | Mean rendering CPU, before → after |
| --- | ---: | ---: | ---: |
| China | 6,645 → 357 | 14.47M → 3.55M | 13.8 → 6.8 ms |
| Bolivia | 2,708 → 204 | 6.29M → 1.95M | 7.3 → 4.5 ms |
| Sweden | 4,690 → 259 | 10.33M → 2.60M | 12.5 → 5.2 ms |

The reduction in submissions is deterministic for a given tile arrangement. CPU timing varies with JIT warmup, GPU drivers, machine load and profiling overhead. Full results, including the stencil-only intermediate, are in performance-baselines/2026-10-21-globe.json. Repeat with npm run measure:globe-renderer, separately from browser regressions. Results are written under artifacts/tablet-performance/.

The independent frame-rate.html page samples animation callbacks on a small moving element without loading the atlas or creating a map canvas. It reports callback cadence, percentiles and interruption state. Callback cadence is a scheduling observation and does not establish how many GPU frames reached the screen. Use the public HTTPS page for iPad measurements. Safari 27's enhanced security can disable the JIT on plaintext HTTP origins, so an HTTP apartment-LAN preview does not provide a comparable performance baseline: https://bugs.webkit.org/show_bug.cgi?id=324968#c3. WebKit's near-60 preference and actual scheduling can also differ by build; measure the device before assuming a 120 Hz ceiling: https://bugs.webkit.org/show_bug.cgi?id=272165#c13.

npm run test:globe-renderer checks ordered stencil reuse and invalidation, independent tile IDs, source settings, nested or interrupted updates, graphics recovery and native fallbacks. Browser comparisons cover the poles, date line, globe-to-flat transition, selected outlines, population shading, quiz colors, satellite imagery, country switching, reloads and graphics restoration. Relevant tablet rendering, context-culling and trackpad-gesture regressions also run before publication. Boundary data and detail tolerances remain unchanged, including Denmark's restored pre-parish data and the retained local areas in Sweden, Norway and Finland.

The forced context-loss test also exposed an existing culling-order fault: native context restoration resizes before the replacement style has loaded. The scene now defers layout mutations during that interval and resynchronizes on style.load. Native Chrome multisample edge colors vary slightly between repeated frames, so pixel comparisons use repeated reference frames, a two-channel-unit envelope and strict transient/persistent pixel budgets. Desktop WebKit 26.5 produced zero differing pixels in seven overview, polar, date-line, projection-transition and Nordic comparisons; this checks compatibility and does not measure iPad Safari performance.


Adaptive motion and tile-list follow-up — 21 October 2026

The painter was building two coordinate lists for every source, including unused sources and sources with no visible native symbol layers. Symbol ordering performs its own bearing sort and includes fading tiles. The pinned renderer now builds that list only when a visible symbol layer uses the source, and skips both lists when the source is unused. Sources used for terrain, custom layers, offscreen rendering, flat projections and the diagnostic disabled configuration retain the native path. Source updates, data loading, tile retention and geometry are unchanged. Native symbol layers retain their own ordering rather than borrowing fill coordinates. The vendor build checks the exact integration point.

Warm sequential Chrome comparisons kept the existing stencil and source-coverage optimizations enabled in both configurations. China drawing CPU fell from 2.71 to 2.30 ms per frame, and Sweden from 1.97 to 1.68 ms: about 15% less time inside the painter. Whole rendering CPU fell from 5.62 to 5.15 ms and from 4.14 to 3.86 ms respectively. The first China pair was excluded for JIT warmup; the two later China pairs and all three Sweden pairs are recorded in performance-baselines/2026-10-21-tile-lists.json. These PC timings do not establish iPad FPS. A separate transform-feedback sphere-coordinate experiment added GPU bandwidth and did not improve GPU time, so it was removed.

Balanced still starts at moving pixel ratio 1.5, and Performance at 1. Sustained slow animation callbacks can lower Balanced through 1.25 to 1, and Performance through 0.875 to 0.75. The controller ignores gesture startup, measures at least 700 ms and 20 intervals, waits after each change, and allows at most two reductions per gesture. It samples animation callbacks independently of map draws, so sparse trackpad input does not by itself cause lower resolution. No geography, close-up precision, layer settings or labels are removed. Full device resolution returns after movement stops; Full resolution mode never adapts.

The motion budget targets 60 callbacks per second in Balanced and 90 in Performance when the browser's sustained idle callback cadence supports it. A bounded 40-callback probe uses the median after warmup. It recognizes a near-60 or near-30 scheduling ceiling instead of chasing the occasional fast interval with unnecessary blur. This only selects an adaptation target; it never limits map redraw frequency. The report includes requested and effective targets, measured idle callback cadence, learned moving ratio and adaptation count. It cannot certify how many GPU frames reached the screen.

The pinned 6.11.2 internal resize applies native canvas limits without stopping the camera or firing extra gesture events. Unknown renderer versions and graphics loss use the safe native fallback. Learned quality resets for a new country, projection, view scale, canvas size or device ratio, and retries the initial quality after a minute. Hidden pages cancel sampling. A synthetic slow-drawing browser regression exercises both reduction steps during one real touch drag, verifies one start/end event and camera movement, and checks native sharpness afterward. Tablet, trackpad, framebuffer, symbol visibility and graphics-restoration regressions cover the surrounding behavior.


Settlement preparation and shared-source residency — 9 November 2026

Settlement admission thresholds are now computed during data preparation and stored in a `dotzooms` table inside each existing settlement asset. Runtime point construction reads that table; missing metadata retains the original calculation. The table is separate from the settlement records because labels use their existing visibility thresholds. Coordinates, point IDs, names, aliases, population values, source fields, dot spacing and layer paint are preserved. Existing plain and compressed files are processed independently so this optimization does not reconcile unrelated differences between retained versions.

Run `npm run build:settlement-zooms` after directly rebuilding settlement data. The normal settlement build commands include this step. `npm run test:settlement-zooms` recomputes the exact thresholds, rejects stale metadata and compares cached and original point features. The deployment checks include this validation without publishing anything.

Regional adapters register shared background definitions with `dist/context-sources.mjs`. The controller uses the scene's existing bounds, horizon, overview, snapshot and border-ownership rules to prepare nearby context sources. Outgoing sources stay through gestures and a three-second reuse window, then unload while idle. This avoids source reloads between successive mouse-wheel zoom gestures. The active country's land reference stays prepared for view changes. Restoration uses the existing files, source tolerances, polygon transforms, paint and filters; it does not simplify boundaries or change the global overview. Detailed administrative geometry, selection and the one-country memory budget retain their existing lifecycle.

`npm run test:context-sources` covers lazy preparation, concurrent requests, cancellation and re-entry, and compares actual map pixels against a configuration with every registered shared source resident. Browser cases include close international borders, poles, the date line, globe and flat projections, satellite imagery, population shading, phone navigation, reloads and graphics restoration. `AtlasContextSourcesController.snapshot()` reports residency; `setEnabled(false)` and `whenReady()` provide a diagnostic full-residency comparison without changing geography.

Sequential local Chrome measurements at 1440 × 900 CSS pixels and device ratio 1 compared reduced, full and reduced residency in the same page, excluding the first pan in each configuration. Singapore retained 24 sources rather than 328 and rendering CPU averaged 1.10 ms rather than 1.67 ms per moving frame (34% less). China retained 35 rather than 339 sources and averaged 1.17 ms rather than 2.18 ms (46% less). These are renderer CPU measurements, not GPU timing or presented FPS. Country-entry main-thread stalls measured 81 ms for Norway, 158 ms for Finland and 271–333 ms for UK entries, compared with earlier local profiles of 254 ms, 491 ms and 916–1,125 ms respectively; those separate runs are observations rather than guaranteed latency reductions.

All 16 existing settlement assets were compared with their pre-change content after removing only the new admission table: every original field matched. The combined browser run passed 13 scenarios, followed by two final context framebuffer/recovery checks. Existing runtime, startup, regional loading, Nordic source/density, border handoff and rendering-pipeline checks also passed.

All changes remain local until publication is explicitly requested. These optimizations do not establish the cause of the separate intermittent, refresh-cleared slowdown described in `docs/long-session-performance.md`.


China globe zoom follow-up — 9 November 2026

Rapid globe zoom reversals exposed churn in the initial shared-source residency implementation. Returning below the overview threshold evicted contexts immediately at moveend; the next wheel gesture fetched, decoded and indexed the same sources again. A short local 12-zoom sequence re-added 87 sources cold and 90 in the warm repeat, with 1,857 and 2,162 filter calls.

Shared contexts now retain a recently needed source for three seconds and defer eviction while the camera moves. Sources first admitted only for the diagnostic full-residency comparison are still immediately releasable. An expired or disposed pending load cannot resurrect a failed adapter. The global portal appearance refresh coalesces callbacks within one microtask, preserving paint-before-frame behavior. The same repeat admitted 12 sources cold and re-added zero when warm; filter calls fell to 198 cold and zero warm. Geographic inputs, source tolerances, layer paint and rendering quality are unchanged. This verifies removal of reload churn; it does not establish presented FPS or resolve every browser-specific slowdown.


Input and loading handoff follow-up — 9 November 2026

The foreground China trace separates cold loading stalls from warm input gaps. During the cold gesture, a 341 ms render gap overlapped boundary-body callbacks, worker results and a 103 ms rendering call. The renderer's median was 1.7 ms. A later warm drag drew 76 of 77 changed camera positions, with rendering CPU at 2.2 ms median, 3.9 ms p95 and 5.7 ms maximum. Pointer delivery paused for up to 185.7 ms while animation callbacks continued, with no observed long task or long animation frame. This does not identify a steady rendering CPU bottleneck or establish GPU presentation timing.

`addWorkerSource` now reads a successful response as a browser-managed Blob, preserving its exact bytes and the existing worker protocol, source options, retries and failure cleanup. It no longer materializes and copies large boundary bodies through a page ArrayBuffer. The existing country-boundary worker also parses the Antarctic pole mesh and transfers the same Float32 coordinates previously constructed immediately before WebGL upload. Claim metadata and all hit-test outlines remain intact. No data asset, simplification tolerance, map control or rendering-quality preference changes.

With the performance readout enabled, gesture reports distinguish input sample timestamps, listener delivery gaps and delay, raw-pointer delivery, changed camera positions, render submissions and rendering CPU. Raw-pointer observation is attached only during a traced gesture. Bounded long-animation-frame attribution helps locate cold stalls. These diagnostics do not send data or alter input handling. Input sample gaps alone cannot establish whether a pause began in the mouse, the operating system or Chrome; compare the sample timestamps and delivery delay before proposing an input workaround.

`node scripts/validate-source-handoff.mjs` checks identical handoff bytes and source options, preserved metadata reads, retries, HTTP failures and Blob cleanup. The `loading-handoff` browser case verifies that large boundary bodies stay off the page's ArrayBuffer path and compares every transferred GPU coordinate, claim field and hit-test outline with the original asset. Context framebuffer comparisons cover China, close borders, poles, both projections, satellite imagery and population shading.

An isolated Chrome trace reproduced the unattributed browser pauses and identified `AutofillAgent::ExtractFormsAndNotifyPasswordAutofillAgent` on the renderer main thread. Three native form-extraction tasks took 535–582 ms each; all six tasks totaled 1,672 ms. These native tasks were absent from JavaScript long-task attribution. The page had 2,759 connected form controls, most in unopened regional sidebars. Merely associating each country's fields with its own form did not improve extraction time, so that experiment was discarded.

Completed regional panels now leave the document while inactive. The same panel nodes, values and listeners are retained, and their adapter uses scoped lookups while detached. Country preparation mounts the target panel before warming its geometry and installing shared view controls; leaving parks it after existing cleanup. The shared satellite controls return to the permanent China panel before parking, keeping their IDs available for the next country. Shared background sources keep their existing independent lifecycle. This changes neither the map's data nor the displayed controls. The `panel-residency` browser case checks node identity, saved layer values, event handlers and unduplicated view controls through repeated country switches.

The matching isolated run had 153 connected controls. Its six native autofill tasks totaled 14.8 ms, with a 3.7 ms maximum. The early moving gesture's largest callback gap fell from 636 to 111 ms; warm rendering CPU stayed near 1.5 ms. A separate cold first-render cost remains visible in the trace. These single-machine traces identify and remove a native browser scanning bottleneck; they do not certify presented FPS or eliminate every cold-start cost. Raw traces are retained locally under `artifacts/china-loading-fix` in the task workspace.

After the satellite handoff correction, all 14 map/navigation scenarios passed in two isolated groups. They cover exact framebuffer comparisons, China globe reversals, desktop and phone rendering transitions, Nordic municipalities, facts, saved views, quizzes, remote islands, Antarctic claims and ending a quiz during a camera flight. The separate panel-state case and regional loading/lifecycle validations also passed.

Verification limit: the longer Oceania remote-island sequence stalled before the panel change and exceeded a 150-second bound when repeated afterward. Fresh Niue-entry comparisons passed with both boundary-body loading paths, but the complete Oceania sequence remains unverified. Its timeout is not counted as a passing check or used to attribute the China stall.


Historical fill integrity — 11 November 2026

Historical overview and regional display fills use zero source simplification tolerance. A selected Florida reproduction at globe zoom 5.3 had 218 discolored pixels in a 3,000-pixel interior patch with the previous tolerance, compared with two antialiasing pixels with exact paths. Disabling the stencil optimization left the defect unchanged. This identifies independent polygon simplification as the reproduced fill-seam cause; the fix does not increase globe mesh density or rebuild geographic assets.

The current timeline configuration omits inactive chronology cells and reused host land before expanding paths and indexing tiles. It preserves the gray land fallback, keeps the packed chronology for other periods, and reuses source data for unchanged configurations. Home-nation highlights draw from the existing modern land source. Regional coast inputs reuse the detailed modern background’s buffered-view clipping with their original dated ownership and border IDs. Panning outside that buffer returns to the overview while the next local window loads. This bounds tile-index memory without dropping visible geometry. Selected physical coasts reuse their verified paths directly. Legacy selected survey paths receive an interior check in the existing outline worker; real water holes remain, including sub-two-meter test rings. The selected-line source retains its existing adaptive tolerance and island fading. The same-tab selected-region stress sequence passed Florida, Nova Scotia, Newfoundland and Labrador, Australia, and India at overview and detailed zooms, including repeated crossings of the detail threshold. This is a regression check, not a guarantee for every device or session length.

The browser harness reports renderer crashes and bounds unanswered DevTools commands, so a failed map cannot leave this regression silently waiting forever. No diagnostic data leaves the device.
