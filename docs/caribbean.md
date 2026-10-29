# Caribbean additions

Added 29 October 2026 using the shared regional map renderer, source-pinned land geometry, search, subdivision details, original national flags, satellite imagery, population/area coloring and first-level quizzes in all three modes. Maps open on Map settings; country overview pages remain hidden.

| Country | First map level | Detail |
| --- | --- | --- |
| Bahamas | 32 source districts + New Providence | Dated flat 33-unit reference; no invented lower tier |
| Cuba | 15 provinces + Isla de la Juventud | 168 municipalities |
| Dominican Republic | 31 provinces + National District | 155 source municipalities; 386 municipal seats/districts |
| Haiti | 10 departments | 140 communes; 570 communal sections |
| Jamaica | 14 parishes | 775 SDC communities, grouped directly by parish |

The five countries live under North America. Deep geometry is loaded only for the selected parent. All hierarchy levels dissolve from the same finest available source partition, avoiding gaps between differently dated parent and child maps. Parent/child coverage and land-based labels are validated. Coastlines and open water have no boundary stroke; shared internal administrative edges are stored once.

Haiti and the Dominican Republic share a single detailed frontier extracted from the Dominican source outline, aligned into the Haitian commune/section partition, and owned by Haiti’s international layer. The ownership prevents duplicate strokes. Published lake water is removed from land and frontier lines. Existing interactive country geometry and earlier repaired frontiers are preserved byte-for-byte during overview integration.

## Boundary sources and vintages

Cuba, the Dominican Republic, Haiti and Jamaica use national-authority Common Operational Datasets distributed by OCHA HDX under CC BY-IGO. Original ZIPs, metadata, population CSVs, normalized tables and SHA-256 checksums are retained in scripts/boundary-sources/caribbean.

Cuba’s source was created in 2017 and carries a 2023 validity date in the retained files. Its 16 top-level units and 168 municipalities are preserved. The source excludes the Guantánamo naval-base footprint; no replacement jurisdiction is invented.

The Dominican source was created in 2017 and is retained as valid in 2021. It has ten statistical regions above the provinces; source ADM2 provinces, ADM3 municipalities and ADM4 municipal seats/districts become atlas levels 1–3. Statistical-region names/codes remain in record metadata. The 155/386 detail counts are historical source coverage, not a claim to represent later municipal reforms.

Haiti retains the CNIGS/OCHA reference valid in 2018 and reviewed in 2025, with the source’s older 140-commune framework. The intermediate arrondissement geography is not present in this source and is not fabricated. Administrative boundaries are not a current territorial-control map.

Jamaica uses the Social Development Commission source created in 2017 and validated in August 2024. Its 775 communities have explicit valid parish P-codes. The uncertain 131-unit intermediate source aggregation is skipped, so communities become the second displayed level rather than being given a false administrative parent.

The Bahamas uses the pinned [OSM/Wambacher geoBoundaries district layer](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BHS/ADM2/geoBoundaries-BHS-ADM2.geojson), ODbL 1.0, dated 2017. Its release calls it ADM2 and metadata claims 34 features, but the actual 33 features are a flat geography of 32 districts and centrally administered New Providence. Harbour Island, Spanish Wells and Green Turtle Cay are verified against their real island locations. A competing ADM1 source is retained only for audit: it misassigns these islands and is not used in output geometry. The mapped layer lacks a separate Sweeting’s Cay and does not implement the full [2024 local-government reform](https://laws.bahamas.gov.bs/cms/images/LEGISLATION/PRINCIPAL/2024/2024-0059/2024-0059_1.pdf). Some uninhabited cays lack detailed district coverage; they are not assigned by guessing. The source’s Black Point/Exuma Cays coverage is limited. Credit to OpenStreetMap contributors is retained in source metadata and map attribution.

## Population and economic statistics

Cuba uses ONEI’s official calculated effective population at 31 December 2024: 9,748,007 nationally, with exact values for all 16 top-level units. This is a residence-based effective-population measure, not a new census. The obsolete HDX 2024 projection is not used. The primary ONEI demographic yearbook, table 1.5, was retained from a [public mirror](https://rotativo.com.mx/files/88746/00-anuario-demografico-2024.pdf), and its hash and province totals are verified. Municipal counts are not inferred.

Dominican province values use matched COD-PS 2023 projections. Their sum is 10,711,155. The original national CSV row erroneously duplicates the Yuma region count of 750,548; it is discarded, and the matched province sum is used. The dataset’s conflicting descriptions of its projection baseline are not repeated as established facts. No deeper population is allocated from province totals.

Haiti uses UNFPA/COD-PS estimates at 1 September 2024 for all ten departments and 140 communes, with national total 11,899,555. The estimates include the source’s displacement and mobility assumptions. They are not substituted with differently scoped IHSI estimates; no communal-section population is invented.

The [Bahamas 2022 census](https://cdn.bahamas.gov.bs/tenant/tenantbnsi/documents/2022-Census-Report-1st-Release-12-February-2025-FINAL-20250526040559.pdf) gives national population 398,165. Only 14 exact whole-island/group matches receive district values. Broad Abaco, Andros, Eleuthera, Exuma and Grand Bahama island totals are not distributed among local-government districts, even where similarly named supervisory districts appear in the census. The published Crooked Island total includes Long Cay.

[STATIN’s 2022 parish table](https://statinja.gov.jm/PopCensus/Census2022/Population%20Change%20by%20Parish.aspx) gives Jamaica’s population as 2,774,538 and separate counts for 12 parishes. Kingston and Saint Andrew are published together at 672,904; their cards disclose that combined count without assigning or splitting it. Published parish rows sum one person below the national value, so neither is silently altered. No community population is inferred.

National GDP and GDP per capita retain the latest available dated World Bank WDI pair, including Cuba’s older available year. National economic totals are never assigned to subdivisions. Areas are calculated from mapped land geometry and labeled as mapped values rather than official legal land-area figures.

## Rebuild and verification

Run npm run build:caribbean to reuse retained downloads, build the five datasets and refresh derived overview/compact assets. Normalized statistical tables accompany their retained primary sources. The build checks their original source hashes; refreshing those tables requires an explicit, reviewed source update. Run npm run test:caribbean for source, geometry, statistics, island-identity, hierarchy, shared-border, phone/desktop map, search, deep-link, flag, imagery and quiz checks.

Source entry points: [Cuba COD-AB](https://data.humdata.org/dataset/cod-ab-cub), [Dominican COD-AB](https://data.humdata.org/dataset/cod-ab-dom), [Haiti COD-AB](https://data.humdata.org/dataset/cod-ab-hti), [Jamaica COD-AB](https://data.humdata.org/dataset/cod-ab-jam), [Haiti population](https://data.humdata.org/dataset/cod-ps-hti), and [Dominican population](https://data.humdata.org/dataset/cod-ps-dom).