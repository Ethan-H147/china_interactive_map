# Nordic local subdivisions

The map keeps two top-level buttons. Unlock the level control and select a municipality to open its local areas. Locking the municipal level leaves local geometry unloaded. Search and saved views can restore a local selection. Each local geometry file covers one municipality; national local-boundary downloads are not used at runtime.

| Country | Added local layer | Coverage |
| --- | --- | --- |
| Norway | 1,547 named statistical areas (delområder) | All 357 mainland municipalities |
| Sweden | 3,363 named regional statistical areas (RegSO 2025) | All 290 municipalities |
| Finland | 115 city districts | Helsinki's 59 land districts and Espoo's 56 districts |
| Iceland | 10 city districts | Reykjavík |

These are labelled by their real type. Norway and Sweden's statistical areas do not have separate municipal governments.

Helsinki's territorial-sea feature (Aluemeri) is not rendered as land. No subdivisions are invented for other Finnish or Icelandic municipalities, or for the Norwegian dependencies.

Existing first- and second-level geometry, population and economic facts are preserved. Local cards report mapped land area. Population and output are not estimated for the new areas.

## Sources and geometry

Snapshots, download URLs, licences, vintages and SHA-256 pins are retained in scripts/boundary-sources/nordic-local/manifest.json. GeoJSON transport timestamps are omitted before hashing; source geometry and feature properties are retained. The Norwegian archive is a hash-pinned download cache, restored by fetch:nordic-local. Other source snapshots are retained as gzip files.

- [Kartverket basic statistical units](https://data.norge.no/en/data-services/1ea0781b-e7ab-3106-a186-3aa9af106187/statistiske-enheter-grunnkretser-wfs): December 2025 geometry, CC BY 4.0. The 14,126 basic units are dissolved using the official eight-digit delområde code: first six digits plus 00. All 1,547 resulting areas have names in [SSB classification 1, version 3306](https://data.ssb.no/api/klass/v1/versions/3306.json?language=nb), dated 2026. Unknown statistical placeholders and Svalbard without mainland geometry are excluded.
- [SCB RegSO 2025](https://www.scb.se/vara-tjanster/oppna-data/oppna-geodata/regso/): version 2025_v2, reference date 1 January 2025, SCB CC0. Municipality codes match all existing Swedish municipality identities.
- [Helsinki city districts](https://hri.fi/data/dataset/helsingin-piirijako), published in the city WFS on 20 October 2026, and [Espoo city districts](https://hri.fi/data/fi/dataset/espoon-aluejaot), retrieved 21 October 2026: CC BY 4.0. Finnish and Swedish names are retained.
- [Reykjavík/LUKR city districts](https://lukrgatt.reykjavik.is/server/rest/services/OpinGognMorkSkiptingar/Stjornsysluskipting/FeatureServer/info/iteminfo?f=pjson): the city permits reuse respecting moral rights and asks users to follow changes.

Shared local topology is simplified by 0.00003 degrees (about three metres north–south), then clipped to municipality land. The existing national land silhouette stays unchanged. Small source/coastline differences keep the municipality backdrop rather than creating invented local regions.

Sweden's local layer uses the original GISCO municipality outline and detailed water masks for Mälaren, Storsjön, Vänern and Vättern. The previous coarse lake mask removed real urban districts and lake islands. The new masks retain island holes and restore all 3,363 RegSO. Their exact [OpenStreetMap](https://www.openstreetmap.org/copyright) relation responses and versions are retained, with © OpenStreetMap contributors / ODbL attribution. Other existing lake masks are preserved. The administrative areas remain SCB data.

Per-country local-areas.json records original geometry hashes, original statistics hash, source and mapped counts, omissions and chunk budgets. No new runtime rendering engine is introduced.

## Rebuild and validation

Run npm run fetch:nordic-local, then npm run build:nordic-local. The Nordic and European rebuild commands reapply the corresponding local supplement after rebuilding their base country data. Existing sources for the original Nordic maps are also required for Sweden's land mask.

npm run test:nordic-local checks official identities and names, all geometry chunks and their byte accounting, complete searchable coverage, land label anchors, shared cross-municipal geometry, overlap samples, recorded base geometry and preservation of original facts, and local download budgets. Browser scenarios cover desktop and a 1024 × 909 touch viewport: two buttons, locked municipalities, lazy loading, local search, visible selection, saved views and returning to the municipal level.

Denmark was restored to its pre-parish state at the user's request. It retains regions, municipalities and the North Atlantic territories; parish geometry, search records and rebuild hooks are removed. Other Nordic local layers remain available.
