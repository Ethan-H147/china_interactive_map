US and Ireland statistics coverage
=================================

The local statistics expansion adds population to 49,666 of the 50,130 mapped U.S. local records, 2024 GDP to 3,091 individual U.S. counties, and 2022 census population to all 100 mapped Irish municipal districts. Administrative geometry and rendering timing are unchanged.

U.S. population
---------------

35,660 whole local units match Census Vintage 2025 estimates through exact geographic identifiers and whole-area summary levels 162, 061 and 170. This includes incorporated places, towns/townships, full consolidated cities, statistical balances and Urban Honolulu CDP where the release supplies a figure. Whole-government estimates are kept distinct from statistical city balances and overlapping township/place governments.

Another 14,006 local records match exact Census 2020 GEOIDs in the Census Bureau's TIGERweb Census2020 incorporated-place, CDP and county-subdivision layers. `POP100` supplies the census count, including valid zeroes. These are explicitly dated 1 April 2020. The info dot explains that the map uses 2025 boundaries, and density is suppressed because the boundaries may have changed. They are census counts, not current estimates. The 464 unmatched records remain without population; no spatial or name-based population allocation is made to newly defined areas.

The top-500 government ranking and 423 existing flag assets are preserved. Ranking no longer controls whether a verified population card can appear. Unranked governments now use the shared population/area card; unmatched places retain their existing area card. CDPs and statistical balances retain their classification notes. Population and density colors reflect their actual coverage and reference years.

U.S. county GDP
---------------

The February 2026 BEA CAGDP1 release supplies 2024 GDP. Line 3 reports thousands of current dollars, converted to dollars. Exact county FIPS joins produce 3,091 county totals. GDP per capita divides each total by the Census 1 July 2024 population from Vintage 2025, rather than the newer 2025 population shown on the card. Both the calculation and its population source are recorded.

BEA combines 53 mapped counties/independent cities into 24 reporting areas in Virginia and Hawaii. Their combined totals are retained in the build snapshot, and individual county cards explain why no separate GDP is assigned. The release does not provide county GDP for the 91 territorial county equivalents. Existing state GDP, county populations and land areas are preserved.

Ireland
-------

CSO FY108 supplies 2022 census population for 166 statutory 2019 local electoral areas (LEAs). Its linked geographic identifiers join the table to the corresponding CSO boundaries. Whole LEAs are grouped into municipal districts; population is never apportioned by area. The 127 included LEAs cover all 100 mapped districts, and each district group reconciles exactly to its county/city census population. The other 39 LEAs belong to the six local authorities without municipal districts and remain represented by those council pages.

Small boundary discrepancies in Athenry–Oranmore, Drogheda Urban and Mullingar are reviewed against the official municipal-district membership rules in S.I. 618/2018, 626/2018 and 636/2018. The affected district pairs are Athenry/Loughrea, Drogheda/Laytown–Bettystown, and Mullingar–Kinnegad/Athlone–Moate. Their census totals follow the statutory district membership. All six carry a boundary note and omit density. Existing county and regional totals, mapped areas and regional GDP remain unchanged.

Sources and reproduction
------------------------

Raw responses, download URLs, licences, byte counts and SHA-256 hashes are retained under `scripts/statistics-sources/us-ireland/`. The normalized snapshot records every population/GDP join and exception, and the Irish LEA crosswalk. The U.S. municipal-population crosswalk retains source names, years and geography types. The previously retained Vintage 2025 municipal file is reused rather than duplicated.

- [Census city and town estimates](https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html).
- [Census TIGERweb Census2020 layers](https://tigerweb.geo.census.gov/arcgis/rest/services/Census2020/tigerWMS_Census2020/MapServer).
- [BEA GDP by county](https://www.bea.gov/data/gdp/gdp-by-county).
- [CSO FY108](https://data.cso.ie/table/FY108), linked from the [official census small-area documentation](https://www.cso.ie/en/census/census2022/census2022smallareapopulationstatistics/).

Run `node scripts/prepare-us-ireland-sources.mjs` to verify/fetch retained inputs and reproduce the normalized snapshot, then `node scripts/us-ireland-statistics.mjs` to apply the statistics and rebuild these two color datasets. The standard municipal, county and Irish dataset builders reapply the corresponding overlay. Repeated application preserves the output.

Validate with `node scripts/validate-us-ireland-statistics.mjs`, `node scripts/validate-us-municipal-facts.mjs`, `node scripts/validate-atlantic.mjs`, `node scripts/validate-region-colors.mjs`, and `node scripts/browser/run.mjs us-ireland-statistics us-municipal-facts`. The large U.S. color file interns repeated source text and expands it once when read, preserving every source URL while staying below Cloudflare's 25 MiB asset limit. Color thresholds use nationwide data, while paint expressions include only the loaded state's units and necessary parent fallbacks. `node scripts/validate-us-color-scope.mjs` checks lossless metadata expansion and equivalent bounded paint lookups.
