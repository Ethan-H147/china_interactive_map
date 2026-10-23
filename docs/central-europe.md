# Austria, Hungary and Slovenia

The three local maps use the shared country layout, search, bilingual labels, selection styling, saved links, quizzes, statistical shading and original-artwork flag viewer.

| Country | First view | Middle view | Local detail | Population |
| --- | --- | --- | --- | --- |
| Austria | 9 federal states | 94 political districts and statutory cities | 2,092 municipalities; Vienna's 23 boroughs in a separate view | Statistics Austria, 1 January 2026 |
| Hungary | 19 counties and Budapest | 174 districts plus the whole-capital equivalent carried by KSH TIMEA | All 3,155 municipalities | Validated Eurostat GISCO LAU series, 1 January 2024 |
| Slovenia | 12 statistical regions | 212 municipalities, including 12 urban municipalities | 6,035 official settlement reference areas | SURS, 1 January 2026 |

Slovenian statistical regions are labeled as statistical groupings, rather than an elected regional tier. Settlement polygons include countryside, not just the built-up village or town. Budapest remains one municipality; the national KSH geometry represents it as a whole-city district equivalent rather than dividing it into its 23 self-governing boroughs.

Austria uses Statistics Austria's 1 January 2026 municipal geography. The official download has 2,091 municipalities outside Vienna plus Vienna's 23 borough polygons; the latter dissolve into the one municipality of Vienna in the main hierarchy. Boroughs remain separately searchable in the optional Vienna view. Hungary uses KSH TIMEA's public county, district and settlement geometry, with the current Csongrád-Csanád county name. Slovenia uses the current GURS Register of Spatial Units. Local source files, extraction methods and checksums are retained under `scripts/boundary-sources/central-europe/`.

Population is published resident population. Parent totals sum the official constituent counts, and Slovenia's municipality totals are checked against SURS's independently reported municipal values. Areas describe mapped administrative land and exclude the retained lake surfaces. Regional GDP and GDP per capita use Eurostat's published NUTS 2 figures for the Austrian states and NUTS 3 figures for Hungarian counties and Slovenian statistical regions. Each economic card keeps its reference year, official geography, price basis and matching year's exchange rate. Regional GDP is not assigned to individual districts, municipalities or settlements.

The flag set retains all nine Austrian state flags, all nineteen Hungarian county flags and Budapest, and ten verified Slovenian urban-municipality flags. Slovenia's statistical regions do not receive invented flags. Available artwork opens its retained original, with author, license and source attribution. Missing Slovenj Gradec and Krško artwork is omitted.

The border pass uses complete national arcs and common survey junctions. Czech and Slovak retained survey frontiers remain fixed references. Austria's detailed 2026 outline supplies its remaining shared arcs, and GURS supplies Slovenia's other edges. Natural Earth chooses the neighbor and direction; its coarse tripoint positions do not truncate the detailed survey. Jungholz is retained as a separate Austrian polygon, including its point contact at Sorgschrofen. Every adjacent administrative level and the country portals use the same shared frontier. Each stroke has one owner, including when a third country is open. Lake Constance and Lac Léman keep their existing permanent water exclusions and have no added shoreline stroke.

Build with `npm run build:central-europe`. The source fetch reuses pinned downloads; a changed retained checksum fails instead of silently upgrading a source. `npm run test:central-europe` checks counts, populations, areas, local names, flags, shared borders at every available level, globe integration, and desktop/phone navigation. The existing world-outline, compact-data, globe-handoff and Alpine-lake checks cover the shared assets updated by the build.
