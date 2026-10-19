# Norway, Sweden and Finland

Added locally on 18 October 2026; all three additions are recorded in the country log.

| Page | First level | Second level | Population reference |
|---|---|---|---|
| Norway | 15 counties plus five territories/dependencies | 357 municipalities | 1 January 2026; Svalbard separately, 1 July 2026 |
| Sweden | 21 counties | 290 municipalities | 31 December 2025 |
| Finland | 19 regions, including Åland | 308 municipalities, including Åland's 16 | 31 December 2025 |

Municipalities include towns, cities and rural territory. Their population figures describe the whole municipality. Land area is from Statistics Norway, Statistics Sweden and Finland's National Land Survey for 2026. Sweden's small disclosure-protection adjustments mean published county and municipal values need not add exactly. Svalbard residents may also be registered on mainland Norway; its population is not added to a mainland national total.

## Territories

Norway includes Svalbard and Jan Mayen as special territories within Norway, outside its county structure; Bouvet Island as an overseas dependency; and Peter I Island and Queen Maud Land explicitly as Antarctic dependencies and claims subject to the Antarctic Treaty System. Polar island polygons come from the Norwegian Polar Institute. Glacier-covered land remains land. No municipal subdivisions are invented for the remote territories.

Queen Maud Land is the 20°W–45°E claim sector clipped to actual Natural Earth Antarctic land and the flat map's 85°S limit. Its mapped-area figure describes only that displayed land, not the entire claim. Its opening view focuses on the coast; the complete displayed sector remains selectable. It is excluded from quizzes. The optional Norway territory quiz adds Svalbard, Jan Mayen, Bouvet and Peter I with four inset maps; the normal quiz contains the 15 counties.

Åland is an autonomous, demilitarised, Swedish-speaking region of Finland, with its own flag and 16 municipalities. It is included in Finland's normal region quiz. Sweden has no present-day overseas dependencies; Gotland, Öland and other domestic islands remain in their counties and municipalities.

## Geometry and provenance

Eurostat GISCO LAU 2024 at 1:1 million supplies the shared Nordic municipality geometry. Codes are checked against current national registers: all 357 Norwegian and 290 Swedish municipality codes match. Finland's former Pertunmaa (588) is dissolved into Mäntyharju (507), matching the official 2026 classification of 308 municipalities. Parent counties/regions are dissolved from the same municipal geometry, so fills at both levels have the same outline. This is generalised administrative map data, not cadastral or survey data.

The Norwegian and Finnish Russian frontiers follow the atlas's existing detailed Russian outline. Norway and Sweden retain their common GISCO frontier; Finland follows the same canonical Norway/Sweden paths. A coastal reference tip at the Norwegian–Russian estuary can be trimmed within 500 metres where it crosses the actual shoreline; inland canonical bends retain the strict one-metre check. Existing Russian border layers draw the Russian frontier once. Natural Earth major-lake masks remove lake water from all levels.

Source archives and their SHA-256 hashes are retained under `scripts/boundary-sources/nordics/manifest.json`. Nordic national flags and Åland's flag have recorded sources. The Finnish and Swedish names, including accents, are retained; SCB's older shapefile text uses Windows-1252. Finnish records also keep their official Swedish and English names, while Norwegian records include the available Sami and Kven search aliases.

Primary sources:

- [Kartverket municipality information](https://ws.geonorge.no/kommuneinfo/v1/)
- [Statistics Norway population table 07459](https://www.ssb.no/en/statbank1/table/07459), [land area table 09280](https://www.ssb.no/en/statbank1/table/09280), [Svalbard population](https://www.ssb.no/en/befolkning/folketall/statistikk/befolkningen-pa-svalbard)
- [Statistics Sweden boundaries](https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/digitala-granser/), population and area API URLs in the retained manifest
- [Statistics Finland open data](https://stat.fi/en/services/statistical-data-services/open-data-and-interfaces), [National Land Survey land areas](https://www.maanmittauslaitos.fi/media/31709/download)
- [Eurostat GISCO LAU distribution](https://gisco-services.ec.europa.eu/distribution/v2/lau/) and its download provisions; © EuroGeographics, non-commercial educational use
- [Norwegian Polar Institute map terms](https://geodata.npolar.no/bruksvilkar/), CC BY 4.0
- [Finland Foreign Ministry: Åland's special status](https://um.fi/sr/the-special-status-of-the-aland-islands)

## Economic statistics

Added on 19 October 2026 from official regional accounts, with a separate source year for each metric:

| Map | Current-price output | Per capita | Coverage |
|---|---|---|---|
| Sweden | 2024 GDP (GRDP), SEK | Published, rounded to SEK 1,000 | All 21 counties and all 290 municipalities |
| Finland | 2023 GDP at market prices, EUR | Published, using the national accounts denominator | All 19 regions, including Åland; no municipal GDP |
| Norway | 2023 GVA at basic prices, NOK | Calculated from SSB's same-year mean population for eight counties | Eight current counties plus Svalbard have output; seven counties split in 2024 have no separate values in this series |

Norwegian GVA is displayed as GVA, using its own metric fields. It is not substituted for GDP in the comparison maps. Svalbard has no per-capita value because the retained mean-population series does not provide a usable denominator. The seven successor counties do not inherit or divide their merged predecessors' output. Other Norwegian territories have no invented output values.

Finland's regional accounts extend to preliminary 2024, but the GDP cells are missing: the available 2024 output is GVA. The retained GDP and published per-capita series therefore both use 2023. Finnish sub-regional units do not match municipalities, so those values are not assigned to municipal cards. Sweden publishes genuine municipal GRDP, so its municipal cards and comparisons include it.

Every conversion uses the economic metric's own annual-average exchange rate. Current population cards are not used to calculate older economic per-capita figures. Source queries, metadata and response hashes are retained under `scripts/statistics-sources/nordics/`.

- [Statistics Sweden regional accounts](https://www.scb.se/NR0105-en): tables NR0105ENS2010T01A and NR0105ENS2010T06A, published 24 June 2026.
- [Statistics Finland regional accounts](https://stat.fi/en/statistics/altp): tables 12bd (GDP, transaction B1GMH) and 12bc (published GDP per capita), updated 28 November 2025.
- [SSB regional accounts, table 09391](https://www.ssb.no/en/statbank1/table/09391/), corrected 11 March 2026, and [mean population, table 03037](https://www.ssb.no/en/statbank1/table/03037/).
- [Eurostat annual-average exchange rates](https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table), matching 2023 or 2024.

## Rebuild and checks

`npm run fetch:nordics` restores boundary inputs, verifies their retained hashes and retrieves the pinned-year official economic tables. `npm run build:nordics` builds country data, territory inset silhouettes, world previews, comparison data, flags and compact assets. The existing detailed Russia dataset is a required neighboring reference. `npm run test:nordics` checks economic coverage and conversions as well as identifiers, hierarchy, child coverage, land anchors, water exclusions, official facts, source links, names, source hashes and shared frontier overlaps. `npm run test:browser:nordics` checks desktop and phone navigation, municipality search, saved views, languages, quizzes, camera preservation, remote islands, territory insets and Åland's flag.

For economics alone, run `npm run fetch:nordic-economy`, then `npm run build:nordic-economy`. `npm run test:nordic-economy` checks source hashes, exact published values, coverage limits, source-year population denominators, currency conversions and agreement between cards and map data. The dedicated browser scenarios are `node scripts/browser/run.mjs nordic-economy`.
