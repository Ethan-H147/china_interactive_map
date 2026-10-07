# Argentine provincial statistics

Snapshot verified 7 October 2026. This directory retains the public source spreadsheets, Buenos Aires CSV, World Bank exchange rates, and compact extracted tables with original source URLs and SHA-256 hashes. PDF originals and exploratory HTML are ignored by Git and never shipped to browsers.

- INDEC: census-2022-based population projections, 1 July 2026 for the visible count; 2024/2025 for per-capita calculations. Tables 2.2–2.25, printed pages 33–149. Provincial totals sum to 46,466,688.
- IGN: 2022 geodetic surface-area report, Table 12, PDF page 26. Tierra del Fuego uses the continental Americas sector (20,698.3 km²).
- CEPAL: March 2026 release, VABpb worksheet, 2024 column W. Millions of **constant 2004 ARS**, basic prices. All 24 jurisdictions. These are harmonized estimates, not provincial nominal GDP.
- Provincial agencies: current-price accounts for CABA, Buenos Aires Province, Corrientes, Entre Ríos, Jujuy, Tucumán, Santa Fe and Tierra del Fuego. Exact cells/pages, source units and preliminary status are recorded in tables.json. Basic-price totals exclude net product taxes; Buenos Aires Province and Tucumán market-price totals include them.
- World Bank / IMF IFS: annual average **official** ARS per USD for the economic metric’s year; no parallel-market rate or PPP conversion.

## Reproduce

1. Run node scripts/fetch-argentina-statistics.mjs from the project root to obtain missing original PDFs. Cached sources are retained when their hashes match. Use --refresh only for an intentional source refresh.
2. With pypdf and openpyxl installed, run python scripts/extract-argentina-statistics.py. It checks headers, units, population totals and source hashes, and retains compact evidence in tables.json.
3. Run npm run build:argentina-statistics and npm run test:argentina-statistics. The website build requires only Node.js and the retained compact extraction.

Do not apply a current exchange rate to constant-price output. Do not divide older PBG by the visible 2026 population. IPEC Santa Fe’s published 2025 per-capita value is retained with its own denominator; other provincial per-capita values are calculated using matching-year INDEC projections. No provincial totals belong to departments, partidos or comunas.
