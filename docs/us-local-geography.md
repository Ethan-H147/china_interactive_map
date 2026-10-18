# US ZIP codes and municipal governments

The atlas includes all 41,514 five-digit ZIP codes in the USPS Area District assignment snapshot of 13 October 2026. Postal-facility names come from USPS ZIP Locale Detail; they are not guaranteed delivery-city names. Military ZIPs and USPS service areas outside US sovereignty remain searchable without invented state parents.

ZIP codes are a map view in the dropdown beside the administrative toggle. Geometry uses all 33,791 Census 2020 ZIP Code Tabulation Areas (ZCTAs), generalized statistical areas rather than current USPS delivery boundaries. The 7,733 assigned codes without a ZCTA have an explicit no-boundary card; ten historical Census codes remain labeled historical. Leading zeroes are retained.

A ZIP shape is never cut to counties or states. Official positive-land-area ZCTA–county relationships place the whole shape in every intersecting state. A postal facility address is never substituted for delivery-area geometry.

## ZIP boundary completeness

ZCTAs leave some land unassigned. Drawing only edges shared by two ZCTAs omitted real inland perimeters, particularly in California. The build now retains single-owner inland segments and deduplicates shared edges. ZCTAs and matching-vintage Census land are simplified together; a land mask distinguishes inland gaps from coasts. Unselected coastlines stay hidden, and selecting a ZIP displays its full outline. This rule applies to every state.

## Nationwide municipal coverage

The 2025 Census sources cover all 50 states and DC. Puerto Rico's statistical communities are also available through the optional community setting; its municipios remain at the county-equivalent level.

There are 37,290 legal municipalities, towns and townships, plus 12,832 optional Census communities and eight statistical city balances: 50,130 records. Legal type determines inclusion, rather than population or prominence.

The build combines Census places with functioning minor civil divisions in town/township states. This includes New England and New York towns, New Jersey and Pennsylvania townships, and town/township governments elsewhere. Functional statuses A, B, C and G identify active governments, including consolidated and subordinate governments. Nonfunctioning/statistical county divisions are excluded. Duplicate ANSI legal entities and coextensive consolidated town/city governments are represented once, with excluded source records and reasons retained in municipalities/sources.json. Incorporated-place records retain their published government status, including legally existing nonfunctioning places.

| Coverage example | Municipalities, towns and townships | Optional communities |
| --- | ---: | ---: |
| California | 483 | 1,136 |
| Illinois | 2,719 | 167 |
| Ohio | 2,238 | 340 |
| Massachusetts | 351 | 190 |
| New Jersey | 564 | 377 |
| Rhode Island | 39 | 28 |
| Hawaii | 0 | 163 |

Hawaii has no incorporated Census places. The Honolulu city-county government remains represented at county level; the communities are optional. A town containing an incorporated village retains its legal boundary alongside that village. These overlapping governments are not cut into invented nonoverlapping units. Towns and townships are labeled by their legal type, rather than all being called incorporated cities.

Full consolidated-city governments use the dedicated Census consolidated-city boundary file. Their statistical balance records are optional and explicitly labeled; they are not substituted for the whole government.

All records use stable type-prefixed Census GEOIDs: US-PLACE- for places, US-MCD- for county subdivision governments, and US-CONCITY- for consolidated cities. They are scoped to states because whole municipalities can cross county lines. Census land area is displayed; municipal population and GDP are not inferred from a parent. The 500 largest functioning whole municipal governments have their own July 2025 Census population estimates and sourced flags where verified; see [municipal facts](us-municipal-facts.md). Boundaries are generalized at 1:500,000, not parcel or survey boundaries.

## Loading and performance

Search metadata covers the whole country, while county, municipal, ZIP and area-code geometry loads for one state at a time. State/view changes cancel obsolete work and release detailed sources, indexes and object URLs. The three-country residency cap remains in place.

Default municipal chunks exclude optional community geometry. The larger combined variant loads only when the community setting is enabled or search selects a community. A setting change replaces the current variant rather than retaining two copies. Large child lists render only when expanded, in batches of 100, with search available across the whole list.

County and municipal chunks load together in one cancellable boundary worker job. The renderer waits for fills, shared borders and the selected outline to index before camera movement. Superseded jobs cannot install old geometry or move the camera.

Polygon parts are serialized once. UTF-8 byte ranges let selected outlines reuse slices of the same blob through the atlas-data worker protocol. MapLibre indexes only the selected outline, retaining all islands and fragments of that ID. It does not tile a second complete copy of every municipal or ZIP perimeter.

Hierarchy and labels use parent/state indexes. As a search query grows, matching narrows all previous candidates, including results below the visible top twenty. Backspace and replacement reset the candidate set. US search flights have a 550 ms maximum; reduced motion and camera locks retain their behavior.

Local Chrome measurements with the final nationwide catalogue: Los Angeles ↔ Cincinnati completed in 0.88–0.91 seconds at normal CPU speed and 2.0–2.3 seconds with 4× main-thread throttling. These are local measurements, not network guarantees. Across 95,361 searchable records, the broad query “a” took a median 13 ms with bounded ranking versus 84 ms with full sorting; specific queries had similar timings. California’s default municipal chunk is 702,775 bytes versus 1,478,436 bytes with optional communities, a 52.5% reduction.

Source URLs, retrieval dates and SHA-256 pins are in scripts/us-local-sources.json. Mutable postal snapshots are retained in scripts/boundary-sources/united-states/. Census downloads use versioned official URLs and are verified against pins.

## Build and check locally

- npm run build:us-local — ZIPs and nationwide municipalities.
- npm run build:us-details — counties, area codes, ZIPs, municipalities and derived display data.
- npm run test:us-local — official source completeness, classifications, labels, exact shared edges, default/optional variants, ZIP gap edges and coastline behavior.
- node scripts/browser/run.mjs us-local us-nationwide us-performance us-selection-lock — browser navigation, optional geometry, pan persistence, reload, locks, cancellation and eviction.
- npm run measure:us-navigation -- nationwide — click-to-pan timings; BROWSER_CPU_SLOWDOWN=4 throttles the main thread. Reports are written to artifacts/us-performance/.

Run npm start and use the printed local URL; the existing preview is http://127.0.0.1:4174/. Reload with Ctrl+Shift+R. Choose Municipalities and try Seattle WA, Houston TX, Greenwich Connecticut or Hempstead town New York. Choose ZIP codes in the adjacent dropdown and search 92309 or 93546 to inspect California's inland perimeters. Try 00501 to verify a code without a Census polygon is explained.

Official references:
- https://postalpro.usps.com/areadist_ZIP5
- https://postalpro.usps.com/ZIP_Locale_Detail
- https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html
- https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html
- https://www.census.gov/library/reference/code-lists/functional-status-codes.html
- https://www.census.gov/programs-surveys/geography/technical-documentation/records-layout/gaz-record-layouts/gaz25-record-layouts.html
