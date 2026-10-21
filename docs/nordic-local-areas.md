# Nordic local subdivisions

The map keeps two top-level buttons. Unlock the level control and select a municipality to open its local areas. Locking the municipal level leaves local geometry unloaded. Search and saved views can restore a local selection. Each local geometry file covers one municipality; national local-boundary downloads are not used at runtime.

| Country | Added local layer | Coverage |
| --- | --- | --- |
| Norway | 1,547 named statistical areas (delområder) | All 357 mainland municipalities |
| Sweden | 3,363 named regional statistical areas (RegSO 2025) | All 290 municipalities |
| Denmark | 2,096 parishes with municipal navigation | All 98 municipalities; Greenland and Faroese municipal maps remain unchanged |
| Finland | 115 city districts | Helsinki's 59 land districts and Espoo's 56 districts |
| Iceland | 10 city districts | Reykjavík |

These are labelled by their real type. Norway and Sweden's statistical areas do not have separate municipal governments. Denmark's parishes are ecclesiastical units and can cross municipal boundaries. Such parishes retain one identity and their complete mapped land geometry in each relevant municipal chunk. Primary navigation uses the largest land overlap against matching DAGI municipal boundaries; additional overlaps larger than 0.01 km² are recorded for navigation. Ordinary parish strokes stop at the explored municipal boundary. This is a spatial navigation crosswalk, not an assertion that parish and municipality boundaries coincide.

Christiansø is already a separately mapped state-administered area without a municipality parent; its parish is not forced into a third-level municipal hierarchy. Helsinki's territorial-sea feature (Aluemeri) is not rendered as land. No subdivisions are invented for other Finnish or Icelandic municipalities, or for the Norwegian dependencies.

Population and economic facts are preserved. Denmark now uses matching DAGI municipal interior geometry and dissolves regions from it; the previous GISCO overview outlines were too coarse for parish detail. Christiansø, Greenland and the Faroe Islands retain their existing geometry. Local cards report mapped land area. Population and output are not estimated for the new areas.

## Sources and geometry

Snapshots, download URLs, licences, vintages and SHA-256 pins are retained in scripts/boundary-sources/nordic-local/manifest.json. GeoJSON transport timestamps are omitted before hashing; source geometry and feature properties are retained. The Norwegian archive is a hash-pinned download cache, restored by fetch:nordic-local. Other source snapshots are retained as gzip files.

- [Kartverket basic statistical units](https://data.norge.no/en/data-services/1ea0781b-e7ab-3106-a186-3aa9af106187/statistiske-enheter-grunnkretser-wfs): December 2025 geometry, CC BY 4.0. The 14,126 basic units are dissolved using the official eight-digit delområde code: first six digits plus 00. All 1,547 resulting areas have names in [SSB classification 1, version 3306](https://data.ssb.no/api/klass/v1/versions/3306.json?language=nb), dated 2026. Unknown statistical placeholders and Svalbard without mainland geometry are excluded.
- [SCB RegSO 2025](https://www.scb.se/vara-tjanster/oppna-data/oppna-geodata/regso/): version 2025_v2, reference date 1 January 2025, SCB CC0. Municipality codes match all existing Swedish municipality identities.
- Danish DAGI 1:10,000 parish boundaries, republished by [Skive municipality](https://geodata.skivekommune.dk/server/rest/services/GeoFokus_Data/Administrative_graenser/FeatureServer/10). The source includes July 2026 updates. [Official DAGI licence metadata](https://arealdata-api.miljoeportal.dk/datasets/urn:dmp:ds:sognegraenser-dagi-1-10-000) identifies Klimadatastyrelsen and CC BY 4.0. All 2,097 source parishes are retained in the snapshots.
- [Helsinki city districts](https://hri.fi/data/dataset/helsingin-piirijako), published in the city WFS on 20 October 2026, and [Espoo city districts](https://hri.fi/data/fi/dataset/espoon-aluejaot), retrieved 21 October 2026: CC BY 4.0. Finnish and Swedish names are retained.
- [Reykjavík/LUKR city districts](https://lukrgatt.reykjavik.is/server/rest/services/OpinGognMorkSkiptingar/Stjornsysluskipting/FeatureServer/info/iteminfo?f=pjson): the city permits reuse respecting moral rights and asks users to follow changes.

Shared local topology is simplified by 0.00003 degrees (about three metres north–south), then clipped to municipality land. The existing national land silhouette stays unchanged. Small source/coastline differences keep the municipality backdrop rather than creating invented local regions.

Sweden's local layer uses the original GISCO municipality outline and detailed water masks for Mälaren, Storsjön, Vänern and Vättern. The previous coarse lake mask removed real urban districts and lake islands. The new masks retain island holes and restore all 3,363 RegSO. Their exact [OpenStreetMap](https://www.openstreetmap.org/copyright) relation responses and versions are retained, with © OpenStreetMap contributors / ODbL attribution. Other existing lake masks are preserved. The administrative areas remain SCB data.

Per-country local-areas.json records original geometry hashes, original statistics hash, source and mapped counts, omissions and chunk budgets. No new runtime rendering engine is introduced.

## Rebuild and validation

Run npm run fetch:nordic-local, then npm run build:nordic-local. The Nordic, Danish and European rebuild commands reapply the corresponding local supplement after rebuilding their base country data. Existing sources for the original Nordic maps are also required for Sweden's land mask.

npm run test:nordic-local checks official identities and names, all geometry chunks and their byte accounting, complete searchable coverage, land label anchors, shared cross-municipal geometry, overlap samples, recorded base geometry and preservation of original facts, and local download budgets. Browser scenarios cover desktop and a 1024 × 909 touch viewport: two buttons, locked municipalities, lazy loading, local search, visible selection, saved views and returning to the municipal level.

## Denmark alignment audit, 21 October 2026

The initial Danish supplement mixed detailed DAGI parishes with generalised GISCO municipalities, creating 869 apparent cross-municipal parishes and parallel boundary strokes. Matching [DAGI municipality geometry](https://geodata.skivekommune.dk/server/rest/services/GeoFokus_Data/Administrative_graenser/FeatureServer/2) reduces the observed crossings to 27. Christianshede belongs only to Ikast-Brande. The source municipalities and parishes enter one topology before simplification. The existing country silhouette and coastal fallback preserve the German frontier; source snapshots and hashes pin both inputs.

Coincident regional, municipal and parish strokes carry their highest administrative owner. The renderer draws that stroke once, and restores the lower-level stroke if the owning outline is unchecked. Danish ordinary and selected lines use the same 0.125-pixel source tolerance. Normal parish strokes are clipped to the municipality being explored; authentic cross-municipal parishes retain one full identity and full selection geometry. No administrative units or statistics are fabricated.

`npm run test:denmark-local` checks all 98 municipalities and all 2,096 mapped parishes, national and regional coverage, same-level overlaps, every parish-line segment against its municipality, cross-municipal identities and unchanged published facts. `node scripts/browser/run.mjs denmark-local` loads and captures all 98 municipal views, plus Christianshede at overview and close zoom on desktop and tablet, independent outline toggles and a real cross-municipal parish.
