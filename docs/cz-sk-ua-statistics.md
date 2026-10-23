# Czech, Slovak and Ukrainian regional statistics

The initial Czech and Slovak maps contained administrative area only, and all three country declarations disabled regional economic shading. Population and regional GDP are now connected to the shared cards, comparison table and colour controls.

| Country | Population | Regional economy |
| --- | --- | --- |
| Czechia | ČSÚ, 1 January 2025: all 6,258 local polygons, including four military areas with reported zero residents. District and region totals sum these counts and are checked against ČSÚ's independently published corrected totals. The 205 ORP areas also have published population. | Eurostat NUTS 3, 2024 nominal GDP and GDP per capita, all 14 regions. |
| Slovakia | Eurostat GISCO validated LAU reference, 1 January 2024: all 2,927 local areas, including boroughs and military territories. District and region totals sum the constituent local counts. Bratislava and Košice whole-city totals count each borough once. | Eurostat NUTS 3, 2024 nominal GDP and GDP per capita, all eight regions. |
| Ukraine | Existing State Statistics Service estimates at 1 January 2022 are preserved. | State Statistics Service revised 2021 regional accounts: all 24 oblasts and Kyiv city. Crimea and Sevastopol have no 2021 figures in this source; none are invented. Donetsk and Luhansk values exclude occupied portions, as stated in the source footnote. The figures describe historical pre-invasion economic activity, not current wartime conditions. |

GDP per capita uses each provider's published measure rather than dividing by a later population count. Regional GDP is not assigned to districts, municipalities, boroughs or raions. Alternative ORP/whole-city statistics retain a thematic marker so overlapping units do not enter the ordinary district comparison scale. Ukraine's existing separately dated World Bank national figures remain independent of regional accounts.

The retained inputs and their SHA-256 hashes are in `scripts/statistics-sources/cz-sk-ua/manifest.json`. Original Czech workbooks and the Ukrainian ZIP are retained. The revised Ukrainian workbook is selected by its filename, rather than the archive directory name, to avoid accidentally importing the older 2004–2019 table. Both monetary columns and the 2021 headings are checked, and the 25 regional GDP totals must sum to the published UAH 5,450,849 million. `extract-ukraine-regional-gdp.py` reproduces all workbook cells using xlrd 2.0.2; ordinary builds use its pinned JSON extract and need no new dependency. The Slovak extract retains only properties from the existing pinned whole-Europe GISCO release.

Annual currency conversions match the GDP year: Eurostat's USD per EUR average for 2024, and the World Bank/IMF IFS UAH per USD average for 2021. Source currency and dates remain on the cards; comparison data uses documented USD equivalents.

Reproduce with:

```text
node scripts/fetch-cz-sk-ua-statistics.mjs
node scripts/prepare-cz-sk-ua-statistics.mjs
node scripts/prepare-region-colors.mjs czechia slovakia ukraine
node scripts/validate-cz-sk-ua-statistics.mjs
node scripts/browser/run.mjs cz-sk-ua-statistics
```

The Czech/Slovak and Ukrainian geography builders also call the statistics preparation step, so rebuilding boundaries preserves this coverage.

Sources: [ČSÚ population publication](https://csu.gov.cz/produkty/population-of-municipalities-t4l3n8d2iw), [GISCO LAU data](https://gisco-services.ec.europa.eu/distribution/v2/lau/), [Eurostat regional GDP](https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table), [Ukrainian regional accounts](https://stat.gov.ua/en/datasets/regional-accounts).
