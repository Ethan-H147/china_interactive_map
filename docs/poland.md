# Poland

Poland uses the shared regional map, search, bilingual labels, statistics card, flags, saved views, and three quiz modes. It contains all 16 voivodeships, 380 counties and city-counties, and 2,479 gminas. Gminas load per selected county; cities are represented by their administrative polygons. Optional reference markers identify the 18 voivodeship capitals, including both shared-capital pairs.

GUGiK's PRG service supplies the boundaries. Gmina polygons are cleaned and simplified together at two metres; parent polygons are dissolved by exact TERYT codes. Statistics Poland's 2026 territorial workbook supplies population and administrative area at every level. Population totals reconcile across all three tiers to 37,332,510 on 1 January 2026. Administrative area includes water where the published definition does.

GDP is from the September 2026 release of 2024 regional accounts, in current PLN. The Warsaw capital and Mazowiecki regionalny statistical regions are summed for Masovian voivodeship. The published table supplies GDP per capita for the other 15 voivodeships; an unverified whole-Masovian denominator is not substituted. Dollar conversions use the World Bank's 2024 annual exchange rate. All 16 regional flags and the national flag retain artwork, attribution, license, and checksum records.

## Border and water handling

The complete Polish administrative outline supplies the shared borders. Natural Earth identifies each frontier arc; the northern tripoints use the detailed Lithuanian reference. German states, counties and municipalities, Lithuanian subdivisions, and Kaliningrad's land polygons follow those same arcs. Lagoon sections have independent continuous political lines. Germany's separate mainland and Usedom polygons are handled separately.

The complete mapped Vistula Lagoon and both Szczecin Lagoon basins are permanent land masks. A small 0.03158 km² coastal mismatch on the German side of Usedom is assigned to its existing municipality and parents, excluding mapped water. Official PRG marine-water geometry removes the Gulf of Gdańsk and Puck Bay from Polish land fills. Coastal label points are recalculated on land.

Kaliningrad's original district mesh is retained, with only terminals on its former Polish frontier adjusted to the new edge. Pskov/Leningrad and Gdovsky district strokes remain unchanged. The Peipus, Curonian and Khanka water repairs are preserved.

## Local builds and checks

- `npm run build:poland` rebuilds the cached source data, shared borders, water masks, flags, global context and compact assets.
- `npm run test:poland` checks hierarchy, population totals, dated GDP, chunk sizes, source and flag checksums, more than 11,000 gap/overlap probes, and marine-water probes.
- `node scripts/browser/run.mjs 'Poland detailed' 'return: poland'` checks desktop/mobile labels, flags, statistics, languages, saved views, quizzes, the bay, and country switching.
- Existing Baltic, Khanka, German level-lock, world-outline and compact-data checks cover the affected shared map infrastructure.

Source URLs, extraction dates and cached file hashes are in `scripts/boundary-sources/poland/sources.json`. Public map coverage and credits are in `dist/data/europe/poland/sources.json`. This change is local; it does not deploy the atlas or change account data.
