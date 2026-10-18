# Ireland, Portugal and the Dutch Caribbean

Added locally on 18 October 2026. No publishing is part of this update.

## Coverage

- **Ireland:** three regional assembly areas, all 31 county/city authorities, and all 100 municipal, borough and metropolitan districts. Dublin-area councils and the standalone Cork/Galway cities have no invented lower tier. Northern Ireland remains in the UK page. Ireland has no overseas territories.
- **Portugal:** 18 mainland districts, the Azores and Madeira autonomous regions, all 308 municipalities and all 3,258 legal civil parishes. The CAOP parish layer also contains a statistical equivalent for Corvo; Corvo is a terminal municipality, because it has no legal parish. The islands include all nine Azores islands, Porto Santo, Desertas and Selvagens within their official municipalities.
- **Netherlands:** all six Caribbean jurisdictions are added to the existing twelve provinces and 342 European municipalities. Aruba, Curaçao and Sint Maarten are constituent countries of the Kingdom; Bonaire, Sint Eustatius and Saba are public bodies within the country of the Netherlands. No province or municipal hierarchy is invented for them.

Clicks on an overseas island enter its parent country page while framing the clicked island group. This also works for small Portuguese offshore islands. Geographic entry clusters are separate from administrative identity; they do not create extra subdivisions or duplicate population.

## Sources and data processing

Ireland uses Tailte Éireann's ungeneralised 2026 national statutory boundaries and the Department of Housing's regional assembly membership. Portugal uses DGT's full CAOP2025 GeoPackages for the mainland, the Azores' two coordinate zones, and Madeira. Their own WKT projection definitions are converted before projection to WGS84. A strict GeoPackage binary reader checks dimensions, rings and complete geometry consumption. The Dutch islands use exact OSM administrative relations, clipped to directed coastline land polygons. Sint Eustatius' query excludes neighbouring Saint Kitts coastlines. Sint Maarten's **administrative envelope is reconciled before land clipping**, so its lagoon shores cannot be pulled onto its legal land frontier.

Parents dissolve from a single detailed local topology. Shared interior edges are stored once, and unselected coasts have no ordinary outline. New international edges follow the previously mapped neighbour's canonical frontier (UK, Spain or France). The alignment is limited to complete source frontier arcs; nearby coasts are not candidates. Close-up source detail remains, with the shared subpixel tile allowance and adaptive selected outlines. Country previews are separate lightweight data.

`build-regional-dataset.mjs` now handles per-parent third-level chunks as well as second-level chunks. The runtime remains `regional-country.mjs`: no separate country renderer, hover handler or cache. County/municipal chunks and parish/district chunks load on demand. The existing three-country residency cap applies.

## Statistics and flags

Ireland's council populations use Census 2022. Cork County's separately published population is retained from the CSO joint census release; Cork City is the combined FY003B Cork total minus that county count. The 31 authorities sum to the published state population of 5,149,139. No district population is extrapolated. Regional GDP and GDP per capita are Eurostat's published pairs for the three assembly/NUTS-2 areas.

Reported Portuguese areas are administrative areas, which may include water within a jurisdiction; they are not labelled as independently measured dry-land area. Ireland's geometric area is labelled mapped area.

Portugal's municipality populations sum the official GISCO 2024 LAU populations by municipality code. They remain labelled 2024; they are not redistributed to parishes restored in 2025. GDP and GDP per capita are included for the Azores and Madeira. Mainland NUTS GDP is not mislabeled as district GDP.

The Dutch public bodies use CBS resident population at 1 January 2026, and published same-year GDP/per-capita pairs from CBS tables 84789ENG and 85251ENG. The three Caribbean constituent countries use World Bank WDI population and current-price GDP series. Each card retains its own reference year. USD-native values are not converted again; Eurostat EUR values use the matching year's annual-average USD rate.

Ireland and Portugal's national flags, Azores/Madeira flags, and all six Dutch island flags retain source/licence metadata and original SVG artwork. They use the existing thumbnails and original-flag viewer. The Netherlands' existing provincial and city flags are preserved. Unverified Irish county sporting flags are not presented as official civic flags.

## Rebuilds and checks

- `npm run build:atlantic` fetches or checks pinned boundary inputs, then rebuilds the new country data, applies the Dutch islands, prepares focused entry and flags, and refreshes world silhouettes, compact previews and metric colors.
- `npm run fetch:atlantic` validates/downloads the main official boundary inputs and Dutch coastline queries. Auxiliary reviewed statistics, legal-status extracts and flag metadata are retained under `scripts/boundary-sources/atlantic/`; preserve these pinned snapshots. The original large CAOP ZIP archives are an ignored download cache; their URLs, byte lengths and SHA-256 hashes remain in the tracked source manifest. A clean rebuild downloads and verifies them rather than putting large duplicate archives into Git.
- `npm run test:atlantic` checks administrative identities, every lazy chunk, label points on land, border ownership, all island groups, population/GDP periods and units, flags, and retained source hashes.
- `npm run test:atlantic-browser` checks real desktop and phone navigation, lazy local selection, flags, saved views, remote map clicks and the three-country cap.

Ordinary Netherlands expansion rebuilds apply the retained Caribbean addition. European GDP refreshes leave the separately sourced island economies intact. Coverage expansion does not change the Netherlands' original addition date.

## Primary references

- [Tailte Éireann 2026 local authorities](https://data.gov.ie/dataset/local-authorities-national-statutory-boundaries-ungeneralised-20261)
- [Tailte Éireann 2026 municipal districts](https://data.gov.ie/ga/dataset/municipal-districts-national-statutory-boundaries-ungeneralised-20261)
- [DGT CAOP2025](https://www.dgterritorio.gov.pt/atividades/cartografia/cartografia-tematica/caop?language=pt)
- [Corvo's official council record describing its parish exception](https://www.cm-corvo.pt/wp-content/uploads/2026/01/ata-de-18-de-Dezembro-2025.pdf)
- [Kingdom of the Netherlands constitutional structure](https://www.royal-house.nl/topics/legislation/charter-for-the-kingdom-of-the-netherlands)
- [CSO FY003B](https://data.cso.ie/table/FY003B)
- [CSO joint census population publication](https://www.cso.ie/en/releasesandpublications/ep/p-cpini/irelandandnorthernireland-ajointcensuspublication2021-2022/populationandage/)
- [Eurostat GDP](https://ec.europa.eu/eurostat/databrowser/view/nama_10r_2gdp/default/table)
- [CBS Caribbean population, 2026](https://www.cbs.nl/en-gb/news/2026/22/population-of-the-caribbean-netherlands-up-by-over-1-2-thousand-in-2025)

Local previews: [Ireland](http://127.0.0.1:4174/?preview=atlantic#ireland), [Portugal](http://127.0.0.1:4174/?preview=atlantic#portugal), [Netherlands](http://127.0.0.1:4174/?preview=atlantic#netherlands). Hard-refresh existing tabs with Ctrl+Shift+R.
