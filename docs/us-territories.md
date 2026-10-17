# US overseas territories

Added locally on 17 October 2026. These are first-level places within the United States, not separate country entries. The original United States addition date stays unchanged in the country log.

The five inhabited territories are American Samoa, Guam, the Northern Mariana Islands, Puerto Rico and the U.S. Virgin Islands. The nine Minor Outlying Islands are Baker, Howland, Jarvis, Johnston Atoll, Kingman Reef, Midway Atoll, Navassa, Palmyra Atoll and Wake Island. This follows the [Department of the Interior’s insular-area definitions](https://www.doi.gov/node/11613), including incorporated Palmyra.

Military bases on foreign soil are excluded. Wake remains included because the island is itself a US territory. Micronesia, the Marshall Islands and Palau are independent associated states. Bajo Nuevo and Serranilla, administered by Colombia, are excluded. Navassa’s card notes Haiti’s competing claim.

## Geometry and navigation

The five inhabited territories use the [2025 Census cartographic state/Island Area land boundaries](https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html). The nine minor territories use directed OpenStreetMap coastlines joined by the same `coastLand` helper used by UK and French territories. Lagoons and the spaces between separate islands remain water. Kingman uses emergent land, not the surrounding reef or marine refuge.

The OSM snapshot contains 59 ways and records an OSM database timestamp of 15 July 2026. Its exact bytes are retained in `scripts/boundary-sources/us-territories/coastline.json.gz`; the source manifest pins their SHA-256 and query. Rebuilds reuse the snapshot without requesting changing live geometry.

Each territory context feature carries `region` and its own four-number `bounds`. The existing shared `countryAt → changeAtlas(focus) → restore(region)` path selects the territory and fits those bounds. Alaska and Hawaii use the same focused entry path through `focusOnEntry`, while retaining their State classification and existing statistics. The shared context builder excludes those two states and the territories from the mainland entry outline. The US mainland context and home camera stay separate. Pacific longitude coordinates are not processed with Alaska’s antimeridian adjustment. Shared view links normalize repeated-world longitudes.

## Cards and sources

The five inhabited territories show the [2020 census population](https://www.census.gov/library/stories/2021/10/first-2020-census-united-states-island-areas-data-released-today.html), including Puerto Rico’s [2020 census count](https://www.census.gov/quickfacts/PR). Minor islands have no invented resident count; temporary personnel are not assigned a permanent census population. Their area is explicitly labeled mapped land area.

Original territory flag artwork, lossless thumbnails, attribution and file hashes use the existing North America flag pipeline. The Minor Outlying Islands display the US national flag without invented local flags. The existing 51 state/DC GDP pairs are preserved; unavailable territorial GDP remains missing.

## Rebuild and verify

- `npm run build:us-territories` extends the current US files, retaining existing state geometry and economic data.
- `npm run build:country-expansion` includes territories in a full rebuild.
- `npm run test:us-territories` checks all fourteen destinations, matching outlines, land/lagoons, source pins, flags, statistics and Pacific links.
- `node scripts/browser/run.mjs us-territories` tests every territory click, camera movement, phone search, flag viewing, shared links, reload and Alaska.
- `ONLY=united-states` and `EXPANSION_OUTPUT=<temporary directory>` support an isolated source-build check.

Changes remain local until a later publishing request.
