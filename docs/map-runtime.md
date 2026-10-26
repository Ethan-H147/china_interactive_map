# Shared map runtime

Every country uses the same scene controller installed in app.js immediately after the MapLibre map is created. Country modules supply normal styling. They must not read satellite controls or compensate for satellite opacity themselves.

## Drawing order

map-scene.mjs puts every layer in a fixed band:

background → foreign land → satellite → country previews → subdivision fills → lakes → borders → selection → rivers → markers → labels.

Normal fill, line, circle and symbol layers inherit sensible defaults. Use layer metadata for exceptional roles:

    metadata: {atlas: {role: 'land'}}

Country previews use role 'context'. Foreign neighbouring land uses 'land'. Those declarations describe what a layer does and never depend on its ID or download timing. Explicit before arguments and moveLayer calls can reorder within a band, but cannot move a background above a country or a fill above a border.

Coarse fallback land and detailed country previews share map-palette.mjs. Available countries use the same gray before and after their detailed outline arrives; foreign land stays lighter. Developer-mode changes refresh every layer marked landPalette, so availability changes follow the same rule.

## Appearance

Only satellite.mjs owns imagery readiness, opt-in, quiz suspension and opacity. It sends the effective state to the scene after an actual raster tile loads. Every new layer inherits that state immediately, including countries added after imagery is enabled.

The scene retains authored paint independently from rendered paint. Turning imagery off restores normal paint, including updates made by statistical colors while imagery was visible. Motion previews copy baseLayer(), so they never apply the satellite transform twice.

A fill fades and retains selected/hover feedback by default. A constant-zero hit target stays invisible. Exceptions may declare atlas.satellite with fill 'fade', 'none', or 'province', lineColor, or lineOpacity 'fade'. Water opts out using satellite: false.

New renderer types must declare a role. Avoid introducing another country-specific appearance controller.

## Country lifecycle and failures

regional-collection.mjs and country-loader.mjs provide unloaded/loading/ready/failed state per country. Concurrent callers share a request. Completed countries are cached. A failed country can retry, and cannot block another country's readiness.

Regional portal setup uses createMapResources(). Failure removes that country's partial layers, sources and sidebar before retry. Keep new portal resources on the scoped map. Do not set ready/queued flags before the work succeeds.

Country selection remains governed by the existing cancellation/epoch checks. An obsolete country request cannot start a later camera flight.

## Verification

Run npm run test:runtime and npm run test:browser -- runtime. The first checks all 720 arrival orders for representative layer roles, paint restoration, valid zoom expressions, failed loads and cleanup. The browser suite derives its country list from countries.js, so a newly public country automatically participates.

Browser imagery uses a deterministic tile to test the application independently of a third-party service. Also inspect actual imagery locally at http://127.0.0.1:4174/#brazil, then refresh, switch to China and enable satellite.

Geometry remains a separate contract. Run test:polygon-parts, test:europe and test:compact after rebuilding boundary data; the runtime cannot repair missing geometry.

## Continuous international borders

International lines use one shared opaque stroke; they must never fade according to an individual fragment’s footprint. Subdivision/island outline fading remains independent.

`country-border-previews.bin` keeps detailed national edges available while country adapters and their subdivisions load on demand. The shared layer preserves claim filters and yields each edge to its adapter when that adapter's international layer is visible. Rebuild it with `npm run build:border-previews` after changing regional or South American border data; the border and globe-overview builds also refresh it. `npm run test:zoom-borders` checks close-up border pixels in both projections on desktop and mobile, plus the flat map's minimum zoom.

Russia–Kazakhstan and the inland Alaska–Canada reach use complete shared display arcs. Kazakhstan follows Russia's existing detailed exterior. Canada's affected municipal leaves, census divisions and provinces follow Alaska's existing exterior; Portland Canal remains water. `npm run build:northern-frontiers` reapplies these repairs after rebuilding either country's source data and refreshes the compact and overview assets. `npm run test:northern-frontiers` checks the hierarchy, national and fallback land coverage, and previously visible slits on desktop and mobile.

The border build finishes with reconcile-frontier-arcs.mjs. It joins reference topology before selecting the continuous detailed national-outline arc, joins shared tripoints, removes previous copies, and stores the resolved route once in atlas-frontiers.bin. Country fills are preserved. Run test:frontier-continuity and the frontier-continuity browser scenarios after changes.

Historical snapshots now suppress the replaced modern country fills in the resident world overview as well as in detailed portals. The active snapshot’s own context and international borders stay visible across overview zoom transitions. Both historical views are checked in flat and globe mode, on desktop and phone, including return to the modern map.

Country overview pages and Country tabs remain hidden by user preference. The registry disables country profiles for every regional map, including future additions. Entering or resetting a multi-region map opens Map settings; selecting a subdivision still shows its statistics. National statistics and the overview implementation remain retained.
