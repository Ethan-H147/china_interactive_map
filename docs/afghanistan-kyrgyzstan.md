# Afghanistan and Kyrgyzstan

Local additions, 18 October 2026. These use the shared country renderer, search, statistics, saved views, population colouring and first-level quizzes. No publication or commit is part of this change.

## Afghanistan

34 provinces. Source: AGCHO/NSIA via OCHA HDX COD-AB v03, CC BY 3.0 IGO. Province geometry was created in May2019, reviewed in June2025 and edited in March2026. Source PCodes AF01–AF34 remain available as aliases and codes; map IDs use AF-01–AF-34. Local province names supplied by the source are Dari (prs), not independently verified Pashto translations.

Population: OCHA's 2026 humanitarian planning estimates, matched by province PCode. These are estimates, not census counts; rounded to people for display. The national figure agrees with the IPC 48.6 million OCHA planning population. HDX's dataset-level population narrative describes older releases; this implementation uses the specifically dated 2026 resource. No GDP figures are invented.

HDX explicitly says the 401-district geometry does not cover the 457 districts designated for2026. That layer is omitted. The flag follows the tricolour convention still used by the UN member-state directory; it is identified in the flag viewer and source notes. The de facto authorities use a different flag.

## Kyrgyzstan

Seven regions and two cities of republican significance: Bishkek and Osh. English, Kyrgyz and Russian labels. Geometry: retained OpenStreetMap relation snapshots (ODbL1.0), with exact relation IDs, source URLs and checksums. These are community boundaries, not an official cadastral survey. They do not fully reflect the 2024 city expansions: Bishkek and Osh outlines are approximate, and adjoining regional edges share that limitation.

Population: National Statistical Committee regional development publication, January–March2026, population at 1 January2026. Exact regional and city counts sum to 7,404,329. Seven regional areas use the publication's rounded total administrative territory, including water. City area and density are omitted because their source outlines do not match the expanded statistical extent. Rounded official open data is retained as a cross-check, not used to invent precise counts.

Second-level audit: the current parent relations yielded 39 of the 40 official rayons, plus incomplete city coverage and outdated names (including Kara-Buura). The 2018 HDX deeper layers also predate reforms and explicitly have partial coverage. Neither incomplete layer is exposed. The official September2025 Jalal-Abad-to-Manas city rename is retained as a source reference; Jalal-Abad Region keeps its name.

## Rendering and verification

Whole shared frontier arcs follow the existing Pakistan/China and Kazakhstan/China outlines. Source overlaps are erased before replacement, and all canonical bends are retained. Unowned landlocked exterior and foreign-enclave edges are drawn continuously. Natural Earth v5.1.2 and retained detailed OSM Song-Kul/Chatyr-Kul water polygons are erased from fills, including Issyk-Kul, Song-Kul, Chatyr-Kul and Toktogul Reservoir. Political administrative lines remain available across water. Detailed fills and country context use the same exact geometry.

Retained compressed sources: `scripts/boundary-sources/afghanistan-kyrgyzstan/`, SHA-256 checked by fetch/build/validation. Build: `npm run build:afghanistan-kyrgyzstan`. Data tests: `npm run test:afghanistan-kyrgyzstan`; browser scenarios: `npm run test:browser:afghanistan-kyrgyzstan`. Local preview: `npm start` (fixed port4174).

Primary references:
- [Afghanistan boundaries](https://data.humdata.org/dataset/cod-ab-afg)
- [Afghanistan population](https://data.humdata.org/dataset/cod-ps-afg)
- [Kyrgyz official regional development,2026](https://stat.gov.kg/media/files/9ea29216-b119-4ac5-a829-fc2980cbf74e.pdf)
- [Kyrgyz official population table](https://www.stat.gov.kg/en/opendata/category/39/)
- [Official Manas rename reference](https://shailoo.gov.kg/ru/npacik/postanovlen/09102025-98/)
- [UN member-state directory](https://www.un.org/en/about-us/member-states)
