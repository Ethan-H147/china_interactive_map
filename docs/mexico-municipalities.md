# Mexico municipalities and boroughs

Mexico has two map levels: **States & Mexico City** and **Municipalities & boroughs**. The second level contains every municipal key in INEGI's December 2025 vector service: 2,462 municipalities and the 16 Mexico City boroughs (alcaldías), for 2,478 units. All 32 federal entities have a geometry chunk, including Oaxaca's 570 municipalities and Baja California's seven.

The boundary and tabular responses for each federal entity are retained under `scripts/boundary-sources/mexico-municipalities/`. Their key lists must match exactly. The manifest records retrieval date, source URLs, metadata and SHA-256 hashes. These are INEGI statistical reference areas, with their stated December 2025 boundary date, rather than a claim to a newer boundary release.

Municipal polygons are cleaned and simplified together at .0001 degrees, about 11 metres north-south. State shapes are dissolved from the same arcs. Validation requires the exterior segment set of every state's municipalities to match its state polygon exactly. Shared municipal boundaries are drawn once; shorelines receive a stroke only when selected. Existing international-border references and optional water layers remain in use.

Geometry loads one federal entity at a time. The national search catalogue contains names, official five-digit keys, parent names and municipal-seat aliases. Seat names missing from the vector responses are extracted from the retained 2020 census ITER archive using each municipality's official seat code. For example, searching Cancún finds Benito Juárez municipality in Quintana Roo. The city names do not create extra municipal units.

The 2020 census population is available for 2,469 units. Nine newer municipalities have no population in this service: their figures remain unavailable. Local areas are calculated from their mapped geometry. Municipalities do not inherit state GDP. State population and economic data are preserved. Population and density shading includes the municipal level where figures exist.

Rebuild with `npm run build:mexico-municipalities`. The ordinary country-expansion builder also calls this build for Mexico. Run `npm run test:mexico-municipalities` and `npm run test:mexico-municipalities-browser`; existing Mexico water checks cover the separate hydrography overlay. Browser checks cover desktop and phone searches, saved selection, all 16 boroughs, a small Oaxaca municipality, an unavailable census value, municipal-seat aliases and cleanup on country switching.
