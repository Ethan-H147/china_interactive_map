# Canadian municipalities, population and flags

The local atlas includes all 13 provinces and territories, 293 census divisions and 5,161 census subdivisions from the 2021 census geography. Census subdivisions include cities, towns, townships and rural municipalities, along with Indigenous territories and statistical or unorganized units. The interface retains their actual published types rather than calling every unit a city.

## Population and geographic identity

Statistics Canada table 17-10-0155-01 supplies July 1, 2025 population estimates on 2021 boundaries. Exact seven-digit CSD codes join 5,155 published values; six unavailable unorganized-area estimates remain unavailable. The source's 2021 boundary reference appears beside each local population card. Post-2021 municipal amalgamations are not substituted into an older population geography.

Census divisions receive a sum only when every component estimate is published. Their cards describe that method. Census land areas come from table 98-10-0004-01; a mapped area is labeled as such if no positive reported land area exists. Provincial population and GDP cards retain their independently sourced periods. No municipality or census division inherits provincial GDP.

The source service contains inconsistent parent columns. Hierarchy instead uses the Statistics Canada code structure: two digits for province/territory, four for division and seven for subdivision. Toronto therefore belongs to Toronto division, not the mirror's erroneous Durham field. Existing province route identifiers remain compatible, including the atlas's legacy CA-QB key for Quebec.

The flag ranking covers the largest 500 eligible municipal and self-governing CSDs. It excludes unorganized/statistical subdivisions, New Brunswick's statistical parishes, reserve parcels and special-purpose areas. Lloydminster's Alberta and Saskatchewan portions remain separate, explicitly named census units with their own published population; they must not be mistaken for two whole-city totals. The cutoff is 8,692 residents. The ranked list is retained in municipalities/top500.json.

## Boundaries and performance

Original Statistics Canada cartographic geometry is retained from the federal Agriculture and Agri-Food Canada mirror, with source URLs and SHA-256 hashes. The importer restores enclosed, oppositely wound rings that the service emits as separate polygons to their proper hole positions. Islands outside those rings remain intact. Winding and containment govern this normalization, without city-specific coordinate patches.

One national topology is built before simplification, so the same vertices survive on both sides of interprovincial as well as local borders. Douglas-Peucker detail varies with the source unit's area: .00015 degrees for units up to 20 km², .0005 up to 2,000 km² and .003 for larger units. A shared arc retains the more detailed neighbor's requirement. Polygon survival is protected. Provinces and census divisions dissolve from these exact municipal shapes.

Shared internal borders draw once; coastlines are outlined on selection. Detailed geometry loads only for the selected province and census division. No nationwide municipal geometry bundle is requested. Selected outlines reuse byte slices of the polygon blob. Superseded work is canceled and the existing three-country residency cap applies.

The shared regional renderer simplifies selected coastline and lake strokes within 0.35 screen pixels at each tile zoom. Tiny rings fade in over a 12–32 pixel projected footprint; narrow rings also account for their projected area. The original polygons and all ring vertices remain available up close. Zooming reuses the same sources without fetching or retaining extra geometry tiers. This policy also applies to the US and other countries using the regional renderer.

Island-heavy selections coalesce adjacent polygon byte ranges before handing them to the page. Nunavut's 9,481 parts and the Northwest Territories' 759 parts each require one byte slice, preserving every coordinate and hole. Selection colors use GPU feature state instead of replacing the fill expression and rebuilding every polygon's paint data. These shared-renderer changes apply without territory-specific geometry exceptions.

Local Chrome measurements for the same Nunavut → Northwest Territories → Nunavut sequence reduced Nunavut's camera-start delay from 3.16–3.55 seconds to 0.27–0.30 seconds, and Northwest Territories from 0.86 to 0.09 seconds. Maximum observed frame gaps fell from 2.19–2.69 seconds to under 43 ms for Nunavut. Timings are machine-dependent; the regression tests also enforce the deterministic one-slice and unchanged-geometry invariants.

The national geometry is about 3.9 MB compressed, down from 16.7 MB with uniform fine detail. The largest province's division bundle is about 1.2 MB; the detailed decoded budget is 12 MiB. Source files and build intermediates do not load in the browser.

## Flags

All 500 targets were checked through geographic-ID-matched Wikidata/Wikipedia references and original artwork metadata. Gaps were checked against province-specific Flags of the World references. The retained review records document municipality identity, source artwork, authors, rights and exclusions.

There are 308 sourced local flag images. The other targets remain without added flags where current, suitable artwork could not be verified. Explicitly unofficial designs, stand-alone seals/logos, historical-only pictures and flags belonging to another government are omitted. The City and Township of Langley have distinct images. Quebec cities do not inherit same-name regional county municipality flags. Grand Falls-Windsor's explicitly unofficial logo flag is excluded.

Original files remain unchanged. Local lossless WebP thumbnails load only when their municipality is selected and open the original through the shared flag viewer. Rights labels describe the original source; they do not grant additional permissions. Existing national and provincial flags retain their styling and behavior.

## Rebuild and verification

- npm run build:canada-local — fetch or verify retained boundaries/statistics, prepare the shared topology and build local layers, facts and colors.
- npm run fetch:canada-municipal-flags — restore reviewed originals and thumbnails from pinned sources, respecting Retry-After.
- npm run build:canada-municipal-facts — rebuild compact facts, the original-image catalogue and map colors.
- npm run test:canada-local — counts, geographic codes, populations, legal types, shared borders, search and geometry budgets.
- npm run test:canada-municipal-facts — the exact ranking, flag identities, original hashes, thumbnail proportions and exclusions.
- npm run test:island-selection — original northern polygon/vertex preservation, one slice per territory and safe grouping of repeated IDs.
- npm run measure:canada-navigation — repeat the local territory selection timing sequence.
- node scripts/browser/run.mjs canada-performance — stable selection colors, one-slice selection and unchanged close-up source quality.
- npm run test:outline-detail — actual Great Lakes and Arctic ring visibility, subpixel simplification and exact maximum-zoom geometry.
- node scripts/browser/run.mjs outline-detail — overview/close zoom, retained selection and no geometry downloads or source swaps.
- node scripts/browser/run.mjs canada-local — desktop/phone search, cards, original viewer, deep links, scoped geometry and eviction.

The main country-expansion build retains this Canadian detail. Reviewed flag source files and compressed population/area snapshots support rebuilding without repeating exploratory research. No publishing is part of this update.

Preview: http://127.0.0.1:4174/?preview=canada-municipalities#canada

Sources:
- https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501
- https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000401
- https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/introduction
- https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/tablef
- https://services.arcgis.com/lGOekm0RsNxYnT3j/ArcGIS/rest/services/Statistics_Canada_2021_census_boundaries/FeatureServer
