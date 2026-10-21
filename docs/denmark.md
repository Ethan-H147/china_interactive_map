# Denmark and the North Atlantic territories

Added on 17 October 2026. Denmark uses the shared European country renderer, country registry, two-level hierarchy, statistics cards, label languages, color scales and flag viewer.

Denmark has five regions and 98 municipalities. Christiansø is a separate state-administered area, not an invented municipality or part of a region. The 2027 regional merger is not applied early. DAGI's July 2026 municipal interior geography matches the detailed parish layer; the retained GISCO national silhouette preserves the existing coast and German frontier. Parent fills and interior borders are built from one cleaned municipal topology; unselected coasts have no stroke.

Greenland and the Faroe Islands are mapped as self-governing territories under Denmark. Clicking either opens Denmark with that territory selected and fits its own bounds, using the same shared context-entry path as US, UK and French territories. Denmark's ordinary home button still frames European Denmark.

Greenland has its five municipalities and the Northeast Greenland National Park. The pinned 2020 geoBoundaries release supplies their geometry; it does not represent a new 2026 cadastral survey. The park has no separately assigned resident population. Seventeen inhabited towns use official NunaGIS points and Statistics Greenland's July 2026 locality populations. Faroese municipality geometry comes from Umhvørvisstovan's official May 2026 service and is retained as a gzip snapshot for reproducible builds. All 29 municipalities have January 2026 population counts.

Population sources:
- Statistics Denmark FOLK1A, 1 July 2026. The Capital Region's statistical total is reduced by separately mapped Christiansø, preventing double counting.
- Statistics Greenland BEESTM2/BEESTM4, 1 July 2026.
- Statistics Faroe Islands IB01070 population measure, 1 January 2026.

GDP and GDP per capita:
- Five Danish regions: Eurostat NUTS 2, 2024, nominal GDP in DKK. Eurostat EUR per-capita values are converted to DKK using the matching annual rate.
- Greenland: Statistics Greenland NRE10, 2023.
- Faroe Islands: Statistics Faroe Islands TB02010/TB02015, 2025.
- Each source retains its own published per-capita population basis. No municipal GDP is extrapolated. USD equivalents use the same year's Eurostat annual exchange rates.

Denmark, Greenland and Faroese flag originals, dimensions, source links and lossless territory thumbnails use the shared flag catalogue. No unofficial historical regional banners are introduced.

Germany keeps ownership of the existing shared German–Danish border, so adding Denmark cannot double the stroke. Source geography and the international reference retain their recorded source vintages.

Run `npm run build:denmark` for a reproducible country rebuild and `npm run test:denmark` for data checks. `node scripts/browser/run.mjs denmark` covers public entry, Copenhagen, Nuuk, phone layouts, shared links, territorial clicks and flags.

## Germany–Denmark border correction, 19 October 2026

The former border builder grouped Natural Earth land and water segments together. The presence of any water segment made the entire pair use the coarse reference line, which crossed Flensburg and disagreed with both countries’ subdivisions. The repair uses the exact common GISCO municipal land edge, already identical on both sides, and separate official BKG VG25 international boundary lines through the North Sea and Flensburg Fjord. The land/sea joins meet the displayed coast exactly; their positions are within 10 metres of BKG’s reference. The fill polygons and city boundaries do not need moving. Germany remains the only owner of the shared stroke.

BKG VG25 is credited under CC BY 4.0. Its WFS response, query URL and SHA-256 pin are retained in `scripts/boundary-sources/germany-denmark/`; official documentation is at [BKG’s VG25 service](https://gdz.bkg.bund.de/index.php/default/wfs-verwaltungsgebiete-1-25-000-stand-31-12-wfs-vg25.html). This remains a generalised atlas, not a cadastral map.

Ordinary German country rebuilds preserve this correction. `npm run build:germany-denmark-border` reapplies only the border and refreshes its compact browser copy. `npm run test:germany-denmark-border` verifies every administrative level, a continuous shoreline join, the official reference and a 20-metre sampling check that the line never crosses Flensburg’s interior. `npm run test:browser:germany-denmark-border` checks the visible stroke from Germany, Denmark and another country, on desktop and phone.

## Parish detail

See [Nordic local subdivisions](nordic-local-areas.md) for the DAGI parish layer, cross-municipal navigation, source coverage and two-button drill-down.
