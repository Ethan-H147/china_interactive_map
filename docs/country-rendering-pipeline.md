# Country rendering pipeline

Country changes show the destination color and paint the silhouette before camera movement. Country adapters can prepare first-level payloads in workers during that flight; source installation and activation follow arrival. South American and regional adapters share this prefetch path, and Japan retains its existing worker preparation.

The shared controller in dist/country-render-pipeline.mjs coordinates refinement:

1. Keep existing fills and outlines live while the camera moves. Defer newly installed country detail and place labels.
2. After movement and adapter activation, paint the fill twice.
3. Reveal up to three newly installed line, circle or symbol layers per paint. Existing layers are excluded from this gate, including during later pans and zooms.
4. Attach up to six place markers per animation frame, with a three millisecond work budget.

A new gesture cancels pending work without hiding outlines already visible. A new country change snapshots the existing layer identities so only subsequently installed detail can be deferred. Country tokens prevent a superseded load from releasing a newer country's reveal. Marker removal also cancels pending attachment. The controller does not replace coordinates, rebuild geometry or rewrite the visitor's outline toggles. China retains its existing line rendering during movement; its label attachment uses the same frame budget.

Scene rendering uses the existing pinned MapLibre 6.11.2 render hook. Unknown renderer versions retain native detail drawing. Layer inventories use the pinned runtime order without serializing source geometry, with the normal style API as a compatibility fallback. Source inventories track registration and removal. Repeated filters are skipped; dynamic adapter filters bypass expensive whole-style validation and are compiled through the style-spec filter compiler in browser regressions. Callers can still explicitly request validation.

## Measurements

The retained local Chrome measurements are in artifacts/country-pipeline/. The figures below describe the initial staging implementation, before the correction that keeps existing outlines visible during panning. They are historical measurements, not current panning benchmarks. Those initial and optimized 1280-pixel runs recorded:

| Country | Initial main-thread tasks over 50 ms | Final main-thread tasks over 50 ms | Initial switch | Final switch |
| --- | --- | --- | --- | --- |
| Brazil | 2 | 0 | 5.25 s | 3.43 s |
| Argentina | 2 | 0 | 2.83 s | 1.52 s |
| Japan | 1 | 0 | 2.37 s | 1.82 s |
| Canada | 2 | 1 | 4.41 s | 3.81 s |

These single headless-browser runs include cold loading and settling. They demonstrate reduced application work; they do not certify zero dropped frames. RAF measurements still contain long gaps, particularly on cold Brazil and China loads. Actual display cadence also depends on hardware, graphics drivers, browser scheduling, data indexing and cache state. Do not describe this as a guaranteed zero-drop renderer.

## Checks

npm run test:country-render-pipeline checks paint ordering, label limits, cancellation, exact final borders, China's exception, adapter filter compilation, cold country entries, interrupted pans, rapid switches and desktop/phone residency. The pan-outline-continuity browser checks additionally count actual GL draws for existing Japan, Brazil, Argentina and Canada outlines while the camera moves on desktop and phone. Existing scene, motion, border-preview, palette, China selection and country-memory checks remain applicable. npm run test:deployment checks startup and packaging without publishing.

This change remains local. No commit, push, source synchronization or deployment was requested or performed.
