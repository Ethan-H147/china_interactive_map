# Boundary Atlas

Boundary Atlas is the project's working name; the public site name is not yet decided.

Interactive static map using DataV GeoAtlas, official Taiwan, Hong Kong and Macau boundaries, and AreaCity/Amap outlines for Xinxing and Baiyang. MapLibre GL JS 6.11.2 and the boundary snapshot are bundled. Optional satellite imagery loads from EOX.

## Exploring and rendering

Detailed country data uses one shared three-country memory budget. The active country and up to two recent countries stay cached; older country datasets unload and return on demand. See [country memory](docs/country-memory.md) for cleanup and checks.

Map settings is the default panel. Selecting a region opens its details; Featured regions is temporarily hidden. Cultural cards are assigned to their province and specific subdivision codes. Subdivision lists appear only for a region whose children are included in the dataset.

Districts and directly administered county-level divisions are visible and selectable by default. In subdivision mode, they take priority over the underlying province. Disconnected parts share a region identity and selection state. Xinjiang's direct cities are identified as county-level cities. `node scripts/validate-selection.mjs` checks every part of its 12 mapped direct cities, layer visibility, and selection priority.

`dist/data/xinjiang-administration.json` records 12 mapped XPCC city/division pairs, county-level status, Aral's rank terminology, and Ili's administration of Tacheng and Altay. Xinxing and Baiyang use published AreaCity/Amap polygons; their areas are removed from the older surrounding prefectures. Caohu has a searchable administrative entry with its official establishment announcement and an explicit missing-boundary notice. Selecting Caohu does not highlight or navigate to an invented outline. The Ili polygon represents its directly administered area; Tacheng and Altay remain separate polygons. XPCC city boundaries do not cover every farm under the corresponding division.

All 536 mapped regions have English and Chinese names. Taiwan uses the official NLSC English and traditional Chinese names, with actual categories: 6 special municipalities, 3 cities, and 13 counties. Hong Kong and Macau use traditional Chinese names on the map and in the sidebar; search also accepts simplified names. Official Taiwan codes use a `TW-` namespace internally to avoid collisions with mainland identifiers. The sidebar shows a bilingual parent link and the PRC, ROC, Hong Kong or Macau flag above the category label. Search accepts English, Chinese, codes, and sourced regional names.

`dist/data/region-names.json` records sourced Tibetan, Uyghur, Kazakh, Kyrgyz, and traditional Mongolian spellings for relevant regions. It includes each name’s language, direction, source, and license. Regional names are attached to individual administrative codes, so they are not inherited from a parent. Traditional Mongolian uses vertical columns from left to right; Arabic scripts use right-to-left text. The Noto regional fonts and their SIL Open Font Licenses are bundled locally.

To refresh names, run `node scripts/fetch-region-names.mjs` and `node scripts/fetch-regional-scripts.mjs`, review their snapshots and the explicit overrides in `scripts/name-sources`, then run `node scripts/build-region-names.mjs` and `node scripts/validate-names.mjs`. Wikidata records are matched by administrative code; supplemental regional script spellings come from the linked Wikipedia articles. The source snapshots are retained for review. Only sourced spellings are displayed; this is not complete language coverage for every autonomous division.

MapLibre draws boundaries with WebGL. Geometry tiling and triangulation run in two workers, and panning moves GPU buffers instead of repainting full-country SVG paths. China, Korea, Mongolia and Japan use zero source simplification tolerance and a maximum source zoom of 18. The newer archipelago sources use a 0.25-pixel tiling tolerance and maximum source zoom of 16. The map supports zoom 16, with closer automatic views for Hong Kong and Macau. Rendering quality is device-local: Balanced caps the map canvas at 1.5× during movement, Performance at 1×, and Full resolution keeps the device ratio. Full resolution returns 180 ms after movement ends; text and controls keep their normal resolution. Edge smoothing can be compared after a reload. Settings → Rendering on this device exposes a gesture-only performance readout and a temporary label comparison.

The display dataset is stored as a lossless gzip stream split into files below 4 MiB each. `display-boundaries.parts.json` records the uncompressed checksum. These parts remain the build inputs. Visitors download `china-boundaries.pack.bin` instead: the display boundaries, city districts and fill fragments in the compact geometry container (`dist/geo-pack.mjs`), with every coordinate rounded to 1e-7 degrees (at most 5.6 mm; one screen pixel at the closest zoom is about 2 m), each coordinate pair stored once and every ring referring to its points by index (about 2.2 MB instead of 21.4 MB). It decodes to the same structure and values as the source JSON. The first view draws from `china-overview.pack.bin` (the same geometry rounded to 1e-4 degrees, at most 5.6 m and under a quarter of a device pixel at zoom 10 and below, about 1 MB); once that view is shown, every China source switches to the full pack, which is requested only then. MapLibre's workers unpack it and build China's sources directly (`maplibre-worker-protocols.mjs`), so the geometry never passes through the page; the page reads names, bounds and part counts from `china-regions.json`. Province outlines still omit the segments drawn by the international border layer. `npm run build:china-pack` regenerates these files after any change to the inputs, and `npm run test:china-pack` fails if any is stale, if a coordinate moves further than its rounding, or if any worker-built source differs from the main-thread build beyond that. No vertices are removed. Hover queries are suspended during movement; labels update after movement ends.

Every boundary layer draws each edge once. A translucent stroke drawn twice turns darker, and where two datasets trace the same edge with different vertices the doubling alternates segment by segment, so a border looks dashed. `hiddenSegments` in `adaptive-lines.mjs` therefore hides a segment when it lies within 2 m of an international line that has its own layer, or within 0.5 m of a segment already drawn in the same layer (checked in both drawing orders; segments shorter than 1 m are never hidden by the second rule). Matching is geometric, not by vertex, because the province, neighbor and Russian datasets place their vertices differently. China's hidden segments are computed when the pack is built and stored with it, so the browser only skips them. The Japan, Mongolia, Russia, southern Africa and settlement builders apply the same rule, `npm run build:single-strokes` applies it to already-built files, and `npm run test:single-strokes` fails if any shipped line set draws an edge of 2 m or more twice (shorter overlaps stay below one pixel at zoom 16). Argentine city lines store each shared edge once with both city IDs, so selection still outlines the whole city.

A selected place is outlined all the way round, in every country. Its coast and any river or estuary edge are included, so no section of its border is hidden. The outline is drawn from the place's own shapes, as a line copy split into paths of at most 4,096 points (`lineData`): stroked straight from the polygons, a ring as long as Krasnoyarsk Krai's (66,516 points) overflows the renderer's vertex limit and draws stray chords across the place at some zoom levels. Unselected borders remain the shared lines, each drawn once. The same rules hold in every country:

- **Country borders always show**, whichever country is open, on land and along border rivers. Dedicated layers draw Europe's, Russia's, southern Africa's, South America's shared borders and China's with Korea and Mongolia; `data/atlas-frontiers.bin` (`scripts/build-atlas-frontiers.mjs`) draws every other public country's land frontier from its detailed outline and Natural Earth 1:10m. A country whose own lines draw its frontier while open (`ownFrontier` in `countries.js`: China, Indonesia, Malaysia) hides its copy in the shared layer meanwhile.
- **Borders cross narrow water down the middle.** Where a river or estuary channel up to 1.5 km wide separates two places, `scripts/build-channel-borders.mjs` (`scripts/channel-lines.mjs`) draws the border along the channel's median, found by rays cast from each bank to the facing one. Wider water (bays, straits, open sea) stays open. Botswana's localities do not cover the country, so its third level has none.
- **Coasts have no line** except around the selected place. Japan's, the Philippines', Indonesia's and Malaysia's lines once stroked whole polygons; `scripts/build-unit-edges.mjs` now stores `edgeRuns` (vertex ranges of each collection's own polygons, see `dist/edge-runs.mjs`) covering only edges shared with a neighbour, near-matching edges where sources were simplified apart, and land frontiers. China's pack hides province-line segments with no province beyond them (`scripts/china-shore.mjs`). South America's lines were already the edges two units share; Uruguay's departments draw their river borders through the water (`uruguay-border-topology.mjs`).
- **Countries look detailed before they are opened.** South America's shapes and borders load right after the first view, so no atlas country is left as a coarse preview.

`npm run build:borders` rebuilds all of this, in order, after any country build (each country build script ends with it); `npm run test:borders` checks the edge runs, channel owners and file sizes, and the browser suite's `borders` scenarios check frontiers with another country open, South America at startup and the share of outline segments that follow a coast.

Startup downloads begin as early as possible: `atlas-entry.js` requests China's overview pack before styles and modules load, and `index.html` preloads the outline files China's first view needs, including the portals that draw its neighbours' land. The first view appears once China and those portals are drawn; southern Africa, Europe, the capitals and South America are set up afterwards (their files are preloaded then), and a country switch requested before then waits for them. Motion previews download after the first view is usable.

The outline files loaded at startup and right after it are published as compact copies under `dist/data/compact/` (`npm run build:compact`, run by `build:borders` and `build:world-land`): the gzip GeoJSON files stay the build inputs every script reads, while the page requests the copy (`compactUrl` in `geo-pack.mjs`), about half the size. MapLibre's workers decode them (`atlas-data.mjs`, through `addWorkerSource`), so the page never copies their geometry to the workers. `npm run test:compact` fails if a copy is stale or a coordinate moves more than 5.6 mm.

Worldwide country borders and background coasts are now visible in light gray, using one shared Natural Earth 1:10m topology reconciled to the atlas's existing display outlines. Background countries remain noninteractive. Ready country portals hide their temporary fallback shapes, and Vietnam's obsolete China-neighbor island geometry is removed. Source coverage, build policy and regression checks are documented in [world-country-outlines.md](docs/world-country-outlines.md).

`dist/sw.js` keeps each deploy's files on visitors' devices, so a repeat visit downloads nothing but the page. The Pages workflow stamps `version.json` with the commit; a new version empties the store. Without a version (local preview, other hosts) nothing is stored.

Automatic navigation locks map input and navigation controls until its movement completes, with a timeout recovery for background tabs that lands the camera on its destination. Reduced-motion preferences use an immediate move. Labels remain on the map during motion and their spacing is refreshed afterward. A single resize observer owns map sizing to avoid competing recenter operations.

Calligraphic headings use bundled Ma Shan Zheng and Marck Script subsets, with their open font licenses in `dist/vendor`.

## Mouse and trackpad controls

Settings → **Mouse & trackpad on this device** selects Automatic, Trackpad (scroll to pan), or Mouse (scroll to zoom). Automatic uses trackpad controls on Apple devices, including iPads that report a Mac platform, and mouse controls elsewhere. The choice stays on this device independently of account settings. Reset settings restores Automatic.

Trackpad controls pan in both axes with ordinary two-finger scrolling, honor the OS momentum stream, and keep pinch zoom. Click-drag and direct touchscreen gestures still work. Wheel deltas are accumulated once per display frame. A constant-easing camera update applies the full movement and groups end-of-gesture work instead of rebuilding labels on every input event. Safari scale events provide a trackpad-pinch fallback, with a single driver per pinch to avoid double zoom when wheel events accompany them. Touchscreen pinch stays with MapLibre. Map controls never intercept scrolling in the settings dialog.

Run `npm run test:trackpad-controls` for wheel normalization, device defaults, real browser wheel pan/pinch, mouse override/persistence, Safari event fallback and touchscreen pinch. Safari event fallback is simulated in Chrome; the physical iPad trackpad remains the device check.

## iPad local preview

Run `npm run preview:ipad` on the Windows PC, then open the printed **iPad (same network)** HTTP address in Safari on the iPad. Both devices must share a reachable home network; Ethernet on the PC is fine when it connects to the same router. Keep the terminal and PC awake. Refresh after edits, or tap the preview's **Reload** notice when local files change. There is no build or GitHub push for ordinary JS/CSS edits.

This command uses port 4175, alongside the loopback-only `npm start` preview on 4174. It listens on loopback and private IPv4 addresses on physical network adapters, excluding VPN/virtual adapters on Windows. If no home-network address exists, it starts locally and explains how to reconnect. For an explicit private address, use `npm run preview:ipad -- --host=192.168.1.20` (replace the address with the PC's current home IP). If Windows asks, allow the preview on the private home network. If Safari cannot connect, check the PC firewall for TCP 4175 and turn off guest/client isolation on the router. Do not use the Cisco VPN address or configure router port forwarding.

Only `dist/` and the preview helper routes are served. Responses bypass caches, and `version.json` has no deployment version. Local HTTP is sufficient for the map and workers; secure-context features such as service workers and some clipboard/login flows may differ from production. The live Site and this preview have separate browser storage and saved settings.

For a comparison on the iPad, open **Settings → Rendering on this device**, enable **Performance readout**, and pan the same globe view under Full resolution, Balanced, and Performance. Compare edge smoothing on/off after its requested reload; use **Test without labels** to remove the atlas label markers without changing account preferences. The report lists draw-event FPS, request-animation-frame p95 intervals during movement, canvas size, layers, sources and browser. These are browser measurements, not direct GPU timings. No sampling loop runs with the readout off or the page hidden. `npm run measure:tablet-performance` saves a Windows/Chrome comparison, which does not establish iPad Safari speed.

Changes under active iPad testing can remain local until the device test is complete; then follow the normal GitHub and Site publishing workflow.

## Philippines and Indonesia

The Philippines has 18 regions and 82 provinces; Indonesia has 38 provinces and 514 regencies and cities. Explicit `#philippines` / `#indonesia` routes open either map directly. Map silhouettes let visitors switch countries. The selection-level lock preserves the chosen level during selection and reset. Returning visits and shared views preserve the country, selection, camera and visible layers. Both use the carriage-wheel loading placeholder and support satellite imagery. No population or economic statistics are added for these countries. Isabela City is searchable as a component city and shown with a dashed regional-exception outline in province mode. Basilan provincial geometry includes the city, while regional geometry assigns it to Region IX and the rest of Basilan to BARMM. The relevant detail panels include a PSA-linked explanatory footnote; the city does not increase the 82-province count.

Philippine geometry comes from NAMRIA / PSA through OCHA's [COD-AB release](https://data.humdata.org/dataset/cod-ab-phl); Indonesian geometry comes from Statistics Indonesia (BPS) through [COD-AB](https://data.humdata.org/dataset/cod-ab-idn). Both are CC BY-IGO. Negros Island Region is reconstructed from its three provinces under RA 12000; Sulu belongs to Zamboanga Peninsula under EO 91/2025. NCR's statistical districts, Isabela City and Bangsamoro's Special Geographic Area contribute to regional shapes but are not presented as provinces. Independent cities embedded in the source provincial geometry are not separately mapped. Indonesia's four new Papua provinces are reconstructed from their constituent regencies under the 2022 laws. Source regency IDs remain stable identifiers, not claims about current official administrative codes. Eight source lake/reservoir/forest polygons are excluded from the administrative catalogue. Dates and limitations appear in each country's Sources & coverage link.

GeoNames (CC BY 4.0) supplies 2,754 Philippine and 6,382 Indonesian named island, island-group and atoll entries, including aliases. These are geographic search results, separate from administrative levels. Where a catalogue point matches a dissolved physical land component, selection fits that island's bounds. Otherwise selection shows its catalogue location and states that an extent is unavailable. Borneo and New Guinea focus on their Indonesian portions. The catalogue does not claim coverage of unnamed islands.

`scripts/fetch-archipelago.mjs` reads ZIP directories using HTTP byte ranges and downloads only the needed ADM2 entries rather than entire multi-level archives. Raw downloads and the intermediate geometry cache are ignored by Git and excluded from the deployed site. Rebuild with `npm run build:archipelago`. The published provenance reports record source URLs, checksums, file sizes and administrative corrections.

Shared topology is cleaned and simplified together to 20 metres before partitioning into 18 regional and 38 provincial detail files. Country overview geometry uses 250-metre first-level and 500-metre second-level detail; inactive country silhouettes use 800-metre detail. Searches load a small name catalogue, not detailed geometry. Normalized aliases are indexed once per country. Local detail is prepared in a temporary worker after movement ends, with at most two chunks on narrow screens or three on larger screens and a 12 MiB decoded-data budget. Obsolete chunks lose their MapLibre sources and blob URLs; leaving a country releases all of its installed geometry except the small context silhouette. Cancelled country requests cannot install stale detail. Inactive countries are no longer eagerly preloaded at startup. New country geometry stays within this bounded native renderer during movement.

The dense Mahakam Delta islands appear at zoom 9 and closer, in city-scale views around Samarinda, while wider province views stay clear. Their original geometry stays in the existing province/regency sources, with visibility handled by the renderer; crossing the zoom threshold needs no new download or source replacement. Mainland and administrative edges remain unchanged. The inactive gray silhouette also omits these islands.

`npm run test:archipelago` checks administrative counts and hierarchy, island search, geometry retention, coastal detail visibility, view links at southern latitudes, loading isolation, eviction, cold selections and stale worker disposal. `/archipelago-benchmark` is a local-only panning and switching measurement page; its script is excluded from production.

## Map quiz

The Quiz tab offers three modes: click the named place, type every name, and name a highlighted place. Division quizzes share the same controls and use country-specific titles, including Germany’s Bundesländer, Spain’s autonomous communities and cities, and Mexico’s states and Mexico City. China has a subdivision selector for its 34 province-level divisions or its existing prefecture quizzes. English and local names are accepted; unanswered targets have a gold fill without a name label.

Click and highlighted-place rounds default to all eligible places, with 5, 10, and 20 also available. Counts are capped by scope size and questions are shuffled without repeats. Each question records one answer; revealing an answer counts separately. “Keep answer colors” preserves correct and wrong answers across questions. With it off, answer colors clear after a brief flash. Users can pan, zoom, fit the scope, and review missed places. Ending a quiz restores the previous selection and styling without moving the camera. Type-everything rounds save progress in this browser; completed scores retain personal bests locally.

China’s prefecture scope can be all China, with or without Taiwan, or one province-level region that has eligible divisions. Taiwan uses its 22 city and county divisions. Municipal districts, SAR subdivisions, directly administered county-level divisions, and missing outlines are excluded from that prefecture pool.

Run `npm run test:quiz-modes` to check the new modes, division counts, scoring, hidden answers, color retention, mobile input, and exit behavior in a real browser. `dist/quiz-engine.mjs` handles question order and scoring; `dist/quiz-modes.mjs` checks specified-place answers through the same alias and name normalization used by type-everything rounds.

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

Run `npm start` and open http://127.0.0.1:4174/.

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

The gallery covers 20 landmarks across Beijing, Shanghai, Hangzhou, Nanjing, Suzhou, Guangzhou, Shenzhen, Xi’an, Chengdu and Chongqing. Every image retains its original pixel dimensions, with a minimum long edge of 2,560 pixels and short edge of 1,600 pixels. Sidebar cards lazily load 1,200-pixel-wide copies from `dist/photos/display`; the full-resolution viewer shows the photographer, license, Commons source and original image. `scripts/additional-sources/landmark-photos.json` preserves the selected Commons metadata. After `npm ci`, `npm run build:gallery` downloads these exact originals and encodes them without resizing, then writes the card copies. City and district codes control gallery visibility; other places do not inherit nearby landmarks.

`npm run build:districts` builds a separate overlay for Hangzhou (13 divisions), Nanjing (11), Suzhou (9), Guangzhou (11) and Shenzhen (9). AreaCity’s Amap/Tencent county geometry is converted from GCJ-02 to WGS84, reconciled at shared edges and clipped to the existing city polygons. DataV fills uncovered portions only where its district polygons provide coverage. The remaining perimeter differences cover less than 0.5% of each city’s extent and select the parent city. The pipeline does not invent assignments for these residual differences. County-level cities and counties keep their actual type; Shenzhen’s Dapeng functional area remains within the statutory district data. Parent city polygons and the prefecture quiz pool are unchanged.

`npm run test:explore` verifies article coverage, all 53 district names, geometry containment and overlaps, photo dimensions and credits, gallery scope, quiz exclusion and district → city → province navigation. District source hashes and coverage measurements are published in `city-district-sources.json`.


### Every county-level division

Developer mode draws all 2,727 county-level divisions of mainland China's prefecture-level areas (districts, counties, county-level cities, banners and their autonomous forms) in place of the five-city overlay, plus Suzhou Industrial Park. The municipalities' 86 districts are already their second level, and the 32 directly administered units are their own areas, so mainland China's 2,845 county-level divisions are all covered. Dongguan, Zhongshan, Jiayuguan and Danzhou have none. Kinmen, which the PRC lists under Quanzhou, stays Taiwan's Kinmen County.

`npm run build:china-counties` builds them from AreaCity release 2025.251231.260403 (`ok_geo.csv.7z`, SHA-256 recorded in `china-county-sources.json`; extract it to `artifacts/areacity/x/`).
- **Geometry.** Amap geometry is converted from GCJ-02 to WGS84 and simplified to about 60 m as one layer, then clipped to each prefecture's displayed outline, so counties nest exactly.
- **Filling and slivers.** Prefecture land AreaCity leaves uncovered goes to the county sharing most of its edge, or the nearest one for an island. Detached slivers under 2 km² that border, or lie within 20 m of, another county join it.
- **Refined cities.** Hangzhou, Nanjing, Suzhou, Guangzhou and Shenzhen keep their refined districts from the public overlay.
- **Names.** English names and Wikipedia links come from Wikidata's division codes (P442), retained in `scripts/additional-sources/china-counties/`.

The counties travel in a pack of their own (`china-counties.pack.bin`, about 4.3 MB, with `china-counties-regions.json` and `china-county-names.json`). They load for everyone after China's map is ready, so the first view never waits for them. Turning developer mode on swaps them in; turning it off reloads the page. The public pack is unchanged.

`npm run test:china-counties` checks the counts, names, and that counties tile each prefecture without overlap. Across prefectures, counties overlap only where the displayed prefecture outlines already do (about 8 km² nationally, at most 1 km² per pair).

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
Brazil, Uruguay and Argentina are public. Brazil includes IBGE's 2025 boundaries for 26 states and the Federal District; Argentina includes IGN boundaries for 23 provinces and Buenos Aires autonomous city. Argentine Antarctic and disputed South Atlantic claims are excluded from this continental view, with a note on Tierra del Fuego. Search supports accents, state abbreviations and CABA. Selection, camera and outline/name preferences use the existing saved-view system.

Lagoa dos Patos, Lagoa Mirim and Lagoa Mangueira show the ocean color: `npm run build:brazil-lagoons` cuts them out of the Brazilian state, DDD and Rio Grande do Sul municipal fills and Brazil's country silhouette, then redraws the shared borders, so municipal lines end at the shore. Patos and Mirim are IBGE's own operational lake areas from the municipal grid (retained in `scripts/additional-sources/water/brazil-ibge-lagoons.geojson`), so their shores share the municipalities' vertices; Mangueira is OpenStreetMap relation 7438177 (ODbL, snapshot `lagoa-mangueira-osm.json`). Run it again after rebuilding Brazilian geometry; `npm run test:brazil-lagoons` fails if any land fill covers a lagoon. South American country silhouettes, division views and selected regions have no coastline outlines. Shared inland division borders remain visible, and the official Uruguay River international boundary remains separate from the land on its shores. Municipal selection lines omit the parent exterior. `node scripts/prepare-south-america-borders.mjs` updates retained bundles without changing land polygons or record metadata; `test:south-america` verifies that exterior strokes are absent and internal borders remain complete. Country silhouettes remain clickable; there are no bottom-left continent flight buttons.

Brazil's administrative view also contains all **5,569 municipalities**, plus Brasília (Federal District) and Fernando de Noronha (state district), from IBGE's official 2025 municipal mesh. Select a state to reveal its internal boundaries and a filterable list, or search nationally by municipality name or IBGE code. The 290 KB compressed name index contains no geometry. Each of 27 state files loads separately in a temporary worker; at most one state's municipal geometry is retained, with a maximum of 2.51 MB compressed. Switching states, returning to States mode, changing to DDD/CEP, leaving Brazil or exiting developer mode releases detail and cancels obsolete work. MapLibre simplifies subpixel line detail at each zoom, and small paths fade continuously. Shared edges draw once; coastlines have no outlines. No municipal statistics are added. Brasília and Fernando de Noronha are labeled as their actual jurisdiction types; two operational lake areas are excluded. Saved views restore municipality selection and its parent state. `npm run build:brazil-municipalities` reuses or downloads the official snapshot and rebuilds state bundles. `npm run test:brazil-municipalities` checks all jurisdictions, interior labels, parentage, geometry budgets, overview simplification, same-state reuse, cancellation, failure recovery and developer gating. Provenance is published in `dist/data/south-america/brazil-local/sources.json`.

Brazil also has separate **States / DDD / CEP** views. DDD contains all 67 telephone regions, assembled from Anatel's current assignments for 5,571 municipalities and IBGE's 2025 municipal polygons. Only `VIGENTE=Sim` records are used; historical assignments cannot override current codes. This includes Boa Esperança do Norte and the Federal District/Goiás coverage of DDD 61. Two operational lake areas in the IBGE file are excluded because they are not municipalities. Display geometry is generalized to 75 m on shared topology, rather than traced from the reference image. Search in this view accepts codes, `+55` prefixes and municipality names, and returns only DDD regions. Administrative search keeps its own index.

DDD loads on demand in a temporary worker, with about 2.95 MB compressed and 9.14 MB decoded. Only the active detailed view remains in MapLibre; metadata is omitted from tile properties, and municipality lists populate only when expanded. A view change retains the previous map until replacement sources are ready, cancels obsolete requests, and preserves the previous view if loading fails. Saved and shared views retain the Brazil layer and selected region. Run `npm run build:brazil-ddd` to refresh the official snapshots and rebuild, or `node --max-old-space-size=12000 scripts/build-brazil-ddd.mjs` to rebuild retained downloads. Raw downloads stay in `artifacts/brazil-codes`; published URLs, SHA-256 hashes and processing details are in `dist/data/south-america/brazil-ddd-sources.json`. `npm run test:brazil-ddd` checks complete coverage, geometry, current-code exceptions, search, loading budgets, cancellation, failure recovery and restoration.

The **CEP** view is deliberately pending, as requested. It draws no postal polygons and does not substitute state or municipal borders. The supplied reference is credited to GfK; Precisely's catalogue lists 98 two-digit Brazilian postal polygons. Exact CEP boundaries require a dataset licensed for display on this website. The pending view links to that catalogue and cannot return administrative or DDD results.

Each country's geometry loads only when visited, inflates in a temporary worker, and leaves MapLibre when the country changes. Only small name catalogues and the flight silhouettes remain cached; the silhouettes and shared borders load right after the first view, whichever country is open. Shared topology supplies a single boundary mesh and interior label positions. Country silhouettes use the same dissolved subdivisions to avoid duplicate coastlines. The datasets are about 1.68 MB and 0.54 MB compressed (5.06 MB and 1.96 MB decoded). Rebuild with `npm run build:south-america`; downloaded originals remain in the ignored `artifacts/south-america-source/` directory. Provenance, download URLs, input hashes and processing limits are published with the country sources. `npm run test:south-america` checks coverage, capital separation, shared boundaries, labels, search, file budgets, developer gating, loading cancellation and geometry release.

### Argentine provincial statistics

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

## Europe

The United Kingdom, Spain, France, Italy, Chile, Paraguay, Peru, Iceland, Turkey and India are public (India and the South American countries share the European pipeline, though they are not European). `dist/europe.mjs` adds them through the shared regional-country page. Their previews are large (the UK's carries 20 m coasts and its overseas territories), so unless a European country is the first view they load right after it, and the world map keeps its coarse silhouettes of them until their own previews are drawn.

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

Cities and towns, like South Africa, are points independent of councils (`scripts/prepare-uk-settlements.mjs`): built-up areas and settlements with at least 1,000 residents, with one combined marker for Greater London. England and Wales use ONS 2022 built-up areas with Census 2021 usual residents (outside Greater London); Scotland uses NRS Census 2022 settlements; Northern Ireland uses NISRA 2015 settlements with Census 2021 counts (CT0100), located by GeoNames and, for villages absent there, OpenStreetMap. Welsh names are a label language. Greater London’s 33 borough-level settlement markers are replaced by one London marker. Its page compares Greater London with the City of London using their separate mid-2024 population and area figures; boroughs remain administrative selections. Rebuild the display after UK statistics updates with `npm run build:london`, and verify it with `npm run test:london`.

### Iceland

The eight regions (landshlutar) and 61 municipalities (sveitarfélög), from the IS 50V municipal boundaries of the Icelandic Institute of Natural History (formerly the National Land Survey, LMÍ; CC BY 4.0), land only. Regions group the municipalities by the first digit of their municipal number, as Statistics Iceland does (the capital region takes 0 and 1), and use ISO 3166-2:IS codes. Iceland has no land frontier.

- Population: Statistics Iceland, 1 January 2026, by municipality (MAN02005); regions are sums. Areas are boundary-derived. No GDP is shown: Statistics Iceland's regional accounts use other groupings and lag several years.
- Towns and villages are points independent of the municipalities (`scripts/prepare-europe-settlements.mjs`): each locality Statistics Iceland counts (MAN030102, 1 January 2026) at the centre of its urban nucleus in the IS 50V place-name areas. Greater Reykjavík (Reykjavík, Kópavogur, Hafnarfjörður, Garðabær, Seltjarnarnes) is one locality; eight small localities without a mapped outline are left out.

### Turkey

The 12 statistical regions (İBBS level 1), 81 provinces and 973 districts, from the General Command of Mapping (HGM) boundaries as OCHA publishes them (cod-ab-tur, January 2026 edition, CC BY-IGO). Provinces use ISO 3166-2:TR plate codes and Turkish names (as English writes them too), except Istanbul; regions group the provinces as TÜİK does. HGM drops the dotless ı and decomposes İ, so names take the spelling of OpenStreetMap's Turkish name that matches them up to dots and accents (retained in `scripts/statistics-sources/europe/turkey-names-osm.json`).

- Land frontier: 2,911 km in two pieces (Greece and Bulgaria; Georgia to Syria). The Iraqi and Iranian neighbours use geoBoundaries' detailed levels, Turkey's rings probe further like French Guiana's, and breaks of up to 1.5 km at tripoints close.
- Population: TÜİK's address-based register at 31 December 2022 by district, as OCHA publishes it (cod-ps-tur); provinces and regions are sums. TÜİK's later tables sit behind a browser check and cannot be retained by script. Areas are boundary-derived; no GDP is shown.
- Cities: the 81 province centres, as OpenStreetMap points. A city such as Ankara spans several districts, so it stands apart from them; districts are named after their own central towns, so towns are not shown. Without an official city population, the dots set their own appearance zoom (`minzoom`, read by `settlementZoom`).

### India

The 28 states and 8 union territories, first level only for now, from geoBoundaries' copy of the DataMeet map (after the Election Commission of India, CC BY 2.5 India), with India's official boundaries. Ids are current ISO 3166-2:IN codes; names are English with Hindi. The map shows 2011, so West Bengal's former enclaves in Bangladesh (exchanged in 2015) are dropped. Areas are boundary-derived; population is not yet included.

- **Matching China.** China's outline is the reference. Indian edges within 3 km of it move onto it, and land left between the two goes to the nearest state, so the frontier is one line. Nepal and Bhutan are the land the two outlines enclose. Pakistan, Afghanistan, Bangladesh and Myanmar come from geoBoundaries, cut by India's and China's outlines, with land between the sources going to the nearest neighbour. All six are drawn beneath India at this precision instead of the world map's 1:110m silhouettes.
- **Overlapping claims.** Both countries claim Aksai Chin, the Shaksgam valley, Arunachal Pradesh (South Tibet) and some smaller tracts. Each map draws its own claim, as with the Falklands. India's portal carries the land China's outline holds as separate shapes (`claimedBy: china`), hidden while China's map is open. Its frontier lines inside China's outline are tagged the same way. China's frontier lines inside India's outline are tagged `claimedBy: india`, hidden while India's map is open. The Kashmir that Pakistan administers is left out of India's portal, so other maps show it as Pakistan's; India's own map covers it with India's claim.

- **China's neighbours, for everyone.** India's de facto territory, Nepal, Bhutan, Pakistan, Afghanistan, Bangladesh and Myanmar from this reconciliation, plus Kazakhstan, Kyrgyzstan, Tajikistan, Laos, Vietnam and the rest of Myanmar from geoBoundaries (cut by China's outline, gaps going to the nearest neighbour), are drawn in the world map's grey in a band about 80 km wide along China's outline (`scripts/build-china-neighbours.mjs`). The band is its own layer above the world map (`world-land.mjs`), loaded after it; the world background now has a separate 1:10m global outline dataset and bounded compact downloads. Each polygon is its own feature, because tile rounding can otherwise turn a mainland into a hole. So China's map meets every non-atlas neighbour without gaps, in public mode too. Beyond the band the shared 1:10m world topology provides noninteractive land and country outlines. Vietnam's stale geometry is omitted from the band, and ready atlas portals suppress their older copies. Nepal's and Bhutan's outlines are the land India's and China's detailed outlines enclose, so they meet both exactly.
- **Third countries' maps.** On a map that is neither claimant's, only the line of actual control is drawn: each claim area goes to whichever country holds most of it by Natural Earth's de facto boundaries (India holds Arunachal Pradesh, China Aksai Chin and the Shaksgam valley), and that country's claim line around it is drawn. The other line carries `claimants` and shows only on those countries' maps, so disputed areas do not appear as loops.
- **China's reference outline.** China's reference is the displayed provinces' outline, the edge China's map fills. China's simplified portal (`china-context.bin`) sits up to 300 m off it; the neighbour band carries China's displayed land in the portal grey beneath that portal, so other maps meet it too. Overlaps under 20 km² between a reconciled country and its reference are slivers between the sources: the country's units give them up, so its own map meets the reference exactly as well.
- **China's frontier line.** On China's map the frontier is drawn by the shared frontier layer as long continuous lines, like every other country's. The province outline leaves those edges: cut into short pieces, each fading in by its own length, it drew them unevenly.
- **China's frontier everywhere.** DataV's generalised outline sits far from Natural Earth's lines along its claims and in places such as the Tian Shan. Anywhere along China's outline, an edge counts as a frontier when land outside China lies all the way out to 3 km. Every stretch of China's land border is drawn.

### Chile, Paraguay and Peru

Paraguay and Peru became available outside developer mode locally on 17 October 2026. Their original addition dates remain in the country log. The Salta–Formosa junction is reconciled before dissolving Argentina, so the provincial source gap cannot become a spike in the shared Pilcomayo frontier.

The three share India's reconciliation (`reconcile` in `build-europe.mjs`): edges within 3 km of a neighbouring atlas outline move onto it, enclosed slivers go to the nearest unit, and each country's other land neighbours (Bolivia, Ecuador, Colombia) are drawn beneath it from geoBoundaries. Chile meets Argentina's outline, Paraguay Argentina's and Brazil's, and Peru Brazil's and Chile's. Population and boundary-derived area; no GDP yet; no subdivision flags yet.

- **Chile.** 16 regions, 56 provinces and 345 communes: the Library of the National Congress (BCN) communes via geoBoundaries, with official codes (CUT) from OCHA's table, matched by name. Both sources call Pozo Almonte (01401) "Tocopilla"; the one in Tarapacá is Pozo Almonte. The commune of Antártica (Chilean Antarctic Territory) is not mapped. Population is the 2024 census, counted per commune from INE's microdata by `scripts/extract-chile-census.py` (18,480,432 people; the 60 in Antártica are left out). The undemarcated Southern Patagonian Ice Field (about 1,400 km² where the two outlines differ) follows the India–China rule: each country's map draws its own claim. A few smaller places where Chile's and Argentina's sources sit more than 3 km apart are treated the same way.
- **Paraguay.** 17 departments, Asunción and 263 districts, from INE's July 2026 boundaries via OCHA. Population is the 2022 census, final results (INE workbook, table A1: 6,109,903), matched by name within each department.
- **Peru.** 24 departments, Callao, 196 provinces and 1,873 districts, from IGN's July 2020 boundaries via OCHA. IGN drops accents, so names are OpenStreetMap's Spanish ones for the same UBIGEO codes. IGN keeps Mazamari and Pangoa (Junín) as one area. Population is INEI's 2025 district estimates as recorded in OpenStreetMap (INEI's own tables are not reachable by script). The 19 districts created since 2020 are counted in the district containing their centre.
- **Cities.** Communes and districts are municipalities named after their own towns, so towns are not shown. Chile's and Peru's national and regional capitals, which often span several units (Greater Santiago, Lima, Greater Concepción), are dots from OpenStreetMap, without populations. Talagante, wrongly tagged as a regional capital, is left out. Paraguay's capitals each match one district, so it has none.

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

**The United States** adds all five inhabited territories and the nine Minor Outlying Islands as first-level places. The inhabited territories use Census 2025 outlines; minor-island land and lagoons use the same OpenStreetMap coastline method as the UK and French territories. All fourteen carry their own portal destinations. Military bases on foreign soil and independent associated states are excluded. [Coverage, sources and verification](docs/us-territories.md).

US counties use all 3,235 counties and equivalents in the Census 2025 boundary file, including Connecticut planning regions and the inhabited territories. Choose a state or search a county; geometry loads one state at a time. The Area codes view covers all 378 in-service US geographic codes in the 17 October 2026 NANPA snapshot, with 29 non-geographic service codes and three planned codes listed separately. Its public-domain UCLA reference polygons are generalized and reconciled with current overlays; small later rate-center boundary adjustments may not be reflected. State GDP and official flags remain separate from county and telephone-area data.

Rebuild these local US details with `npm run build:us-details`; verify the data with `npm run test:us-details` and the interactions with `node scripts/browser/run.mjs us-details`. Source releases and hashes are recorded in `scripts/us-detail-sources.json`; the mutable NANPA snapshot is retained under `scripts/boundary-sources/united-states/`.


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

The worldwide background now uses shared Natural Earth 1:10m outlines reconciled to atlas portals. Portugal, Switzerland, Germany and Ireland have dedicated atlas pages; other background countries stay light gray and noninteractive. See docs/world-country-outlines.md.

Rebuild with `npm run build:europe`; check with `npm run test:europe` (hierarchies, chunks, statistics for every unit, frontier lengths and continuity, enclaves, coastal ends, no coastline strokes, loading modes, developer gating).

## Countries

**Developer mode** opens from Shanghai's Changning district by typing "dev mode"; a country declared with `release:'developer'` loads only there.

**Globe view.** The globe button, in its own card between the north arrow and the zoom controls, switches MapLibre to its globe projection and back for every visitor; the choice is remembered in the browser and holds across countries. Zooming out stops when the globe roughly fills the map's shorter side (the flat map still zooms out to 0.5). On the globe, map labels are left out more than 65° from the view's centre, where far-side and edge places project poorly. Line fading by on-screen size and the motion preview still assume the flat map.

The country name in the header opens a menu of every country the visitor can open (developer-mode countries only in developer mode), each written as its own header writes it: the same English and local names, scripts, fonts, colours and flag stripe. Each option carries `data-atlas`, which the country themes and title rules match as well as `body`, so a country's look is declared once. Choosing one follows the country's link. `dist/country-menu.js` and `dist/country-menu.css`; the `country-menu` browser scenarios check it on desktop (mouse and keyboard) and on a phone.

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

The deploy workflow splits the suite into five parallel jobs (`node scripts/browser/run.mjs --shard=i/5`, scenarios dealt round-robin), about 4 minutes each instead of about 20 in one job; deploy waits for all five. Pushes that change only documentation (outside `dist/`, `scripts/` and `package.json`) do not run the workflow, and a commit whose message contains `[skip tests]` (a change the owner says needs no test) deploys without the browser suite.

All 35 countries became public on 17 October 2026, including Iceland, India and Turkey. The optional Changning developer mode no longer gates any current map. US mainland context exports normalize dissolved geometry into valid polygon features; Alaska, Hawaii and territories retain their own entry destinations.

Denmark was added on 17 October 2026 with its five current regions, 98 municipalities and separately administered Christiansø, plus Greenland and the Faroe Islands. [Coverage, sources and rebuild checks](docs/denmark.md).

US counties, area codes, nationwide ZIP search and municipal boundaries for all 50 states are available in the local preview. [Coverage, distinctions, sources and rebuild instructions](docs/us-local-geography.md). The 500 largest functioning municipal governments have July 2025 Census population estimates, with sourced flags where verified. [Municipal facts, ranking and flag sources](docs/us-municipal-facts.md).

Canada’s local preview includes 293 census divisions, 5,161 municipal/equivalent boundaries, July 2025 population estimates for 5,155 local units, and 308 sourced flags among the 500 largest eligible municipal units. Boundaries use the matching 2021 census geography; detail loads per province and division. [Coverage, flag review, sources and rebuild checks](docs/canada-local-geography.md).

Shared pointer and statistical-hover performance measurements, guarantees and repeatable checks are documented in [docs/map-performance.md](docs/map-performance.md).

## Stability and local preview

From this project directory, run `npm start` and open http://127.0.0.1:4174/. The preview displays a notice if its server stops. Run `npm run test:regression` for the map and feature audit, `npm run test:stability-data` for data consistency, `npm run test:preview` for server recovery, and `npm run measure:stability` for navigation, frame stalls and memory measurements. See [the audit workflow](docs/stability.md) and [Morocco coverage and rebuild notes](docs/morocco.md).

### Bolivia

Added 18 October 2026: nine departments, 112 provinces, 340 municipalities and three Indigenous territories. Full-detail municipal geometry and INE codes are pinned to Lab TecnoSocial revision 2b8c56488f937f67ad04b5f71885f739615b6d02 (CC BY 4.0), derived from SDSN Bolivia 2025 and INE CPV-2024. All 343 municipal population rows match the official final 2024 census, totalling 11,365,333; parent populations are atlas sums. Territorio Indígena Multiétnico is directly under Beni, with no invented province. Source unassigned lake/salt-flat areas remain unassigned; existing neighbours keep ownership of their shared border strokes. No GDP or subdivision flags are inferred.

Use npm run build:bolivia, npm run test:bolivia and npm run test:bolivia-browser. Both Bolivia and Morocco are recorded in docs/country-additions.md and dist/data/country-history.json; addition dates refer to first implementation, not deployment.

Angola and both Congos are available locally: 21 Angolan provinces and 326 municipalities; a shared Congo page with two sovereign country selections, separate flags and statistics, 26 DRC provinces and 15 Republic of the Congo departments. [Sources, coverage limits and checks](docs/angola-congos.md).

Cambodia and Ukraine data coverage: [sources and limitations](docs/cambodia-ukraine.md).

UK place-name coverage, India district boundaries and scoped Turkish levels: [sources, dated snapshots, rebuilds and checks](docs/expanded-coverage.md).

The US–Mexico display frontier follows one complete US county-derived edge, including the Rio Grande meanders. Mexican border municipalities, their parent states, country previews and fallback land share that edge. [Repair method and checks](docs/us-mexico-frontier.md).

Costa Rica and Panama are available with retained official subdivision snapshots, native Spanish names, national flags, focused Cocos Island entry and scoped loading. The Brazil–French Guiana frontier has one shared stroke owner. [Sources, limits and checks](docs/costa-rica-panama-guiana.md).

Zimbabwe, Zambia, Tanzania and Kenya now have dated administrative maps, first-level census statistics and retained national economic data. Costa Rica also includes all 84 canton GDP accounts and provincial aggregates; Panama’s combined province/comarca economic regions are labeled separately. See docs/east-south-africa.md and docs/costa-rica-panama-guiana.md. Historical snapshots suppress modern gray silhouettes at overview zooms. Changes are local until publication is requested.

Moldova, Uzbekistan, Tajikistan and Turkmenistan are available locally with administrative maps, native-name search, flags and dated population. Kazakhstan and Kyrgyzstan remain available. [Coverage and sources](docs/moldova-central-asia.md).

Armenia, Azerbaijan, Georgia, Qatar, Bahrain and the United Arab Emirates are available locally with administrative maps, native-name search, flags and source-linked population. [Coverage and sources](docs/caucasus-gulf.md).

The five Central Asian maps use a shared country partition for matching fills, enclave loops and border strokes. [Boundary repair and coverage](docs/central-asian-frontiers.md).
