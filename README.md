# China Atlas

Interactive static map derived from Alibaba Cloud DataV GeoAtlas GeoJSON. MapLibre GL JS 6.11.2 and the data snapshot are vendored, so the running map does not depend on a live map API or CDN.

## Exploring and rendering

Map settings is the default panel. Selecting a region opens its details; Featured regions is temporarily hidden. Cultural cards are assigned to their province and specific subdivision codes. Subdivision lists appear only for a region whose children are included in the dataset.

Districts and directly administered county-level divisions are visible and selectable by default. In subdivision mode, they take priority over the underlying province. All disconnected parts share their administrative code, selection state, and full-region bounds. Xinjiang's direct cities are identified as county-level cities; Beitun's note explains its direct administration and location within Altay, with a link to the city's official administrative history. Separate-area counts describe this boundary snapshot. Run `node scripts/validate-selection.mjs` to check every mapped part of Xinjiang's ten direct cities, both Beitun parts, layer visibility, selection priority, and the unchanged geometry checksum.

All 509 mapped regions have English and Chinese names. The sidebar shows the selected region in both languages and a bilingual link to its parent province. Search accepts English, Chinese, administrative codes, and the included regional names; English search also accepts spellings without diacritics.

`dist/data/region-names.json` records sourced Tibetan, Uyghur, Kazakh, Kyrgyz, and traditional Mongolian spellings for relevant regions. It includes each name’s language, direction, source, and license. Regional names are attached to individual administrative codes, so they are not inherited from a parent. Traditional Mongolian uses vertical columns from left to right; Arabic scripts use right-to-left text. The Noto regional fonts and their SIL Open Font Licenses are bundled locally.

To refresh names, run `node scripts/fetch-region-names.mjs` and `node scripts/fetch-regional-scripts.mjs`, review their snapshots and the explicit overrides in `scripts/name-sources`, then run `node scripts/build-region-names.mjs` and `node scripts/validate-names.mjs`. Wikidata records are matched by administrative code; supplemental regional script spellings come from the linked Wikipedia articles. The source snapshots are retained for review. Only sourced spellings are displayed; this is not complete language coverage for every autonomous division.

MapLibre draws boundaries with WebGL. Geometry tiling and triangulation run in two workers, and panning moves GPU buffers instead of repainting full-country SVG paths. All sources use zero simplification tolerance and a maximum source zoom of 18. The map stops at zoom 11 (equivalent to the previous Leaflet zoom 12). Pixel ratio follows the device; no reduced-resolution canvas is used.

The display-boundaries.json file is unchanged by the renderer migration (SHA-256: 7af3f1b451ba98675414149d6ad3a458330d67761e831350013c75265574225e). Hover queries are suspended during movement; labels update after movement ends. Original source files and the earlier boundary reconciliation remain unchanged.

Automatic navigation locks map input and navigation controls until its movement completes, with a timeout recovery for background tabs. Reduced-motion preferences use an immediate move. Labels remain on the map during motion and their spacing is refreshed afterward. A single resize observer owns map sizing to avoid competing recenter operations.

Calligraphic headings use bundled Ma Shan Zheng and Marck Script subsets, with their open font licenses in `dist/vendor`.

## Boundary rendering

Run `npm ci` then `node scripts/build-boundaries.mjs` after refreshing source data. The build uses the detailed subdivision polygons for 33 province-level regions. Taiwan retains its original outline because subdivision data is unavailable.

The source files use independently generalized edges: even neighboring provinces’ detailed files do not share identical coordinates. Mapshaper 0.7.72 reconciles overlaps (min-area rule) and enclosed gaps narrower than 250 m in a derived display dataset. It does not simplify geometry or close open coastal channels. This is display normalization, not an administrative boundary update. The original source files and checksums remain intact.

Province fills, selection geometry, and boundary lines are derived from this single normalized dataset. TopoJSON assembles province polygons and three disjoint line networks so shared edges are stroked once. Polygon fills have no base stroke, and renderer simplification is disabled to keep selection edges aligned with line networks.

`node scripts/validate-boundaries.mjs` checks subdivision counts, ring closure, matching province/subdivision areas, retained land polygon parts, unique line segments, shared province edges, removal of coarse province shapes, and a maximum 0.5% province area change from source data. Two source polygon parts overlap neighboring regions and are assigned to those neighbors by normalization; their land coverage remains present.

## UI copy

Remove text that does not convey necessary information. Use plain, professional labels and factual descriptions. Do not add slogans, decorative headings, or promotional language.

## Preview

Run `node scripts/serve.mjs` and open http://127.0.0.1:4173.

## Boundary coverage

The snapshot contains 34 province-level features, 333 prefecture-level regions, 112 districts, and 30 directly administered county-level regions. The provider labels direct counties as `city`; the app distinguishes codes with `90` in the third and fourth positions. Municipalities, Hong Kong and Macao use district subdivisions. Taiwan has only an outer outline in this source. Boundary vintage is unspecified, so retrieval does not imply administrative currency.

Source: https://datav.aliyun.com/portal/school/atlas/area_selector

`dist/data/manifest.json` records every downloaded URL, retrieval date, byte count, SHA-256 checksum and regional coverage. Geometry is stored unchanged. Display follows the provider's territorial representation and is intended for geographic exploration. The provider retains rights in its data; no additional data license is asserted here. Leaflet's BSD license is preserved in `dist/vendor/leaflet-LICENSE.txt`.

## Renderer assets

Run `node scripts/vendor-renderer.mjs` after `npm ci` to copy the pinned MapLibre browser modules, worker, stylesheet, and license. These assets are served locally; the map does not load an external basemap or require an API key.

The local `/benchmark` route runs four timed pans near Tianjin and reports animation-frame intervals. It is available only from the preview server and is excluded from production. Automation timings depend on browser throttling and do not represent the user's display refresh rate.

## Validate or refresh

`node scripts/validate.mjs` verifies source hashes, feature counts, coordinate ranges, unique regional codes and local asset references. `node --check dist/app.js` validates application syntax.

`node scripts/fetch-data.mjs` refreshes the snapshot from DataV and vendors Leaflet. Review changed counts and coverage before publishing a refreshed map.
