# Boundary Atlas

Boundary Atlas is the project's working name; the public site name is not yet decided.

Interactive static map using DataV GeoAtlas, official Taiwan, Hong Kong and Macau boundaries, and AreaCity/Amap outlines for Xinxing and Baiyang. MapLibre GL JS 6.11.2 and the boundary snapshot are bundled. Optional satellite imagery loads from EOX.

## Exploring and rendering

Map settings is the default panel. Selecting a region opens its details; Featured regions is temporarily hidden. Cultural cards are assigned to their province and specific subdivision codes. Subdivision lists appear only for a region whose children are included in the dataset.

Districts and directly administered county-level divisions are visible and selectable by default. In subdivision mode, they take priority over the underlying province. Disconnected parts share a region identity and selection state. Xinjiang's direct cities are identified as county-level cities. `node scripts/validate-selection.mjs` checks every part of its 12 mapped direct cities, layer visibility, and selection priority.

`dist/data/xinjiang-administration.json` records 12 mapped XPCC city/division pairs, county-level status, Aral's rank terminology, and Ili's administration of Tacheng and Altay. Xinxing and Baiyang use published AreaCity/Amap polygons; their areas are removed from the older surrounding prefectures. Caohu has a searchable administrative entry with its official establishment announcement and an explicit missing-boundary notice. Selecting Caohu does not highlight or navigate to an invented outline. The Ili polygon represents its directly administered area; Tacheng and Altay remain separate polygons. XPCC city boundaries do not cover every farm under the corresponding division.

All 536 mapped regions have English and Chinese names. Taiwan uses the official NLSC English and traditional Chinese names, with actual categories: 6 special municipalities, 3 cities, and 13 counties. Hong Kong and Macau use traditional Chinese names on the map and in the sidebar; search also accepts simplified names. Official Taiwan codes use a `TW-` namespace internally to avoid collisions with mainland identifiers. The sidebar shows a bilingual parent link and the PRC, ROC, Hong Kong or Macau flag above the category label. Search accepts English, Chinese, codes, and sourced regional names.

`dist/data/region-names.json` records sourced Tibetan, Uyghur, Kazakh, Kyrgyz, and traditional Mongolian spellings for relevant regions. It includes each name’s language, direction, source, and license. Regional names are attached to individual administrative codes, so they are not inherited from a parent. Traditional Mongolian uses vertical columns from left to right; Arabic scripts use right-to-left text. The Noto regional fonts and their SIL Open Font Licenses are bundled locally.

To refresh names, run `node scripts/fetch-region-names.mjs` and `node scripts/fetch-regional-scripts.mjs`, review their snapshots and the explicit overrides in `scripts/name-sources`, then run `node scripts/build-region-names.mjs` and `node scripts/validate-names.mjs`. Wikidata records are matched by administrative code; supplemental regional script spellings come from the linked Wikipedia articles. The source snapshots are retained for review. Only sourced spellings are displayed; this is not complete language coverage for every autonomous division.

MapLibre draws boundaries with WebGL. Geometry tiling and triangulation run in two workers, and panning moves GPU buffers instead of repainting full-country SVG paths. China, Korea, Mongolia and Japan use zero source simplification tolerance and a maximum source zoom of 18. The newer archipelago sources use a 0.25-pixel tiling tolerance and maximum source zoom of 16. The map supports zoom 16, with closer automatic views for Hong Kong and Macau. Pixel ratio follows the device; no reduced-resolution canvas is used.

The display dataset is stored as a lossless gzip stream split into files below 4 MiB each. `display-boundaries.parts.json` records the uncompressed checksum. These parts remain the build inputs. Visitors download `china-boundaries.pack.bin` instead: the display boundaries, city districts and fill fragments with each coordinate pair stored once as exact float64 bits and every ring referring to its points by index (about 5.4 MB instead of 21.4 MB). It decodes to byte-identical JSON. MapLibre's workers unpack it and build China's sources directly (`maplibre-worker-protocols.mjs`), so the geometry never passes through the page; the page reads names, bounds and part counts from `china-regions.json`. Province outlines still omit the segments drawn by the international border layer. `npm run build:china-pack` regenerates both files after any change to the inputs, and `npm run test:china-pack` fails if either is stale or if any worker-built source differs from the former main-thread build. No vertices are removed. Hover queries are suspended during movement; labels update after movement ends.

Every boundary layer draws each edge once. A translucent stroke drawn twice turns darker, and where two datasets trace the same edge with different vertices the doubling alternates segment by segment, so a border looks dashed. `hiddenSegments` in `adaptive-lines.mjs` therefore hides a segment when it lies within 2 m of an international line that has its own layer, or within 0.5 m of a segment already drawn in the same layer (checked in both drawing orders; segments shorter than 1 m are never hidden by the second rule). Matching is geometric, not by vertex, because the province, neighbor and Russian datasets place their vertices differently. China's hidden segments are computed when the pack is built and stored with it, so the browser only skips them. The Japan, Mongolia, Russia, southern Africa and settlement builders apply the same rule, `npm run build:single-strokes` applies it to already-built files, and `npm run test:single-strokes` fails if any shipped line set draws an edge of 2 m or more twice (shorter overlaps stay below one pixel at zoom 16). Argentine city lines store each shared edge once with both city IDs, so selection still outlines the whole city.

Startup downloads begin as early as possible: `atlas-entry.js` requests China's pack before styles and modules load, and `index.html` preloads the outline files that every country loads at startup. Motion previews download after the first view is usable.

Automatic navigation locks map input and navigation controls until its movement completes, with a timeout recovery for background tabs that lands the camera on its destination. Reduced-motion preferences use an immediate move. Labels remain on the map during motion and their spacing is refreshed afterward. A single resize observer owns map sizing to avoid competing recenter operations.

Calligraphic headings use bundled Ma Shan Zheng and Marck Script subsets, with their open font licenses in `dist/vendor`.

## Philippines and Indonesia

The Philippines has 18 regions and 82 provinces; Indonesia has 38 provinces and 514 regencies and cities. Explicit `#philippines` / `#indonesia` routes open either map directly. Map silhouettes let visitors switch countries. The selection-level lock preserves the chosen level during selection and reset. Returning visits and shared views preserve the country, selection, camera and visible layers. Both use the carriage-wheel loading placeholder and support satellite imagery. No population or economic statistics are added for these countries. Isabela City is searchable as a component city and shown with a dashed regional-exception outline in province mode. Basilan provincial geometry includes the city, while regional geometry assigns it to Region IX and the rest of Basilan to BARMM. The relevant detail panels include a PSA-linked explanatory footnote; the city does not increase the 82-province count.

Philippine geometry comes from NAMRIA / PSA through OCHA's [COD-AB release](https://data.humdata.org/dataset/cod-ab-phl); Indonesian geometry comes from Statistics Indonesia (BPS) through [COD-AB](https://data.humdata.org/dataset/cod-ab-idn). Both are CC BY-IGO. Negros Island Region is reconstructed from its three provinces under RA 12000; Sulu belongs to Zamboanga Peninsula under EO 91/2025. NCR's statistical districts, Isabela City and Bangsamoro's Special Geographic Area contribute to regional shapes but are not presented as provinces. Independent cities embedded in the source provincial geometry are not separately mapped. Indonesia's four new Papua provinces are reconstructed from their constituent regencies under the 2022 laws. Source regency IDs remain stable identifiers, not claims about current official administrative codes. Eight source lake/reservoir/forest polygons are excluded from the administrative catalogue. Dates and limitations appear in each country's Sources & coverage link.

GeoNames (CC BY 4.0) supplies 2,754 Philippine and 6,382 Indonesian named island, island-group and atoll entries, including aliases. These are geographic search results, separate from administrative levels. Where a catalogue point matches a dissolved physical land component, selection fits that island's bounds. Otherwise selection shows its catalogue location and states that an extent is unavailable. Borneo and New Guinea focus on their Indonesian portions. The catalogue does not claim coverage of unnamed islands.

`scripts/fetch-archipelago.mjs` reads ZIP directories using HTTP byte ranges and downloads only the needed ADM2 entries rather than entire multi-level archives. Raw downloads and the intermediate geometry cache are ignored by Git and excluded from the deployed site. Rebuild with `npm run build:archipelago`. The published provenance reports record source URLs, checksums, file sizes and administrative corrections.

Shared topology is cleaned and simplified together to 20 metres before partitioning into 18 regional and 38 provincial detail files. Country overview geometry uses 250-metre first-level and 500-metre second-level detail; inactive country silhouettes use 800-metre detail. Searches load a small name catalogue, not detailed geometry. Normalized aliases are indexed once per country. Local detail is prepared in a temporary worker after movement ends, with at most two chunks on narrow screens or three on larger screens and a 12 MiB decoded-data budget. Obsolete chunks lose their MapLibre sources and blob URLs; leaving a country releases all of its installed geometry except the small context silhouette. Cancelled country requests cannot install stale detail. Inactive countries are no longer eagerly preloaded at startup. New country geometry stays within this bounded native renderer during movement.

The dense Mahakam Delta islands appear at zoom 9 and closer, in city-scale views around Samarinda, while wider province views stay clear. Their original geometry stays in the existing province/regency sources, with visibility handled by the renderer; crossing the zoom threshold needs no new download or source replacement. Mainland and administrative edges remain unchanged. The inactive gray silhouette also omits these islands.

`npm run test:archipelago` checks administrative counts and hierarchy, island search, geometry retention, coastal detail visibility, view links at southern latitudes, loading isolation, eviction, cold selections and stale worker disposal. `/archipelago-benchmark` is a local-only panning and switching measurement page; its script is excluded from production.

## Map quiz

The Quiz tab asks users to locate named prefecture-level places on the existing GPU map. Scope can be all China, with or without Taiwan, or one province-level region that has eligible divisions. Taiwan uses its 22 city and county divisions. Municipal districts, SAR subdivisions, directly administered county-level divisions, and missing outlines are excluded. Questions show English and Chinese names; map labels and hover names stay hidden until the answer is revealed.

Rounds contain 10, 20, or all eligible places, capped by scope size and shuffled without repeats. One click records each answer. Correct areas appear green, incorrect selections red; revealing an answer counts separately. Results show the score and provide buttons to review missed places. Users can pan and zoom, fit the selected scope, or end a round. Keyboard users can pan the focused map and press Enter to select the area under the crosshair. Quiz state is held only in the current browser tab.

`dist/quiz-engine.mjs` handles eligibility, question order, and scoring. `node scripts/validate-quiz.mjs` checks province and Taiwan scopes, exclusion of county-level cities and districts, unique questions, ignored out-of-scope answers, and single scoring per question.

## Boundary rendering

Run `npm ci` then `node scripts/build-boundaries.mjs` after refreshing source data. All 34 province/territory shapes are assembled from detailed subdivisions. `node scripts/prepare-additions.mjs` rebuilds the supplements from the retained official NLSC shapefile and the extracted AreaCity source records. Archive checksums and source licenses are recorded in `dist/data/additional-sources.json`.

The source files use independently generalized edges: even neighboring provinces’ detailed files do not share identical coordinates. Mapshaper 0.7.72 reconciles overlaps (min-area rule) and enclosed gaps narrower than 250 m in a derived display dataset. It does not simplify geometry or close open coastal channels. This is display normalization, not an administrative boundary update. The original source files and checksums remain intact.

Province fills, selection geometry, and boundary lines use one dataset. TopoJSON assembles three disjoint line networks so shared edges are drawn once. Supplemental overlays are applied after the original repair, preserving the exact borders of 26 unrelated regions. Overlapping older Fujian island components are replaced with NLSC outlines to prevent a second coastline around Kinmen and Matsu. Polygon fills have no base stroke, and renderer simplification is disabled. Taiwan camera views focus on nearby islands while retaining distant island geometry.

The original DataV file assigns a detached 21-vertex polygon near Qitaihe to Jiamusi. AreaCity release 2025.251231.260403 combines Amap and Tencent boundaries and places about 99% of that polygon inside Qiezihe District, Qitaihe. Its Huanan County polygon has no corresponding detached part. `jiamusi-correction.mjs` transfers that one part to Qitaihe and dissolves the shared border, retaining the existing land extent and coordinates. The remaining reference differences reflect different boundary geometry. `boundary-corrections.json` records the evidence and checksums. `validate-jiamusi.mjs` verifies ownership, conserved land area, exact provincial coverage, and unchanged geometry for the other 500 subdivisions and Korea.

Hong Kong uses the Home Affairs Department's 18 district jurisdictions with Lands Department sea polygons erased, preserving offshore islands and channels. Macau uses seven parishes plus Cotai, New Urban Zone A, the University of Macau site, and the Macau port administration area from the government map. The three added areas have internal map IDs 820009–820011; these are not official administrative codes. `node scripts/prepare-sar-boundaries.mjs` rebuilds these datasets from the retained government downloads. Macau Grid coordinates are converted with the official Annex I six-parameter transformation, checked against its three worked examples. SAR polygons enter the build after the legacy gap repair; overlaps are removed from Guangdong. `node scripts/validate-sar.mjs` checks source edge preservation, island coverage, water channels, names, and categories.

Shenzhen's displayed city and nine district polygons use an OpenStreetMap physical land mask, including detailed port basins, seawalls and islands. The city retains 13,034 original shoreline coordinates from the 4 October 2026 snapshot. All 501 other regions, 33 other province shapes, and 45 districts in other cities remain exact. Inland district edges follow their previous paths; the Guangdong outline and boundary line networks use the updated city geometry. Original administrative source files are retained. The display depicts physical land rather than offshore jurisdiction; high-water shorelines can differ from a satellite mosaic because of tides, reclamation and survey dates.

Zhuhai, Guangzhou and Huizhou use the 4 October 2026 OpenStreetMap coastline snapshot. `npm run build:pearl-coast` prepares physical land from directed coast ways, refines exterior mainland edges and replaces complete offshore islands where jurisdiction is established. The national island catalogue provides 390 identity checkpoints; these identify islands but never supply shoreline vertices. Shared inland borders, the reviewed physical Macau port island, Shenzhen, Hong Kong and Macau retain their geometry. Guangzhou’s district overlay is clipped to the same parent coastline. `npm run test:pearl-coast` checks original shoreline vertices, island ownership, neighbor overlaps, district coverage, 499 unrelated regions and 43 unrelated districts. Source versions, coordinate precision, ownership matches and processing details are published in `pearl-coast-source.json` and `pearl-coast-report.json`.

The shared Shenzhen–Hong Kong land border copies 2,219 coordinates from the official Hong Kong outline between existing common junctions near the Shenzhen River estuary and Sha Tau Kok. Futian, Luohu and Yantian use the same border, including the connected endpoints of their internal district boundaries. Hong Kong's geometry remains exact. Other internal district segments, coastlines and estuary channels retain their coordinates. Nineteen small border slivers are assigned only when they share an edge with exactly one district. `shenzhen-hongkong-border.json` records the source checksum and displacement report; `scripts/additional-sources/shenzhen/hongkong-border.json` records the reviewed corridor. `npm run build:shenzhen-border` applies the repair, which is also included in the coastline and district build workflows. `npm run test:shenzhen` verifies source fidelity, unchanged unrelated geometry, preserved coastlines, valid coverage and district selection one metre from the shared edge.

The land mask, compressed original ways with OSM version metadata, checksums and query are published as `shenzhen-land.json`, `shenzhen-coast-source.bin` (gzip JSON), and `shenzhen-coast-source.json`, under ODbL 1.0 with OpenStreetMap attribution. `npm run build:shenzhen` applies the retained snapshot to the current display. To refresh, run `node scripts/fetch-shenzhen-coast.mjs`, `node scripts/prepare-shenzhen-coast.mjs`, `npm run build`, `npm run build:districts`, then `node scripts/refine-shenzhen-coast.mjs`. Review source changes and run `npm run test:shenzhen` before publishing. The test checks actual source vertices, known land/water points, preserved inland edges, and exact unrelated geometry.

Chongming Island uses OpenStreetMap relation 3292765 with 3,685 shoreline points. Fourteen connected coastline ways provide the opposite mainland bank. `node scripts/fetch-chongming.mjs` refreshes these WGS84 snapshots and their source versions. The build replaces only the main island and removes river water from Nantong within [121.10,31.42,122.05,31.93]. Haiyong and Qilong retain their Jiangsu jurisdiction; Changxing, Hengsha and the district’s other islands use the later detailed east-coast snapshot. Sources and downloadable GeoJSON are listed in `dist/data/additional-sources.json`, under ODbL 1.0.

`npm test` checks original source hashes, polygon closure, retained land parts, province/subdivision area agreement, unique boundary segments, bilingual names, flags, selection behavior, and lossless decompression. It compares all unaffected province borders with the earlier version. Chongming checks retain every detailed island vertex, verify river water and on-island jurisdiction, and compare unaffected subdivisions with their recorded snapshots.

## Population data

The population panel uses revision 94716774 of Chinese Wikipedia’s [city population table](https://zh.wikipedia.org/w/index.php?title=中華人民共和國城市人口排名&oldid=94716774). The snapshot contains 684 rows, of which 318 match map regions by exact Chinese name and province. The table uses 2020 administrative boundaries. Mainland census figures are dated 1 November 2020; Hong Kong is dated end of 2020 and Macau the fourth quarter of 2020.

`scripts/population-source.json` retains the extracted rows, revision, retrieval date, definitions, and downloaded HTML checksum. Run `node scripts/population.mjs` to regenerate the published dataset and match report. Pass a downloaded article HTML file as its first argument to import a new revision. The parser expands merged date cells and preserves missing values as `null`. It never estimates province totals or assigns a parent region’s population to its children.

`scripts/population-match-report.json` records every unmatched row and four matched rows with inconsistent figures (Dezhou, Dingxi, Wuzhong, and Karamay). The panel flags those figures and retains the source values. The original Shanxi row incorrectly named Linyi was excluded until Wikipedia corrected it to Linfen; the refreshed snapshot now matches Linfen automatically. Unmatched rows belong to county-level cities absent from the map. `node scripts/validate-population.mjs` checks matching, dates, missing values, source errors, and selection scoping, including rejection of the original misspelled row.

## UI copy

Remove text that does not convey necessary information. Use plain, professional labels and factual descriptions. Do not add slogans, decorative headings, or promotional language.

## Korea map

China and Korea use one map canvas. Click the gray Korean peninsula to zoom into Korea; China becomes gray while Korean divisions are active. Click China or use the header switch to return. The Korea view includes 29 first-level regions and 428 mapped second-level areas, with Korean and English names, country scopes, search, layer controls and animated navigation. Existing `korea.html` links open the integrated Korea view.

South Korean boundaries use the July 2026 SGIS-derived release from [vuski/admdongkor](https://github.com/vuski/admdongkor/tree/master/ver20260701), including the Jeonnam–Gwangju merger. Administrative-dong geometry is dissolved into provinces and municipalities without simplification. Ordinary city districts are merged into their cities. Sejong has no second-level entry; Jeju’s two administrative cities are retained. Published English names come from southkorea-maps, supplemented with romanized names for newer districts and merged city geometry.

North Korean boundaries use OpenStreetMap’s 13 first-level relations and their 199 direct subareas. These include mapped urban areas and districts with varying OSM administrative-level tags; the relation hierarchy determines their parent. Administrative polygons are clipped to 2,086 OSM coastline ways. Coastline direction identifies land, retaining islands and excluding maritime areas. Country and province outlines come from the displayed subdivision geometry, with uncovered portions taken from the source first-level region. Map data is a snapshot, not a guarantee of current legal boundaries.

Run `npm run build:korea` to download cached inputs and rebuild. Delete only the intended cached source files before a deliberate source refresh. Run `npm run test:korea` to validate bilingual names, unique IDs, parent relationships, interior label positions, city grouping, known locations and sea exclusion. `dist/data/korea-sources.json` records licenses, counts and input checksums. The `.bin` files contain gzip-compressed GeoJSON datasets.

Attribution: This data is derived from administrative-dong boundaries released by Statistics Korea SGIS (https://sgis.kostat.go.kr) under KOGL Type 1, modified by vuski/admdongkor (https://github.com/vuski/admdongkor), distributed under CC BY 4.0. North Korean boundaries and coastlines: © OpenStreetMap contributors, ODbL 1.0. Flags: flag-icons, MIT.

## Preview

Run `node scripts/serve.mjs` and open http://127.0.0.1:4173.

## Boundary coverage

The display contains 34 province/territory features, 333 prefecture-level areas, 104 districts, 11 Macau parishes and areas, 32 directly administered county-level divisions, and 22 Taiwan divisions. Caohu is an additional administrative entry without polygon geometry. The original DataV snapshot is retained separately and still has its original coverage. Source dates vary; retrieval does not imply administrative currency.

Source: https://datav.aliyun.com/portal/school/atlas/area_selector

`dist/data/manifest.json` records the original DataV URLs, hashes, and coverage. `additional-sources.json` records NLSC and AreaCity provenance and processing. NLSC uses the Taiwan Open Government Data License 1.0; AreaCity and flag-icons use MIT licenses. Original DataV files retain their original rights. Leaflet's earlier BSD license remains in `dist/vendor/leaflet-LICENSE.txt`.

## Renderer assets

Run `node scripts/vendor-renderer.mjs` after `npm ci` to copy the pinned MapLibre browser modules, worker, stylesheet, and license. The script removes one statement from the worker: a GeoJSON source loaded from a URL no longer copies its parsed data back to the page, which only `GeoJSONSource.getData()` uses and the atlas never calls. The script stops if a MapLibre upgrade changes that code. These assets are served locally. The standard map requires no external basemap or API key.

## Satellite imagery

Enable Satellite imagery in Map settings. The opacity slider blends it with the standard map. The layer loads only after opt-in, keeps administrative polygons selectable, and preserves the gray Korean Peninsula. It hides during quizzes and in Korea mode, then restores the user's choice. Names use contrasting text, and boundary colors follow imagery opacity. A failed initial load restores the standard map and allows another attempt; one missing tile does not disable imagery that has loaded elsewhere.

The source is [EOxCloudless 2025](https://cloudless.eox.at), a global Sentinel-2 annual mosaic with 10 m resolution. Web Mercator WMTS tiles use matrix `g`, `{z}/{y}/{x}`, and native zoom levels 0–14; closer map views enlarge those pixels. It is not live imagery. Raster tiles use the same geographic coordinate system as the map; no boundary coordinates are changed.

Attribution: EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025). The [CC BY-NC-SA 4.0 license](https://cloudless.eox.at/documentation/license) permits this personal, noncommercial use with attribution. Commercial use requires a separately licensed provider. Attribution appears on the map while the imagery layer is visible. The public tile service is provided without an availability guarantee.

`npm run test:satellite` checks lazy loading, tile event handling, layer order, opacity, country and quiz transitions, source attribution, and recovery after a failed initial load.

The local `/benchmark` route runs four timed pans near Tianjin and reports animation-frame intervals. It is available only from the preview server and is excluded from production. Automation timings depend on browser throttling and do not represent the user's display refresh rate.

## Validate or refresh

`node scripts/validate.mjs` verifies source hashes, feature counts, coordinate ranges, unique regional codes and local asset references. `node --check dist/app.js` validates application syntax.

`node scripts/fetch-data.mjs` refreshes the snapshot from DataV and vendors Leaflet. Review changed counts and coverage before publishing a refreshed map.
# Border alignment and coastline detail

`npm run build` and `npm run build:korea` finish with `reconcile-international.mjs`. It aligns adjacent exterior edges to the detailed North Korean boundary already sourced from OpenStreetMap. Edges within 2.5 km qualify; their intermediate vertices come from that boundary. A separate pass finds enclosed land-border gaps that touch both countries and repairs only those gap edges within 5 km. This closes the false triangular gap at Yanggu without widening the search along coastlines. Shared administrative junctions move with their exterior endpoint. A joint topology operation nodes matching edges, so the two sides use identical segments. Four China divisions and eight South Korean divisions are affected. `validate-international.mjs` checks border continuity, absence of enclosed gaps, ownership of the repaired land and exact preservation of the other 498 China subdivisions.

Country, province and internal boundary strokes are drawn separately, so coastlines are drawn once. `adaptive-lines.mjs` retains every original line segment in the source data, splits long GPU paths, and calculates each path's projected size. Tile simplification has a 0.65 pixel tolerance at the current tile zoom. Island outlines fade in between roughly 1.5 and 4 screen pixels; close views retain the detailed source geometry. Fill polygons and hit testing retain full precision. This applies to China, Korea, selected regions, Hong Kong and Macau.

Korea's compressed geometry is decoded and its drawing paths prepared in `korea-worker.mjs`. The UI receives small navigation metadata and Blob references; MapLibre's workers read those sources directly. Preparation starts in the background after China loads. Atlas changes use paint opacity and feature state, keeping the loaded layers ready without rebuilding their geometry. The local `/benchmark` route measures repeated switches and long tasks. Timing depends on browser scheduling and hardware.

## Capital display

The Capitals toggle is off by default and shared between China and Korea. Gold stars mark provincial capitals and regional government seats; larger red stars mark national capitals and Taipei’s central government seat. Names and roles appear on hover or keyboard focus. Municipalities use their city seat, without a second marker at a national capital. Stars are hidden during quizzes.

`dist/data/capitals.json` stores curated seats with WGS84 city-centre coordinates and individual GeoNames references (CC BY 4.0). Jeonnam–Gwangju includes its government offices in Gwangju, Muan and Suncheon. Markers follow MapLibre’s camera and are rebuilt only when visibility or map mode changes. `npm run test:capitals` checks coverage, duplicate cities, coordinate containment and quiz visibility.

## Wikipedia, landmark galleries and city districts

`region-articles.json` records verified English and Chinese Wikipedia sitelinks for all 333 mainland prefecture-level areas. Links come from the Wikidata entities already matched to administrative codes. They are a checked snapshot, not live synchronization. Run `fetch-explore-content.mjs` and then `prepare-district-names.mjs` to refresh the article and district-name records.

The gallery covers 20 landmarks across Beijing, Shanghai, Hangzhou, Nanjing, Suzhou, Guangzhou, Shenzhen, Xi’an, Chengdu and Chongqing. Every image retains its original pixel dimensions, with a minimum long edge of 2,560 pixels and short edge of 1,600 pixels. Locally hosted WebP images load lazily; the viewer shows the photographer, license, Commons source and original image. `scripts/additional-sources/landmark-photos.json` preserves the selected Commons metadata. After `npm ci`, `npm run build:gallery` downloads these exact originals and encodes them without resizing. City and district codes control gallery visibility; other places do not inherit nearby landmarks.

`npm run build:districts` builds a separate overlay for Hangzhou (13 divisions), Nanjing (11), Suzhou (9), Guangzhou (11) and Shenzhen (9). AreaCity’s Amap/Tencent county geometry is converted from GCJ-02 to WGS84, reconciled at shared edges and clipped to the existing city polygons. DataV fills uncovered portions only where its district polygons provide coverage. The remaining perimeter differences cover less than 0.5% of each city’s extent and select the parent city. The pipeline does not invent assignments for these residual differences. County-level cities and counties keep their actual type; Shenzhen’s Dapeng functional area remains within the statutory district data. Parent city polygons and the prefecture quiz pool are unchanged.

`npm run test:explore` verifies article coverage, all 53 district names, geometry containment and overlaps, photo dimensions and credits, gallery scope, quiz exclusion and district → city → province navigation. District source hashes and coverage measurements are published in `city-district-sources.json`.


## Huqiu and Suzhou Industrial Park

The district overlay follows current management in Suzhou. Suzhou Industrial Park is a separately selectable development zone under Suzhou, not a detached part of Huqiu. Its extent comes from OpenStreetMap relation 7363894, checked against the park government’s administrative history and current five-street structure. The previous eastern Huqiu component is assigned whole to the park to preserve its shared exterior edge; the new park polygon is cut out of neighboring district polygons before the shared line mesh is built. The retained source is in `scripts/additional-sources/city-districts/suzhou-industrial-park.geojson` (ODbL). The internal map identifier is a string, not an invented administrative code.

Gallery thumbnails use each photo’s natural aspect ratio without fixed frames or colored padding. Full-resolution source images remain unchanged.

## River and administrative boundary reconciliation

`npm run build:water` prepares the optional major-water overlay. Original selected Natural Earth 5.1.2 files and the mapped OpenStreetMap lower Yangtze are retained in `scripts/additional-sources/water/`. `dist/data/major-water-original.bin` preserves the independent overlay before reconciliation. Both water downloads contain gzip-compressed GeoJSON.

`boundary-reaches.json` records reviewed river/region pairs, finite corridor limits, official references and deferred cases. `reconcile-river-boundaries.mjs` extracts only shared polygon edges for these pairs. `river-conflation.mjs` requires a continuous parallel match of at least 8 km, maximum displacement of 2.5 km, average displacement below 1.2 km, monotonic traversal, limited detours and proximity in both directions. Matching stretches copy the intervening shared-edge vertices exactly. One-kilometre transitions remain inside each accepted stretch. Existing river endpoints and shared tributary nodes stay fixed. Administrative polygons, selection geometry, lakes and unapproved waterways remain unchanged.

This is a cartographic adjustment to the context layer. It does not establish current river channels or legal boundaries. Shared boundaries can follow older channels, especially on wandering floodplains. Jiangsu estuary branches, Zhenjiang's north-bank enclaves and island channels require separate review and are excluded from this pass. A nearby river crossing is never sufficient evidence for alignment.

`dist/data/river-boundary-report.json` records every accepted stretch, displacement, rule and boundary snapshot checksum. `npm run test:water` checks copied shared vertices, unchanged source features, river junctions, source extents and the lower Yangtze branches. Synthetic regressions cover transverse crossings, short accidental proximity, reversed paths and rivers leaving a boundary downstream. `node scripts/audit-river-boundaries.mjs` generates an unapproved proximity report in `artifacts/`; proximity candidates must be reviewed before adding a rule. Rebuild the water overlay after any administrative geometry update so its recorded checksum remains current.

## Shanghai, Zhoushan and Hengqin shorelines

Nanhui's mainland edge follows the mapped landward wetland boundary along the seawall, checked against the website's Sentinel-2 imagery. Exposed tidal flats and tidal training dikes are excluded from the land fill. The raised harbor access retains its mapped footprint. The correction changes only Pudong and the derived Shanghai outline. `npm run build:nanhui-shore` applies it and refreshes the water-layer checksum. `validate-nanhui-shore.mjs` checks the seawall, removed tidal-flat points, retained dry land and harbor access, unchanged inland boundaries, 501 other regions, all existing waterways, and repeated-build stability. Source geometry and the reviewed edge selections are recorded in `nanhui-shore.json` and `nanhui-shore-source.bin`.

Shanghai’s five coastal districts and Zhoushan use the 4 October 2026 OpenStreetMap coastline snapshot. `scripts/prepare-east-coast.mjs` assembles physical land from directed coastline ways. `scripts/refine-east-coast.mjs` updates only their display polygons and the derived Shanghai/Zhejiang outlines. Original shared inland edges remain fixed. The existing main Chongming shoreline and Shanghai/Jiangsu split are retained; Changxing, Hengsha, reclaimed Pudong islands and Zhoushan islands receive detailed physical outlines. The 2018 national island catalogue supplies identity and jurisdiction checkpoints, not invented shoreline points. Yangshan port islands remain under Zhoushan. Ambiguous unmapped rocks are left unassigned. Sources, versions, checksums and ownership matches are published in `east-coast-source.json` and `east-coast-report.json`.

Hengqin no longer uses the broad rectangular preservation window around Macau. Its physical shoreline is clipped from the retained OSM land mask, while the reviewed complete port island and unchanged Macau government jurisdictions are preserved. `validate-east-coast.mjs` checks the reported bay against original coastline segments and retained government edges, rejects the artificial 22.08° latitude cutoff, and compares 495 unrelated regions and all existing city-district overlays exactly. It also checks island vertices, neighbor overlaps, physical water, and shared inland borders.

Dishui Lake is available through **Map settings → Major rivers & lakes**. Its original OSM relation 5606982 preserves the water outline and two interior island holes. The mapped water area is 4.41 km², checked against Lingang’s published 4.46 km² main-water-surface figure. `node scripts/prepare-dishui-lake.mjs` prepares the retained snapshot; `npm run build:water` adds it to the existing optional overlay. Existing rivers and lakes stay exact.

To refresh coastlines, run `node scripts/fetch-east-coast.mjs`, `node scripts/prepare-east-coast.mjs`, and review the source changes before `npm run build:east-coast` and `npm test`. The refresh also downloads a candidate Dishui Lake snapshot; rebuilding the lake remains an explicit `node scripts/prepare-dishui-lake.mjs` step.

## Mongolia and province populations

Country themes update with the active map: China uses red and gold, Korea uses white with red and blue, and Mongolia uses blue with red and gold. The palette rules are in `dist/atlas-theme.css`; map fills and strokes use the corresponding country controller colors.

Jilin and Yanbian use precomputed fill triangles to avoid overlapping fills caused by vector-tile rounding around tiny border holes. Province and prefecture fill sources use zero simplification tolerance so adjoining triangles do not open diagonal cracks; line sources retain their separate display tolerance. The source boundaries and outline layers retain their original coordinates. Rebuild the fill data with `npm run build:fills` after editing either region; `npm run test:fills` reproduces the original faulty tile and checks the replacement across six zoom levels. Both standard boundary build commands include this preparation step.

Taiwan's shared county vertices are reconciled within 0.0000000001 degrees before deriving the outer outline, preventing inland Hsinchu edges from appearing as an outer border. Run `node scripts/reconcile-taiwan.mjs` to apply this to an existing display snapshot and `npm run test:taiwan` to verify shared borders and retained county vertices. Satellite imagery hides the gray Korea and Mongolia context fills after tiles load, and restores them when imagery is switched off, hidden for a quiz, or fails to load.

Click the gray Mongolia outline to enter Mongolia on the same map. China and Korea remain visible in gray. Mongolia has 21 aimags and Ulaanbaatar, with 330 soums and nine capital districts. Province and district outlines have separate toggles; search accepts English and Cyrillic names. The bottom map button moves from a district to its parent province, then to the country. Provincial pages include sourced traditional Mongolian script and census population.

Mongolia uses National Statistics Office boundaries. First-level shapes and the country outline are derived from the same district polygons. The shared southern edge follows the existing China outline, with source geometry, processing and checks recorded in dist/data/mongolia-sources.json and mongolia-border-report.json. Run npm run build:mongolia to rebuild from the retained snapshots, and npm run test:mongolia for geometry and rendering checks.

Province populations are in dist/data/province-population.json. China's mainland’s 31 regions use the official 2020 census; Taiwan uses its final 2020 census; Hong Kong and Macao use 2021 census totals. Mongolia uses the 2020 Census column of the requested Wikipedia Provinces of Mongolia table. Each page shows the census date, whole-region measure and source link. These are retained source snapshots. Rebuild with node scripts/prepare-province-population.mjs; refresh sources explicitly with --refresh, then review the changes and run npm run test:province-population.

## Japan municipalities and city wards

Japan includes all 47 prefectures, 1,741 municipalities (cities, towns, villages and Tokyo’s 23 special wards), and 171 administrative wards nested inside the 20 designated cities. These are municipalities, rather than subprefectures. The official source also contains six claimed village areas administered by Russia; their detail pages explain that distinction. They are excluded from the ordinary municipality coverage count.

Boundaries come from MLIT/GSI’s January 1, 2026 National Land Numerical Information release, published in April 2026 under CC BY 4.0. Japanese labels and five-digit municipality codes are retained. Romanized labels derive from Japan Post’s address catalogue. Sources, archive hashes, processing and coverage are published in dist/data/japan-local-source.json. Unassigned areas stay in prefecture outlines without invented municipal assignments.

At the national view, only prefectures appear. Selecting a prefecture automatically opens municipality mode unless the selection level is locked. Municipal borders are limited to that prefecture; designated-city ward borders appear when the city or one of its wards is selected. Municipality outlines and names have separate switches. Labels use the existing collision detector, with at most 60 viewport candidates. The sidebar’s local list starts collapsed, filters by name and initially displays 25 entries. Search includes every municipality and ward, including remote islands through their municipal names.

The country loads a compressed name catalogue (~136 KB), without municipal polygons. Detailed polygons are prepared in a worker and downloaded one prefecture at a time. The largest compressed prefecture is ~1.65 MB, with ~5.84 MB of decoded geometry. The controller retains one prefecture, enforces a 12 MiB decoded ceiling, terminates obsolete workers and removes sources and object URLs when the scope changes or Japan is left. Camera movement uses the bounded native sources; geometry uploads wait for the camera to settle. The overview remains visible until replacement sources are ready to paint. Municipal pages do not inherit prefecture population or economic figures.

Run npm run build:japan to download and regenerate the official boundaries and names. Raw archives, GeoJSON and intermediate caches remain in the ignored scripts/japan-sources/municipalities directory. Shared vertices are simplified together to 15 m before each municipality is dissolved independently. National prefectures use 80 m detail and the gray context uses 500 m. Do not apply a global overlap-cleaning pass: source validation found that it can erase whole municipalities. npm run test:japan checks complete counts, nonempty boundaries, identifiers, hierarchy, search, saved ward selections, source disposal, stale workers, selection locks and rendering readiness. The earlier scripts/build-japan.mjs is retained only as the original prefecture snapshot preparation; the package build command uses the current official municipal pipeline.

Japan’s population panels and comparison use the final 2025 Census, table 1-1, released September 29, 2026. Figures count usual residents on October 1, 2025. Current five-digit municipal codes join the census to boundaries; historical rows for former 2000 municipalities are excluded. All 47 prefecture totals match the sum of their municipalities, and all 20 designated-city totals match the sum of their wards. Coverage includes 1,741 municipalities and 171 city wards. The six claimed villages administered by Russia have no Japanese census figure. Municipal reference areas also come from this table; municipal GDP remains unavailable unless separately verified.

The country-only facts catalogue is about 47 KB compressed and contains no geometry. Flags appear in national, prefectural, then local order. Source records identify flags for all 1,741 ordinary municipalities and 67 designated-city wards. Missing or retired ward flags are omitted; municipal emblems are not substituted. Each displayed local flag links to its Commons source and license. Only the selected flag image loads. The atlas uses original Wikimedia Commons images, with local cached originals when available. Other countries do not download Japan’s facts or flags.

Run `node scripts/fetch-japan-local-flags.mjs` and `python scripts/prepare-japan-local-facts.py` to reproduce the records. The flag importer joins Wikidata’s official local-government codes and flag records, then checks explicit Japanese Wikipedia infobox flag fields for gaps. It excludes flags labelled with historical year ranges and retains Commons image metadata and reusable licenses. `--cache-images` optionally downloads originals; rate limits are respected. Raw census workbooks and source caches stay ignored. Published provenance is in `dist/data/japan-local-facts-source.json` and `dist/data/japan-local-flags.json`.

Comparison is also available in Japan and Korea from the sidebar footer or a selected region’s page. Japan offers prefectures, municipalities and designated-city wards; Korea offers provinces/special cities and cities/counties/districts. Parent and country names distinguish repeated local names. Available economy figures retain their year, local currency, USD conversion and source. Unverified Korean populations and other missing measures display “Not available.” Comparison uses existing metadata and never requests additional boundary geometry. China’s four municipalities remain eligible at both comparison levels.

### Restored China boundaries and provincial statistics

The experimental China detail dataset has been removed. China again uses the original, locally refined boundary/fill/motion bundles, including the Shanghai, Zhoushan and Zhuhai–Macao corrections. The preview query parameter and stored preference no longer select a different dataset. The rejected preview remains recoverable from Git history.

All 38 Indonesian and 82 Philippine provinces now have official population, reported area in km², nominal GDP and published GDP per capita. Indonesia uses BPS's 2026 midyear population projections, 2025 Ministry of Home Affairs areas, and April 2026 provincial accounts for 2025. The Philippines uses PSA's 2024 census, 2019 land-area masterlist reported in the census tables, and 2025 provincial accounts. Separately reported Philippine cities are excluded from statistical province totals; Basilan/Isabela and the Maguindanao split are explicitly documented. GDP per capita uses the published economic-year denominator, not the newer displayed population.

Statistics load only upon selecting an eligible province or Metro Manila. Indonesia's country bundle is about 43 KB and the Philippines' about 112 KB; requests are cached and late responses cannot overwrite another selection. Regencies, cities, islands and Philippine regions do not inherit provincial figures. Population appears above separate Area and Economy sections, retaining the expandable details panel. Currency conversions use World Bank/IMF annual-average rates for the metric's year.

Official source snapshots, units, queries and SHA-256 hashes are retained in `scripts/statistics-sources/archipelago/`. Run `node scripts/prepare-archipelago-statistics.mjs` to regenerate country bundles offline and `npm run test:archipelago-statistics` to check coverage, source integrity, units, conversion, lazy requests, ordering and cancellation. See the source directory README for PDF extraction and fresh source retrieval.

Metro Manila also displays PSA's official National Capital Region totals despite being a region without provinces: 2024 census population, land area from the 2019 masterlist, and 2025 GDP and GDP per capita. These cover the whole NCR, including its cities and Pateros, rather than the City of Manila alone. Its record is in the existing Philippine statistics bundle and requires no additional download. The other Philippine regions remain outside this statistics coverage.

The Philippine loading symbol uses the exact sun path and disk proportions extracted from the national flag SVG, with eight groups of three tapered rays. Its source artwork is retained in `scripts/symbol-sources/` and also supplies the displayed national flag. It uses the existing continuous rotation and reduced-motion behavior. Indonesia retains the carriage-wheel placeholder. The local `/symbols-preview` page shows every country's symbol and can pause the animations.

Japan's nationwide prefecture outlines remain visible in municipality and city-ward views, respecting the prefecture-outline toggle. Their existing layer is ordered above local polygon fills and below local strokes so detailed fills cannot cover neighboring borders. Municipal geometry still loads for only the selected prefecture. `test:japan` verifies visibility, fill/stroke order, independent outline toggles and the existing memory/loading checks.
Brazil and Uruguay remain inside the Changning developer mode; Argentina is public. Brazil includes IBGE's 2025 boundaries for 26 states and the Federal District; Argentina includes IGN boundaries for 23 provinces and Buenos Aires autonomous city. Argentine Antarctic and disputed South Atlantic claims are excluded from this continental view, with a note on Tierra del Fuego. Search supports accents, state abbreviations and CABA. Selection, camera and outline/name preferences use the existing saved-view system.

Lagoa dos Patos, Lagoa Mirim and Lagoa Mangueira show the ocean color: `npm run build:brazil-lagoons` cuts them out of the Brazilian state, DDD and Rio Grande do Sul municipal fills and Brazil's country silhouette, then redraws the shared borders, so municipal lines end at the shore. Patos and Mirim are IBGE's own operational lake areas from the municipal grid (retained in `scripts/additional-sources/water/brazil-ibge-lagoons.geojson`), so their shores share the municipalities' vertices; Mangueira is OpenStreetMap relation 7438177 (ODbL, snapshot `lagoa-mangueira-osm.json`). Run it again after rebuilding Brazilian geometry; `npm run test:brazil-lagoons` fails if any land fill covers a lagoon. South American country silhouettes, division views and selected regions have no coastline outlines. Shared inland division borders remain visible, and the official Uruguay River international boundary remains separate from the land on its shores. Municipal selection lines omit the parent exterior. `node scripts/prepare-south-america-borders.mjs` updates retained bundles without changing land polygons or record metadata; `test:south-america` verifies that exterior strokes are absent and internal borders remain complete. Country silhouettes remain clickable; there are no bottom-left continent flight buttons.

Brazil's administrative view also contains all **5,569 municipalities**, plus Brasília (Federal District) and Fernando de Noronha (state district), from IBGE's official 2025 municipal mesh. Select a state to reveal its internal boundaries and a filterable list, or search nationally by municipality name or IBGE code. The 290 KB compressed name index contains no geometry. Each of 27 state files loads separately in a temporary worker; at most one state's municipal geometry is retained, with a maximum of 2.51 MB compressed. Switching states, returning to States mode, changing to DDD/CEP, leaving Brazil or exiting developer mode releases detail and cancels obsolete work. MapLibre simplifies subpixel line detail at each zoom, and small paths fade continuously. Shared edges draw once; coastlines have no outlines. No municipal statistics are added. Brasília and Fernando de Noronha are labeled as their actual jurisdiction types; two operational lake areas are excluded. Saved views restore municipality selection and its parent state. `npm run build:brazil-municipalities` reuses or downloads the official snapshot and rebuilds state bundles. `npm run test:brazil-municipalities` checks all jurisdictions, interior labels, parentage, geometry budgets, overview simplification, same-state reuse, cancellation, failure recovery and developer gating. Provenance is published in `dist/data/south-america/brazil-local/sources.json`.

Brazil also has separate **States / DDD / CEP** views. DDD contains all 67 telephone regions, assembled from Anatel's current assignments for 5,571 municipalities and IBGE's 2025 municipal polygons. Only `VIGENTE=Sim` records are used; historical assignments cannot override current codes. This includes Boa Esperança do Norte and the Federal District/Goiás coverage of DDD 61. Two operational lake areas in the IBGE file are excluded because they are not municipalities. Display geometry is generalized to 75 m on shared topology, rather than traced from the reference image. Search in this view accepts codes, `+55` prefixes and municipality names, and returns only DDD regions. Administrative search keeps its own index.

DDD loads on demand in a temporary worker, with about 2.95 MB compressed and 9.14 MB decoded. Only the active detailed view remains in MapLibre; metadata is omitted from tile properties, and municipality lists populate only when expanded. A view change retains the previous map until replacement sources are ready, cancels obsolete requests, and preserves the previous view if loading fails. Saved and shared views retain the Brazil layer and selected region. Run `npm run build:brazil-ddd` to refresh the official snapshots and rebuild, or `node --max-old-space-size=12000 scripts/build-brazil-ddd.mjs` to rebuild retained downloads. Raw downloads stay in `artifacts/brazil-codes`; published URLs, SHA-256 hashes and processing details are in `dist/data/south-america/brazil-ddd-sources.json`. `npm run test:brazil-ddd` checks complete coverage, geometry, current-code exceptions, search, loading budgets, cancellation, failure recovery and restoration.

The **CEP** view is deliberately pending, as requested. It draws no postal polygons and does not substitute state or municipal borders. The supplied reference is credited to GfK; Precisely's catalogue lists 98 two-digit Brazilian postal polygons. Exact CEP boundaries require a dataset licensed for display on this website. The pending view links to that catalogue and cannot return administrative or DDD results.

Each country's geometry loads only when visited, inflates in a temporary worker, and leaves MapLibre when the country changes. Only small name catalogues and the flight silhouettes remain cached. Shared topology supplies a single boundary mesh and interior label positions. Country silhouettes use the same dissolved subdivisions to avoid duplicate coastlines. The datasets are about 1.68 MB and 0.54 MB compressed (5.06 MB and 1.96 MB decoded). Rebuild with `npm run build:south-america`; downloaded originals remain in the ignored `artifacts/south-america-source/` directory. Provenance, download URLs, input hashes and processing limits are published with the country sources. `npm run test:south-america` checks coverage, capital separation, shared boundaries, labels, search, file budgets, developer gating, loading cancellation and geometry release.

### Argentine provincial statistics (developer preview)

All 23 provinces and Buenos Aires City have official INDEC 2026 midyear population projections, IGN 2022 reported area in km², and CEPAL 2024 real gross value added at constant 2004 prices. Current-price PBG and per-capita PBG are verified for eight jurisdictions: Buenos Aires City, Buenos Aires Province, Corrientes, Entre Ríos, Jujuy, Santa Fe, Tierra del Fuego and Tucumán. Santa Fe uses preliminary 2025 accounts; the other seven use provisional or preliminary 2024 accounts. Missing nominal accounts remain unavailable. Constant-price output is labeled separately and is never converted at a current exchange rate. Nominal USD uses the matching-year World Bank official annual average rate.

Population appears above separate Area and Economy sections. Statistics are a separate bundle fetched only after selecting a first-level Argentine jurisdiction, cached for the session, and canceled on subdivision selection or country exit. Departments, partidos and comunas do not inherit parent totals. Tierra del Fuego area excludes Antarctic and disputed South Atlantic claims outside the mapped view. Argentina remains behind Changning developer mode.

Run `npm run build:argentina-statistics` for an offline rebuild from the reviewed compact tables. Run `npm run test:argentina-statistics` for source identity, units, nominal/real distinctions, exchange rates, matching-year population, demand loading and cancellation checks. Source snapshots, extraction scripts and hashes are retained in `scripts/statistics-sources/argentina/`; the PDF originals are fetched on demand and excluded from the browser build and Git.

Argentina shows each province's flag beneath the national flag, including a separate flag for Buenos Aires City. Departments, partidos and comunas retain their parent's flag. All 24 lossless WebP display images together total about 225 KB. After entering Argentina, three background requests at a time preload and decode the flags so later selections display immediately. The queue pauses outside Argentina, and revisiting reuses decoded images. Other countries do not initiate these downloads. Original Commons SVGs are preserved in `scripts/argentina-sources/flags/`, outside the browser build. `dist/data/argentina-flag-sources.json` records the artwork, credits, licenses and original/display hashes; each displayed flag links to its Commons source. Rebuild with `node scripts/fetch-argentina-flags.mjs`.

### Malaysia and Singapore maps

Malaysia and Singapore have separate routes, saved views, sidebars and country controllers. Both are public and open directly through their routes and shared view links. Brazil and Uruguay retain the existing Changning developer-mode activation.

Malaysia uses DOSM’s published state/district GeoJSON: 13 states, three federal territories and 156 district jurisdictions. Perlis and the federal territories have no duplicate district layer. State silhouettes derive from the same district topology, so boundaries align. District geometry loads in a temporary worker for one selected state, waits for indexing before automatic movement, and is removed when its scope or country changes. Other states retain their borders. The source snapshot may omit subsequent administrative changes; coverage and provenance are linked from the sidebar.

Singapore retains SLA’s June 2025 coastal context and adds URA Master Plan 2025 boundaries for five regions and 55 planning areas. A selected region loads its planning areas separately. English, Chinese, Malay and Tamil names are available for labels, selection, search and shared views. Names are attributed to the multilingual planning-area table linked in the source credits (CC BY-SA 4.0). Only shared internal edges receive adaptive border lines; coastlines have no outlines. Original planning-area geometry is retained without source simplification.

Singapore statistics show SingStat’s June 2026 resident population (citizens and permanent residents, excluding non-residents) and URA’s official planning extents in km². Population and boundaries both use Master Plan 2025. Published overall planning-area totals and independently published regional totals avoid summing rounded age/subzone counts. A dash remains “Nil or negligible.” All 55 overall planning-area counts were reviewed against both the dwelling-type and single-year-of-age workbooks from a freshly downloaded official ZIP. Pioneer (50) and Boon Lay (30) are industrial planning areas; the residential neighbourhoods around those names are within Jurong West (250,890), including Boon Lay Place (29,360). The selection cards label these as industrial planning areas, explain the resident-only coverage beside the count, and offer direct navigation to residential Jurong West. The review is published in `dist/data/southeast-asia/singapore-population-review.json`. Planning extents can include inland water, so they differ from physical land area. No Singapore economic statistics are added. `npm run build:singapore-regions` reproduces geometry and statistics from the checked-in sources; `npm run test:singapore-regions` checks all areas, languages, geometry, internal borders and data years. To refresh sources, run `node scripts/fetch-singapore-regions.mjs`, `node scripts/fetch-singapore-names.mjs`, and `python scripts/extract-singapore-population.py` followed by `python scripts/review-singapore-population.py` (openpyxl required).

All 16 Malaysian state/territory flags are cached locally as lossless WebP, with the national flag above the selected division’s flag. Districts retain their state flag. Artwork sources, licenses, credits and image hashes are in `dist/data/malaysia-flag-sources.json`. The new maps reuse the carriage-wheel loading placeholder, zoom lock, satellite imagery and shared label controls. Run `npm run build:southeast-asia` to fetch and rebuild; raw GeoJSON is ignored. Run `npm run test:southeast-asia` for coverage, hierarchy, geometry, flags and download budgets.

South American international borders are drawn from a separate shared-edge mesh for Brazil–Argentina and Brazil–Uruguay. Argentina–Uruguay retains IGN's official Uruguay River boundary. None of these layers trace country coastlines, and selected administrative divisions still use inland-only borders. `scripts/prepare-international-borders.mjs` refreshes the international mesh without rebuilding or changing the country polygons.

Malaysia's 13 states and three federal territories display official DOSM population estimates (2026), reported land area (2024, Statistics Yearbook table 1.1), and real GDP (2025, constant 2015 MYR). Real GDP per capita is calculated with DOSM’s population from the same 2025 year, and its constant-price basis and denominator are disclosed. Both real GDP and real GDP per capita show approximate USD values in constant 2015 dollars, using the World Bank / IMF 2015 average exchange rate (1 USD = 3.90550026302768 MYR). The July 2026 release provides a separate Putrajaya series. District selections clear these totals. Compact, hashed source snapshots are retained in `scripts/statistics-sources/malaysia`; `npm run build:malaysia-statistics` reproduces the public statistics file and `npm run test:malaysia-statistics` verifies coverage, units, sources and selection cancellation.

All map credits remain linked behind the bottom-right circled i. Hover or keyboard focus reveals them; click/tap toggles them, and Escape or an outside click closes them. `npm run test:map-sources` verifies these interactions. The bottom-right selection prompt is hidden.

## Southern Africa

South Africa, Botswana, Namibia, Eswatini and Lesotho are public. `developerCountries` in `dist/developer-mode.js` is empty; a country listed there loads only in the Changning developer mode.

| Country | Levels | Boundary source | Licence |
|---|---|---|---|
| South Africa | 9 provinces · 44 districts and 8 metropolitan municipalities · 205 local municipalities | geoBoundaries (OCHA ROSEA, Municipal Demarcation Board, 2020) | CC BY 3.0 IGO |
| Botswana | 10 districts · 28 census subdistricts · 519 localities | OCHA Common Operational Dataset (UNFPA), 2011 census geography also used in 2022 | CC BY-IGO |
| Namibia | 14 regions · 121 constituencies | Namibia Statistics Agency via the Atlas of Namibia (2022) | CC BY 4.0 |
| Eswatini | 4 regions · 55 tinkhundla | Central Statistics Office via OCHA Common Operational Dataset (COD-AB v01, 2020, reviewed 2025) | CC BY-IGO |
| Lesotho | 10 districts · 78 community, urban and municipal council areas | FAO and Ministry of Local Government via OCHA Common Operational Dataset (2019) | CC BY-IGO |

Lowest-level polygons form one shared topology; parent outlines are dissolved from their children, and South Africa keeps its Lesotho enclave. Each country's `sources.json` records downloads, hashes, processing and seam reports, and `statistics.json` its figures and sources. Metros are terminal jurisdictions, not repeated at the third level. Botswana's urban census districts are shown within their surrounding district.

Eswatini shows the tinkhundla in place before the 2018 delimitation, which raised the count from 55 to 59. No openly licensed boundaries for the 59 exist: OCHA, geoBoundaries and OpenStreetMap all carry the earlier 55, and the only 59-unit layer found (COSPE/Khetsimphilo, ArcGIS) states no reuse licence. Lesotho's Maseru Municipal Council and Butha-Buthe Urban Council extend into Berea and Leribe; OCHA splits each at the district line, so each part is selectable within its district. The build reads the OCHA archives (`swz-cod-ab.geojson.zip`, `lso-cod-ab.shp.zip`) directly; their SHA-256 hashes are pinned in each country's `sources.json`.

Statistics: South Africa has population at all three levels (Statistics South Africa mid-year estimates and Census 2022) and GDP for provinces only. Botswana has 2022 census population for districts and subdistricts; its localities have area only. Namibia has 2023 census population for regions and constituencies. Where a country publishes no area, a boundary-derived estimate is labeled as such. Missing figures stay empty rather than estimated.

On phones, countries with three levels show the current level as one toggle; tapping it lists every level.

Rebuild with `npm run build:southern-africa` and `npm run build:botswana-namibia`; check with `npm run test:southern-africa`, `npm run test:botswana-namibia` and `npm run test:south-africa-settlements`.

## Europe (developer mode)

The United Kingdom, Spain, France and Italy are listed in `developerCountries`. `dist/europe.mjs` adds them through the shared regional-country page only once developer mode allows one, so public visitors download none of their geometry (only the 2 KB module). 
### Italy

20 regions, 110 provinces and equivalent units, and 7,896 comuni, from ISTAT's full-detail boundaries for statistical purposes at 1 January 2026 (CC BY 4.0). The comuni are simplified together so neighbours share edges, and regions and provinces are dissolved from them. Like China, Italy needs no separate settlement layer: every town is a comune. Regions and provinces arrive in one bundle when Italy opens (`bundledLevels: 2`); a province's comuni load when it is selected.

| Level | Units | Kinds |
|---|---|---|
| Regions | 20 | Region, autonomous region (special statute) |
| Provinces | 110 | Province, metropolitan city, autonomous province, free municipal consortium (Sicily), statistical unit (Friuli-Venezia Giulia's former provinces) |
| Comuni | 7,896 | Comune; bilingual names kept as aliases |

Statistics (`npm run build:europe` runs `scripts/prepare-europe-statistics.mjs`; extracts are retained in `scripts/statistics-sources/europe`):

- Population: ISTAT resident population by comune at 1 January 2026 (estimate); provinces and regions are sums. ISTAT's population file still uses Sardinia's pre-reform comune codes, so the 377 Sardinian comuni are matched by name (unique within Sardinia).
- Area: ISTAT's official surface, which is the area of these boundaries (AREA_KMQ / Shape_Area).
- GDP and GDP per capita: Eurostat regional accounts at current prices — regions from NUTS 2 (2024; Trentino-South Tyrol sums its two autonomous provinces), provinces from NUTS 3 (2023). Sardinia's eight units of 2025 do not match Eurostat's five former provinces, so they have no provincial GDP. USD uses Eurostat's annual average euro rate.

### Spain

17 autonomous communities, the autonomous cities of Ceuta and Melilla, and the minor sovereign territories under central administration; 52 provinces; and 8,219 municipal units, from the Instituto Geográfico Nacional jurisdictional boundaries (BDLJE, INSPIRE GML, August 2026, CC BY 4.0). The 8,132 municipalities match INE's register exactly. The 81 condominiums — land owned jointly by several municipalities — are kept as their own units. The BDLJE lists Gibraltar among the territories outside any province, reflecting Spain's claim; it is a British overseas territory and is excluded. Isla del Perejil is labelled as claimed by Spain and Morocco, and Pheasant Island as a condominium with France. Like Italy, Spain has no settlement layer: every town is a municipality. The CNIG server cuts long transfers, so `fetch-europe.mjs` falls back to ranged requests.

- Population: INE official municipal register at 1 January 2025 (table 29005); provinces and communities are sums. Condominiums and the islets have no registered population and stay empty.
- Area: boundary-derived (spherical area of the displayed polygons), labelled as such.
- GDP and GDP per capita: Eurostat — communities from NUTS 2 (2024), provinces from NUTS 3 (2023). The Balearic province sums its three island units and each Canary province sums its islands; per capita divides by their combined average population.

### France

The 13 regions of metropolitan France (Corsica is a territorial collectivity), 96 départements and 34,746 communes, from IGN ADMIN EXPRESS commune outlines published by geo.api.gouv.fr (Etalab Open Licence 2.0); regions and départements are dissolved from the communes. Overseas regions are not yet included. Like Italy and Spain, France needs no settlement layer.

- Population: INSEE legal populations in force on 1 January 2026 (statistical reference date 1 January 2023), municipal population. INSEE lists Paris, Lyon and Marseille by municipal arrondissement, so each city is the sum of its arrondissements; every other commune matches INSEE's codes exactly. The six villages destroyed at Verdun in 1916 remain communes with no inhabitants.
- Area: IGN's official commune surface as published with the outlines (undated in the source); parents are sums.
- GDP and GDP per capita: Eurostat — regions from NUTS 1 (2024), départements from NUTS 3.

### United Kingdom

12 ITL1 nations and regions, 218 counties and unitary authorities, and the 164 districts of the English two-tier counties, from the ONS December 2024 local authority boundaries (generalised to 20 m, OGL v3); counties and regions are dissolved from the districts. Single-tier authorities — unitaries, metropolitan and London boroughs, and the Welsh, Scottish and Northern Irish councils — are terminal at the second level, as South Africa's metros are. Every level loads with the country (`loadAllSubdivisions`).

- Population and area: ONS mid-2024 estimates and areas (MYE5); every county equals the sum of its districts.
- GDP and GDP per capita: ONS regional GDP, current market prices, 2024 (provisional) — regions from the ITL1 tables, counties and authorities summed from the local-authority tables, per capita from the matching ONS population. ONS's September 2026 release suppresses local-authority GDP in eight ITL2 subregions (West of England; North Somerset, Somerset and Dorset; Gloucestershire and Wiltshire; North, Mid and South West, and South East Wales; Highlands and Islands; West Central Scotland) pending a corrected release, so those 51 authorities and Gloucestershire have none. USD uses Eurostat's euro reference rates (dollar–pound cross rate).

Cities and towns, like South Africa, are points independent of councils (`scripts/prepare-uk-settlements.mjs`): every built-up area or settlement with at least 1,000 residents — 4,258 places. England and Wales use ONS 2022 built-up areas with Census 2021 usual residents (London's built-up areas, omitted from ONS's towns tables, are summed from Census output areas as ONS does); Scotland uses NRS Census 2022 settlements; Northern Ireland uses NISRA 2015 settlements with Census 2021 counts (CT0100), located by GeoNames and, for villages absent there, OpenStreetMap. Welsh names are a label language.

### Overseas territories

**France** adds its five overseas regions (Guadeloupe, Martinique, French Guiana, Réunion, Mayotte), each with its département and communes.

- **Collectivities.** The six overseas collectivities are Saint Pierre and Miquelon, Saint Barthélemy, Saint Martin, Wallis and Futuna, French Polynesia and New Caledonia. Their communes are their second level. Saint Barthélemy and Saint Martin are each a single former commune.
- **French Southern Lands.** Four island districts (Kerguelen, Crozet, Saint Paul and Amsterdam, the Scattered Islands). Adélie Land, an Antarctic claim, is not mapped.
- **Clipperton Island** is mapped too.
- **Sources.** Outlines come from IGN, through geo.api.gouv.fr. The French Southern Lands and Clipperton have no communes, so their land comes from OpenStreetMap.

**The United Kingdom** adds its fourteen overseas territories except the British Antarctic Territory, and the three Crown Dependencies.

- **Subdivided territories.**
  - Saint Helena, Ascension and Tristan da Cunha has its three parts as the second level.
  - Akrotiri and Dhekelia has its two Sovereign Base Areas.
  - The Bailiwick of Guernsey has Guernsey, Alderney and Sark.
- **Sources.** Land comes from OpenStreetMap coastline inside each territory's boundary relation. The Sovereign Base Areas take Cyprus's coastline. Gibraltar is the Spanish boundary data's own outline, simplified with Spain's municipalities, so it meets La Línea exactly; Spain draws the frontier fence.
- **Claims and pending transfers.**
  - The Falklands carry Argentina's claim: while Argentina's map is open, they are hidden from the UK's shape and Argentina's map draws them as IGN does, in Tierra del Fuego province. `scripts/prepare-argentina-malvinas.mjs` adds both islands; the earlier build kept only West Falkland. Selecting Tierra del Fuego frames its main island, not the Malvinas.
  - The British Indian Ocean Territory is mapped as British. The 2025 treaty transferring it to Mauritius is not yet in force.

**French Guiana's neighbours.** The world map's 1:110m silhouettes cannot meet a detailed outline. France's data therefore draws Suriname and northern Brazil beneath it: land from geoBoundaries, frontier exactly IGN's, and the strip between the two sources given to the nearer neighbour. South America's preview silhouettes now sit just above the world map, beneath every country's own layers.

**Camera and clicks.** Each country's own views frame its home territory only: the country view, a metropolitan region and a search for it. A territory's shape on the world map carries its id and bounds. Clicking one while another country is open switches country, selects the territory and fills the screen with it, without stopping at the home view.

**Statistics.**

- **French population.** INSEE's legal populations; Mayotte's exhaustive count of November 2025 to January 2026 (its authenticating decree is due); the censuses of French Polynesia (2022), New Caledonia (2025) and Wallis and Futuna (2023).
- **British population.** Each territory's latest official count or estimate from its own statistics office, with its year shown. Anguilla's and the British Virgin Islands' latest published censuses are 2011 and 2010.
- **GDP.** The overseas regions have Eurostat GDP; the collectivities and British territories show none.
- **Area.** IGN's commune surfaces for French communes; boundary-derived area elsewhere.
- **No permanent population.** The British Indian Ocean Territory, South Georgia, Ascension, the French Southern Lands and Clipperton.
- **Counted elsewhere.** The Sovereign Base Areas' Cypriot residents are counted in Cyprus's census.

### Flags

The panel stacks flags downward, as for Russia: the national flag, then the region or community, then the department or province, at most two levels below the national flag. A commune or municipality shows its department's or province's flag, captioned with whose flag it is. Municipal and commune flags are not included.

`scripts/fetch-europe-subdivision-flags.mjs` takes each flag from Wikimedia Commons. It checks each download against the Commons checksum and records the license and author. Its choices follow two retained Wikipedia lists:

- **France** ("Flags of the regions of France"):
  - Regions show the traditional flag where one is in use. Grand Est, Hauts-de-France and Pays de la Loire show the regional council's logo flag.
  - Departments show the departmental council's flag, which is usually a logo flag.
  - 25 departments whose council has no flag show none. Proposed banners of arms are not shown.
- **Spain** ("Anexo:Banderas de España"):
  - Communities and Ceuta and Melilla show their statutory flags.
  - Provinces show their official flag. The six without one (Alicante, Castellón, Girona, A Coruña, Lleida, Valencia) show none.
  - A single-province community's flag appears once.

- **Italy** ("List of Italian flags" and "Armoriale delle province italiane"):
  - Regions show their flag adopted by regional law.
  - Provinces show a flag only where the armorial records its description in the grant, not where it only shows an image: 31 of 107.
  - Milan's pictured flag is the de facto one, so it is left out.
  - Udine's province is now a statistical unit, so it shows none.
  - Bergamo's and Terni's images are not on Commons, so they show none.
- **United Kingdom:**
  - Scotland and Wales show their national flags, and the English regions show England's.
  - Northern Ireland has had no official flag since 1973 and shows none.
  - Councils show none: the familiar county flags are community flags registered with the Flag Institute, not adopted by the councils.

- **Overseas France:** each territory's official or co-official flag, otherwise the flag its local government uses. Réunion and Saint-Martin have neither.
- **British overseas territories and Crown Dependencies:** their official flags. Saint Helena, Ascension and Tristan da Cunha each have their own. The Sovereign Base Areas fly only the Union Flag.

Unofficial flags are never shown.

Small originals ship as SVG. Heraldic SVGs over 120 KB ship as rasters; the largest is 8.5 MB. The originals are cached in `scripts/additional-sources/europe-flags/`, which is not committed. The flags load only with developer mode. Each flag's status, source and license are in `dist/data/europe/subdivision-flag-sources.json`.

### Outlines and frontiers

| Country | Coverage | Outline source | Licence |
|---|---|---|---|
| United Kingdom | Great Britain, Northern Ireland and their islands | ONS Local Authority Districts (December 2024) BGC, dissolved | Open Government Licence v3.0 |
| Spain | Peninsula, Balearic and Canary Islands, Ceuta, Melilla and the minor sovereign territories | Instituto Geográfico Nacional jurisdictional boundaries (BDLJE), dissolved from the municipalities | CC BY 4.0 |
| France | Metropolitan France and Corsica (overseas regions not yet included) | IGN ADMIN EXPRESS commune outlines via geo.api.gouv.fr, dissolved | Etalab Open Licence 2.0 |
| Italy | Mainland and islands; San Marino and Vatican City remain enclaves | ISTAT boundaries for statistical purposes, 1 January 2026 (dissolved from the comuni) | CC BY 4.0 |

Spain's and Italy's frontier edges are moved onto the French outline, so each pair shares one edge, and Spain's Llívia takes the exact shape of its enclave in France. Land frontiers are drawn and coastlines are not. An outline edge is a frontier when a point 100–600 m beyond it lies inside a neighbouring country and a Natural Earth land boundary line is within 4 km. Neighbouring outlines (geoBoundaries) and OpenStreetMap land border ways are used only for this classification; the OpenStreetMap ways decide where the frontiers with Monaco, Ceuta, Melilla and Slovenia meet the sea, because those neighbours' outlines include territorial waters. France holds its frontiers with Spain and Italy, so every edge is drawn once.

Non-atlas neighbours (Portugal, Switzerland, Germany, Ireland and others) are still the Natural Earth 1:110m background silhouettes, which do not meet the detailed frontiers.

Rebuild with `npm run build:europe`; check with `npm run test:europe` (hierarchies, chunks, statistics for every unit, frontier lengths and continuity, enclaves, coastal ends, no coastline strokes, loading modes, developer gating).

## Countries

`dist/countries.js` declares every country once. Each entry has:

- names and language;
- background colour and emblem;
- release (`release:'developer'` keeps a country in developer mode);
- map adapter, statistics and catalogue paths, and level names;
- the faded fill shown while another country is open, and its layers-panel prefix;
- the options a shared link may carry (scopes, label languages, deepest level);
- for countries drawn by the shared adapters, their map settings: levels, centre, bounds and colours.

It runs as the page's first script, because the entry screen needs it before any module loads. Modules and Node scripts import the same file. The rest of the page reads it instead of naming countries:

- the entry route, title, theme, emblem and developer gate;
- link validation;
- statistics bundles and region colours;
- adapter set-up, country clicks and portal fills in `app.js`;
- the world-land silhouettes.

Adding a country declares it there, plus its colour theme in CSS and its data. `node scripts/validate-countries.mjs` checks that every declared file, emblem, theme and route resolves. It fails if any other page script lists three or more countries.

Country-specific features stay in their own adapters: China's packed boundaries, Brazil's DDD and CEP layers, Singapore's four label languages, and the bespoke Korea, Mongolia, Japan and archipelago pages.

## Browser tests

`npm run test:browser` (`scripts/browser/`) drives the real site in headless Chrome over the DevTools protocol, with no extra dependencies: it serves `dist/` on a free port and uses real mouse, touch and keyboard input. Every scenario fails on an assertion, a page exception, a console error or a failed request, and saves a screenshot to `artifacts/browser-tests/` when it does. Scenarios cover the phone bottom sheet (dragging, flicking, the handle by tap, Enter and Space, search with the on-screen keyboard, panning), the level toggle on phone and desktop, every public country opening, searching and selecting a place, switching countries by clicking a neighbour and by link, and developer mode (no unreleased data for public visitors, the Changning unlock, the deepest level of each European country, shared links that reopen a third-level place with its label language, and leaving developer mode on an unreleased country). The GitHub Pages workflow runs them before every deployment; set `CHROME_PATH` if Chrome is not found.
