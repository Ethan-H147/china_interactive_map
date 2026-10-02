# China Atlas

Interactive static map using DataV GeoAtlas, official NLSC Taiwan county/city boundaries, and AreaCity/Amap outlines for Xinxing and Baiyang. MapLibre GL JS 6.11.2 and the data snapshot are bundled, so the running map does not depend on a live map API or CDN.

## Exploring and rendering

Map settings is the default panel. Selecting a region opens its details; Featured regions is temporarily hidden. Cultural cards are assigned to their province and specific subdivision codes. Subdivision lists appear only for a region whose children are included in the dataset.

Districts and directly administered county-level divisions are visible and selectable by default. In subdivision mode, they take priority over the underlying province. Disconnected parts share a region identity and selection state. Xinjiang's direct cities are identified as county-level cities. `node scripts/validate-selection.mjs` checks every part of its 12 mapped direct cities, layer visibility, and selection priority.

`dist/data/xinjiang-administration.json` records 12 mapped XPCC city/division pairs, county-level status, Aral's rank terminology, and Ili's administration of Tacheng and Altay. Xinxing and Baiyang use published AreaCity/Amap polygons; their areas are removed from the older surrounding prefectures. Caohu has a searchable administrative entry with its official establishment announcement and an explicit missing-boundary notice. Selecting Caohu does not highlight or navigate to an invented outline. The Ili polygon represents its directly administered area; Tacheng and Altay remain separate polygons. XPCC city boundaries do not cover every farm under the corresponding division.

All 533 mapped regions have English and Chinese names. Taiwan uses the official NLSC English and traditional Chinese names, with actual categories: 6 special municipalities, 3 cities, and 13 counties. Official Taiwan codes use a `TW-` namespace internally to avoid collisions with mainland identifiers. The sidebar shows a bilingual parent link and a PRC or ROC flag above the category label. Search accepts English, Chinese, codes, and sourced regional names.

`dist/data/region-names.json` records sourced Tibetan, Uyghur, Kazakh, Kyrgyz, and traditional Mongolian spellings for relevant regions. It includes each name’s language, direction, source, and license. Regional names are attached to individual administrative codes, so they are not inherited from a parent. Traditional Mongolian uses vertical columns from left to right; Arabic scripts use right-to-left text. The Noto regional fonts and their SIL Open Font Licenses are bundled locally.

To refresh names, run `node scripts/fetch-region-names.mjs` and `node scripts/fetch-regional-scripts.mjs`, review their snapshots and the explicit overrides in `scripts/name-sources`, then run `node scripts/build-region-names.mjs` and `node scripts/validate-names.mjs`. Wikidata records are matched by administrative code; supplemental regional script spellings come from the linked Wikipedia articles. The source snapshots are retained for review. Only sourced spellings are displayed; this is not complete language coverage for every autonomous division.

MapLibre draws boundaries with WebGL. Geometry tiling and triangulation run in two workers, and panning moves GPU buffers instead of repainting full-country SVG paths. All sources use zero simplification tolerance and a maximum source zoom of 18. The map stops at zoom 11 (equivalent to the previous Leaflet zoom 12). Pixel ratio follows the device; no reduced-resolution canvas is used.

The display dataset is stored as a lossless gzip stream split into three files below 4 MiB each. `display-boundaries.parts.json` records the uncompressed checksum. The browser decompresses the original coordinates before sending them to MapLibre. No vertices are removed. Hover queries are suspended during movement; labels update after movement ends.

Automatic navigation locks map input and navigation controls until its movement completes, with a timeout recovery for background tabs. Reduced-motion preferences use an immediate move. Labels remain on the map during motion and their spacing is refreshed afterward. A single resize observer owns map sizing to avoid competing recenter operations.

Calligraphic headings use bundled Ma Shan Zheng and Marck Script subsets, with their open font licenses in `dist/vendor`.

## Boundary rendering

Run `npm ci` then `node scripts/build-boundaries.mjs` after refreshing source data. All 34 province/territory shapes are assembled from detailed subdivisions. `node scripts/prepare-additions.mjs` rebuilds the supplements from the retained official NLSC shapefile and the extracted AreaCity source records. Archive checksums and source licenses are recorded in `dist/data/additional-sources.json`.

The source files use independently generalized edges: even neighboring provinces’ detailed files do not share identical coordinates. Mapshaper 0.7.72 reconciles overlaps (min-area rule) and enclosed gaps narrower than 250 m in a derived display dataset. It does not simplify geometry or close open coastal channels. This is display normalization, not an administrative boundary update. The original source files and checksums remain intact.

Province fills, selection geometry, and boundary lines use one dataset. TopoJSON assembles three disjoint line networks so shared edges are drawn once. Supplemental overlays are applied after the original repair, preserving the exact borders of 31 unrelated regions. Overlapping older Fujian island components are replaced with NLSC outlines to prevent a second coastline around Kinmen and Matsu. Polygon fills have no base stroke, and renderer simplification is disabled. Taiwan camera views focus on nearby islands while retaining distant island geometry.

`npm test` checks original source hashes, polygon closure, retained land parts, province/subdivision area agreement, unique boundary segments, bilingual names, flags, selection behavior, and lossless decompression. It also compares all 31 unaffected province borders with the previous version.

## UI copy

Remove text that does not convey necessary information. Use plain, professional labels and factual descriptions. Do not add slogans, decorative headings, or promotional language.

## Preview

Run `node scripts/serve.mjs` and open http://127.0.0.1:4173.

## Boundary coverage

The display contains 34 province/territory features, 333 prefecture-level areas, 112 districts, 32 directly administered county-level divisions, and 22 Taiwan divisions. Caohu is an additional administrative entry without polygon geometry. The original DataV snapshot is retained separately and still has its original coverage. Source dates vary; retrieval does not imply administrative currency.

Source: https://datav.aliyun.com/portal/school/atlas/area_selector

`dist/data/manifest.json` records the original DataV URLs, hashes, and coverage. `additional-sources.json` records NLSC and AreaCity provenance and processing. NLSC uses the Taiwan Open Government Data License 1.0; AreaCity and flag-icons use MIT licenses. Original DataV files retain their original rights. Leaflet's earlier BSD license remains in `dist/vendor/leaflet-LICENSE.txt`.

## Renderer assets

Run `node scripts/vendor-renderer.mjs` after `npm ci` to copy the pinned MapLibre browser modules, worker, stylesheet, and license. These assets are served locally; the map does not load an external basemap or require an API key.

The local `/benchmark` route runs four timed pans near Tianjin and reports animation-frame intervals. It is available only from the preview server and is excluded from production. Automation timings depend on browser throttling and do not represent the user's display refresh rate.

## Validate or refresh

`node scripts/validate.mjs` verifies source hashes, feature counts, coordinate ranges, unique regional codes and local asset references. `node --check dist/app.js` validates application syntax.

`node scripts/fetch-data.mjs` refreshes the snapshot from DataV and vendors Leaflet. Review changed counts and coverage before publishing a refreshed map.
