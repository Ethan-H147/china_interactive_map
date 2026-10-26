# Shared US place pages

66 jurisdictions share one page across county and municipal map levels: 41 independent cities and 25 consolidated governments. Independent cities use the label “Independent city”. A small info button beside the label reveals the status explanation and source; the note is closed by default and dismisses with Escape, an outside click, or another selection.

The canonical page ID is the county ID. Both original links still work, and saved views retain the map level. Search combines aliases and returns one page. Statistics use the county record; flags use the municipal record where available. Boundaries remain separate for rendering. Population and area are never added together.

## Audited consolidated pairs

The explicit registry in scripts/us-consolidated-page-pairs.json adds 24 pairs to San Francisco: Anchorage, Juneau, Sitka, Wrangell, Denver, Broomfield, Macon-Bibb, Cusseta-Chattahoochee, Athens-Clarke, Echols, Columbus/Muscogee, Georgetown-Quitman, Augusta-Richmond, Webster, Lexington-Fayette, Louisville/Jefferson, New Orleans/Orleans, Nantucket, Anaconda-Deer Lodge, Butte-Silver Bow, Philadelphia, Nashville-Davidson, Lynchburg/Moore, and Hartsville/Trousdale.

Government relationships follow the [Census Individual State Descriptions](https://www.census.gov/content/dam/Census/library/publications/2024/econ/2022ISD.pdf), the relevant state chapters and Appendix A. San Francisco retains its [official statement](https://media.api.sf.gov/documents/CCSFSeries2025ABCD24fos.pdf). Echols is also confirmed by its [county comprehensive plan](https://dca.georgia.gov/document/plans/plan-update-2020-3/download); Nantucket’s consolidated charter is authorized by [1992 Chapter 328](https://archives.lib.state.ma.us/entities/archivalmaterial/b2817890-da66-4c75-ab2c-375e559f019b).

The builder requires matching states, exact retained 2025 Census land areas and bounding coordinates within 0.001 degrees. Name or area matches alone never establish consolidation. Full consolidated-city records are used for Athens, Augusta, Louisville, Butte and Nashville. Their statistical balances and component municipalities remain separate.

Jacksonville/Duval, Indianapolis/Marion, Kansas City/Wyandotte, Tribune/Greeley, Baton Rouge/East Baton Rouge, Lafayette and Houma/Terrebonne do not have matching whole-county municipal records. Honolulu, Haines, Petersburg and Yakutat have smaller Census places rather than a matching municipal record. These are not merged. Menominee town and county have matching areas but separate governments. New York boroughs, Washington DC and Milford’s city/town relationship are outside the consolidated city-county rule. St. Louis County and similarly named Virginia counties remain separate.

Rebuild with npm run build:us-shared-pages. npm run test:us-shared-pages checks all 66 identities, population, flags, unchanged boundaries, repeated loading, and exclusions. Desktop and phone checks cover both levels, search, saved views, map clicks, and the status disclosure.

County, Louisiana parish, Alaska borough and census-area map labels show their full names when the padded text fits inside the rendered boundary. Otherwise they omit the administrative suffix. Fit uses the current label size, camera and rendered polygons rather than a fixed zoom threshold. Counties sharing a name with an independent city in the same state retain the suffix at every zoom. Page titles, search and source names retain the full name.
