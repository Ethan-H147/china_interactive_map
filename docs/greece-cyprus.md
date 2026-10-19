# Greece and Cyprus

Both countries are local-only. Their original addition date remains 18 October 2026; the same-day detailed expansion does not add duplicate country-log entries.

## Coverage

| Country | First level | Second level | Third level |
| --- | --- | --- | --- |
| Greece | 13 regions and Mount Athos | 74 regional units | 332 municipalities |
| Cyprus | Six Republic districts | 540 municipalities and communities | 91 municipal quarters |

Both countries use the shared selection, search, parent breadcrumbs, language settings, saved views, layer locks and first-level quizzes. Cities and towns already belong to the mapped municipal/community units, so there are no duplicate city dots. The first two levels load together; deeper geometry loads for the selected parent. Actual compressed and decoded sizes are retained for the country memory budget.

## Greece

Detailed geometry comes from the official ELSTAT 2021 census shapefiles. English and Greek source names and official geographic codes are retained. The 74 regional units and 332 municipalities include the post-2019 reorganisations. Mount Athos is represented once at the first level and is not relabeled as a municipality. The older 2016 region geometry remains a retained historical input, but the displayed levels now dissolve from the detailed municipal geometry.

The ELSTAT March 2023 workbook supplies the 2021 resident census population at every level. The Central Macedonia reporting group includes Mount Athos: its mapped region population is 1,795,669 minus 1,746, or 1,793,923. The first-level values sum to the national total of 10,482,487. Each deeper level also sums to that total when separately mapped Mount Athos is included. Athens municipality has 643,452 residents; this is the municipal territory, not the full Athens urban area.

Eurostat supplies 2024 nominal GDP and GDP per capita for the 13 NUTS2 regions, with the same year's annual average EUR/USD rate. Central Macedonia's GDP retains the Eurostat statistical scope, including Mount Athos, as stated in the source notes. GDP is not allocated to municipalities or unmatched regional units.

Municipalities are cleaned together; their parents dissolve from those polygons, so all levels share boundaries. The Evros frontier matches the existing Turkey geometry. Lake water is erased from fills while political boundary lines retain their paths across water. ELSTAT census cartography is for statistical use and is not legal evidence of administrative limits. The ELSTAT copyright and reuse policy applies, with source acknowledgement.

Sources: [ELSTAT cartography](https://www.statistics.gr/el/digital-cartographical-data), [ELSTAT census tables](https://www.statistics.gr/el/2021-census-res-pop-results), [Greek administrative structure](https://www.ypes.gr/wp-content/uploads/2024/06/STRUCTURE-OPERATION-LRD-ENGLISH-VERSION-2024.pdf), [Eurostat regional GDP](https://ec.europa.eu/eurostat/databrowser/view/nama_10r_2gdp/default/table).

## Cyprus

Current local-unit identities use CYSTAT's official June 2026 English and Greek geographical-code workbooks. They include the July 2024 municipal mergers. The second level has 29 Republic municipalities (20 in the government-controlled part and nine in the northern part) plus 511 communities. The 91 municipal quarters are the constituent areas of merged municipalities; they are distinct from ordinary neighbourhood quarters. Rural service clusters are cooperative groupings and do not replace their individual communities here.

Full DLS local boundaries are retained under CC BY 4.0, using 613 cadastral municipality/community polygons. Every old DLS code joins an exact predecessor in the current CYSTAT code table. Municipal and district shapes dissolve from the same local polygons. The district names include Turkish; deeper records use the official English/Latin and Greek names. The northern shapes describe Republic geography, rather than the separate de facto local-government system.

CYSTAT's final 2021 census covers government-controlled territory. Its predecessor codes produce current merged-unit totals only where all contributors are available and have compatible coverage. There are 370 verified population cards: 302 municipalities/communities and 68 municipal quarters. For example, reformed Larnaca has 68,202 residents and Mesa Geitonia has 15,925. Whole-district counts, partly controlled or unmatched local totals, and totals for shapes materially clipped by the UK bases are omitted. Missing values are not zero. No unsupported district GDP is added.

UK sovereign-base land is erased at every level. The three Cypriot enclave rings inside Dhekelia match the existing UK geometry exactly: Ormideia includes the power-station enclave, and Xylotymvou is separate. Their district is Larnaca. A local unit crossing a base boundary displays only its Cypriot land; its original whole-unit population is omitted. The dashed generalised Natural Earth buffer-zone reference remains separate from administrative boundaries and is not an authoritative survey.

Sources: [CYSTAT June 2026 classification](https://www.cystat.gov.cy/el/Announcement?id=74185), [DLS open boundary dataset and licence](https://data.gov.cy/en/dataset/187), [DLS administrative map](https://eservices.dls.moi.gov.cy/arcgis/rest/services/National/AdminBoundaries_Indexes_EN/MapServer), [CYSTAT census](https://cystatdb.cystat.gov.cy/pxweb/en/8.CYSTAT-DB/8.CYSTAT-DB__Population__Census%20of%20Population%20and%20Housing%202021__Population__Population%20-%20Place%20of%20Residence/1891114E.px/), [CYSTAT reuse policy](https://library.cystat.gov.cy/NEW/DISSEMINATION_POLICY-EN.pdf), [UNFICYP](https://unficyp.unmissions.org/en/about-unficyp).

## Build and validation

Retained inputs and hashes are under scripts/boundary-sources/greece-cyprus, greece-cyprus-details and cyprus-details. Cyprus records the API page size, stable order and geometry precision in its manifest. Published coverage, source attribution and processing notes are in each country's sources.json.

- npm run build:greece-cyprus fetches verified retained inputs, rebuilds all three levels, and refreshes world, compact, colour and flag assets.
- npm run test:greece-cyprus checks every unit's geometry, identity, parent, land centre, child coverage, overlaps, census scope, source hashes, memory metadata and country log. It also verifies Greek islands, the shared Turkey frontier and 566 probes along the Cyprus–UK base seams.
- npm run test:greece-cyprus-browser checks desktop and phone fills, selected outlines, search, map clicks, parent navigation, saved views, subdivision facts, language options, quizzes, camera preservation and country cleanup.

The local preview uses npm start and serves http://127.0.0.1:4174. No publishing is part of this expansion.
