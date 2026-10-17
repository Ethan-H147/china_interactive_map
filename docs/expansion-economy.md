# GDP coverage for the country expansion

The seven countries use the existing statistics cards and regional color controller. Figures are nominal GDP at current market prices, with native-currency values and same-year annual-average USD equivalents. GDP and GDP per capita are separate fields; per capita is not income or salary.

| Country | Supported divisions | GDP years in retained sources | Native currency | Primary source |
| --- | --- | --- | --- | --- |
| Germany | 16 states; 400 districts and independent cities | States 2024; districts 2023 | EUR | [Eurostat nama_10r_3gdp](https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table) |
| Belgium | 3 regions; 10 provinces and Brussels equivalent | 2024 | EUR | [Eurostat nama_10r_3gdp](https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table) |
| Netherlands | 12 provinces | 2024 | EUR | [Eurostat nama_10r_3gdp](https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table) |
| Switzerland | 26 cantons | 2022 | CHF | [FSO GDP by canton](https://www.bfs.admin.ch/bfs/en/home/statistics/national-economy/national-accounts/gross-domestic-product-canton.html), tables je-e-04.02.06.01 and .03 |
| United States | 50 states and Washington, DC | 2025 | USD | [BEA SAGDP1, line 3](https://www.bea.gov/data/gdp/gdp-state) |
| Canada | 10 provinces and 3 territories | 2024 | CAD | [Statistics Canada 36-10-0222-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610022201) |
| Mexico | 31 states and Mexico City | 2023 | MXN | [INEGI PIBE](https://www.inegi.org.mx/programas/pibent/2018/), retained official open CSV export |

This provides 564 GDP/GDP-per-capita pairs, including every first-level division. Municipalities and Swiss districts have no GDP in these source tables; their cards do not borrow a parent's economic output. The Swiss workbook and Mexican open CSV export have the older periods listed above; the importer preserves their actual years. Source provisional flags remain visible.

For Europe, GDP per capita comes directly from Eurostat or FSO. For the US, Canada and Mexico, it divides annual GDP by that same year's July 1 population: Census Bureau state estimates, Statistics Canada quarterly estimates, and CONAPO midyear projections respectively. Each calculated figure stores its population value, year, date and source. Existing population cards keep their own stated reference dates.

Conversions use Eurostat annual average EUR exchange rates (ert_bil_eur_a). For non-EUR currencies, local currency per USD is local currency per EUR divided by USD per EUR. No purchasing-power-standard series is mixed into nominal GDP. Mexican GDP selects B.1bP at current prices, including net product taxes, rather than the archive's real GDP or GVA rows. BEA uses the annual current-dollar series, not annualized quarters.

Retained, reviewable extracts and raw-source SHA-256 hashes are in scripts/statistics-sources/expansion-economy. Raw archives stay in the ignored artifacts/economy-source cache. `npm run build:expansion-economy` reapplies retained figures and rebuilds color data without network access. `node --max-old-space-size=6000 scripts/prepare-expansion-economy.mjs --refresh` deliberately updates upstream extracts; review source years, entity coverage and anchor checks when upgrading. Geometry rebuilds call the importer so GDP is restored after base statistics are regenerated.

Run `npm run test:expansion-economy`, `npm run test:region-colors` and `npm run test:browser -- expansion-economy`. Tests cover all divisions, currency and scale, correct per-capita denominators, years, independent GDP anchors, unsupported municipal coverage, economy-card rendering, both economic shading controls and saved views.

The US catalogue also contains fourteen overseas territories. The state/DC GDP extract covers 51 units; territory cards and shading leave GDP missing rather than inheriting a state or national total. See [US territories](us-territories.md).
