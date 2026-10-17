# Denmark and the North Atlantic territories

Added on 17 October 2026. Denmark uses the shared European country renderer, country registry, two-level hierarchy, statistics cards, label languages, color scales and flag viewer.

Denmark has five regions and 98 municipalities. Christiansø is a separate state-administered area, not an invented municipality or part of a region. The 2027 regional merger is not applied early. GISCO's 2024 LAU geography matches the other newly added European countries. Parent fills and interior borders are built from one cleaned municipal topology; unselected coasts have no stroke.

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
