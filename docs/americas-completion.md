# Americas completion

The 15 additions complete interactive coverage of all 35 sovereign countries in the Americas. Existing overseas territories retain their existing parent-country pages. These changes are local; they have not been committed, pushed or published.

| Country | Administrative map | Matched population |
| --- | --- | --- |
| Belize | 6 districts | 2010 census |
| Guatemala | 22 departments; 340 municipalities | 2024 projections |
| El Salvador | 14 departments; 44 municipalities; 262 districts | 2024 projections |
| Honduras | 18 departments; 298 municipalities | 2024 projections |
| Nicaragua | 17 departments/autonomous regions; 153 municipalities | 2020 first-level projections; municipal data unavailable |
| Antigua and Barbuda | 6 parishes; Barbuda and Redonda dependencies | 2011 census; Redonda unavailable |
| Barbados | 11 parishes | 2021 estimated resident population |
| Dominica | 10 parishes | 2011 final census |
| Grenada | 6 parishes; Carriacou and Petite Martinique dependency | 2021 preliminary census, private dwellings |
| Saint Kitts and Nevis | 14 parishes | 2022 private-household census population |
| Saint Lucia | 10 districts | 2010 census |
| Saint Vincent and the Grenadines | 6 parishes | Parish population unavailable |
| Trinidad and Tobago | 15 corporations/municipalities and Tobago | 2011 census |
| Guyana | 10 regions | 2021 estimates |
| Suriname | 10 districts; 62 resorts | 2012 census |

The additions contain 178 first-level areas, 897 second-level areas and 262 third-level areas: 1,337 units. Population observations match 1,177 units. The remaining 160 are Nicaragua’s 153 municipalities, Saint Vincent and the Grenadines’ six parishes, and Redonda. The atlas shows unavailable statistics for those units rather than allocating national totals or joining incompatible tables.

All 15 retain 2025 national GDP and GDP per capita from the [World Bank World Development Indicators](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD). National accounts are not assigned to subdivisions. Country overview pages and Country tabs remain hidden. Subdivision pages retain dated population, coverage notes, mapped area and available population/density colors. Each country has its own map and interface palette, national flag, search, administrative quizzes and saved-view routes.

## Sources and scope

Boundary and population originals, metadata, source-specific licenses and SHA-256 pins are retained in scripts/boundary-sources/americas-completion/. The build reads pinned originals, not live changing tables. [OCHA Common Operational Datasets](https://data.humdata.org/) supply most national administrative boundaries and matching population tables. The [geoBoundaries open database](https://www.geoboundaries.org/api.html) supplies Antigua and Barbuda, Barbados, Dominica, Saint Kitts and Nevis, Saint Lucia and Guyana. Complete HDX shapefiles are used for Trinidad and Tobago and Suriname; the alternative geoBoundaries downloads lacked one and four expected units respectively. Older source geography is a dated administrative reference, not a claim of survey precision or a current legal boundary determination.

Government population supplements are transcribed from retained originals, with table/page references in government-populations.json:

- [Barbados 2021 census](https://www.stats.gov.bb/wp-content/uploads/2024/02/2021-Population-and-Housing-Census.pdf), Table C: estimated residents including undercount adjustment and institutions. National total 269,090; published parish estimates sum to two fewer because of rounding.
- [Saint Kitts and Nevis 2022 census summary](https://statistics.caricom.org/wp-content/uploads/2025/11/SKN-Census-Report-2021-2022.pdf), Table 2: 51,320 private-household residents; institutional residents are excluded.
- [Antigua and Barbuda 2011 statistical tables](https://statistics.gov.ag/wp-content/uploads/2017/10/Census-2011-Book-of-Statistical-Tables-I.pdf), Table 5.1: St John’s City and Rural combine into the mapped Saint John parish. Redonda has no matched observation.
- [Dominica final parish census table](https://stats.gov.dm/subjects/demographic-statistics/population-by-sex-and-parish-2001-and-2011/): 69,325 residents in 2011.

Grenada’s Carriacou and Petite Martinique source polygons form one dependency matching the combined 2021 preliminary census population in private dwellings of 4,747. The national 109,021 count also includes institutional and homeless residents; parish observations exclude them. No population is duplicated or divided between the islands. El Salvador follows the 2024 municipal structure. Guatemala’s two lake units and El Salvador’s four lake/reservoir units are excluded from the administrative roster. Nicaragua’s COD-PS explicitly declares municipal population incompatible with the geometry; Saint Vincent’s census divisions do not match the six parishes. Saint Lucia’s 547 named communities and Guyana’s 27 older local reference areas are not presented as additional government tiers.

The [Grenada 2021 preliminary census](https://stats.gov.gd/wp-content/uploads/2025/04/2021-National-Housing-Population-Census-Results-Latest-PRELIMINARY.pdf), Table 17, supplies the seven parish/dependency observations after combining Saint George’s town and rural area. Table 1 supplies the broader national count.

## Borders and water

Fourteen shared arcs cover 13 country pairs. New subdivisions follow one canonical arc per pair and common junctions. Mexico, Costa Rica, Brazil, Venezuela and France retain their existing administrative land. All unrelated interactive-country world silhouettes are checked against retained hashes. Background maps for Mexico, Costa Rica, Venezuela and France use their unchanged detailed administrative polygons, so the repaired seams also meet when those countries are inactive. Earlier Brazil–French Guiana geometry, including its Brazil–Suriname junction, remains fixed. The Brazil–Guyana–Suriname junction follows the actual intersection of the retained surveys; joined border runs prevent small self-crossing tips. A short coastal reference tip is omitted where it does not form a shared land boundary. Obsolete background outlines are removed; each new frontier has one visible owner. The map retains Guyana-administered Essequibo with Guyana rather than transferring it because of a claim.

Natural Earth permanent lake surfaces appear above fills and below all original border and selected-outline layers. They use the active sea color and fade under satellite imagery. Water masks do not alter administrative borders, recorded populations or mapped-area calculations. Previously added Canadian and worldwide lake cutouts remain present.

## Rebuilding and checking

Run npm run build:americas-completion to fetch/cache, prepare all units, reconcile frontiers and integrate derived assets. Run npm run test:americas-completion for source hashes, exact counts, hierarchy coverage, label anchors, statistics, preserved older silhouettes, geometric seam probes and real desktop/phone scenarios. Detailed results are written under artifacts/. The standard local integration check is npm run test:deployment.

Local verification completed: all 30 country scenarios (15 countries on desktop and phone), about 20,000 geometric border probes, exact hierarchy and population checks, label anchors, compact-file freshness, and the standard deployment-readiness suite. Additional border, lake and projection regressions are recorded in the browser reports. Verification is local and does not publish the changes.

Nicaragua shoreline correction: Lakes Nicaragua and Managua use the lake openings in the existing administrative polygons for their permanent water fill. Subtracting those same land polygons retains Ometepe and the other islands. This replaces the coarser Natural Earth fill near Chontales, Río San Juan and the other lakeside departments without changing administrative geometry, shore outlines or statistics.

Custom country themes: all 15 additions are registered in the shared national-flag palette system. Normal and selected map fills, outlines, sea backgrounds, headings, controls, hover surfaces, country-menu entries and header stripes derive from the same flag swatches. The existing contrast checks cover the full interface palette. Rebuild with npm run build:americas-palettes; verify with npm run test:americas-palettes.
