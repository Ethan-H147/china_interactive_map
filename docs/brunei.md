# Brunei

Added locally on 18 October 2026. The map contains four districts and 39 mukims, with district and mukim selection, search, clickable parent breadcrumbs, saved views, population shading and the first-level district quiz. The country log records the addition. Village, housing-area and forest-reserve shapes are not presented as administrative subdivisions.

Boundaries are the Nadi.BN Brunei Map dataset issued 10 November 2021, retained at bruneiverse/bruneimap revision `ca3b69985e3d0a9eaf85ad38843d5ba3086be7ac`. The dataset and distributor identify the GIS data as CC BY 4.0. Geometry is cleaned together and simplified to 12 metres. The two Gadong mukims are retained; blank source id 0 (Pulau Berambang) belongs to Kota Batu and does not become an extra mukim. Offshore islands with verified district ownership appear at district level, without fabricated mukim assignments. Source downloads, attribution, processing reference and SHA-256 hashes are retained in `scripts/boundary-sources/brunei/`.

District populations are official DEPS 2025 estimates, released in April 2026: Brunei-Muara 332,700; Belait 67,900; Tutong 48,500; Temburong 9,500. The total is 458,600. These are district estimates; no district population is copied into a mukim, and no GDP is inferred. The national flag is public domain.

## Shared Malaysia border

Nadi's more detailed national land edge is the common reference for Brunei and Sarawak. Western Brunei and Temburong are separate mainland polygons, so the alignment routine processes their frontier arcs separately. The Malaysian district shapes, state overview and background land all retain the same complete path, including river bends. Malaysia's outline builder explicitly preserves that path before applying the coarse Natural Earth coastline heuristic. The global border stores one stroke for each frontier.

Malaysia's background now uses the district-derived state land, keeping its fill aligned with both Brunei and the existing Indonesia frontier. Its compressed context is about 167 KB, within the revised 180 KB budget. The existing Indonesia–Malaysia canonical border remains unchanged.

## Rebuild and verification

Run `npm run build:brunei` to regenerate the data, then `npm run test:brunei` and `npm run test:brunei-browser`. `node scripts/validate-borneo.mjs` checks the earlier Indonesian frontier as well.

The Brunei validator checks all four districts and 39 mukim identities, parents, centers, dated population figures, bundled startup data, land/water probes, overlaps, source hashes and the country log. It checks 6,320 endpoint and midpoint samples along the western and Temburong frontiers against both countries' actual geometry and outline runs. Browser scenarios check country switching and satellite view; search, parent navigation, saved views and quizzes at desktop and phone widths; and actual rendered border strokes from both countries at zoom levels 8, 12 and 14.
