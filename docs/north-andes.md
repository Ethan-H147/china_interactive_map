# Ecuador, Venezuela and Colombia

The three country pages share the atlas regional renderer, search, first-level map and naming quizzes, dated statistics cards, population shading, original national flag viewer and saved selection links. Local polygons load by selected parent.

| Country | Retained administrative reference | Population reference |
| --- | --- | --- |
| Ecuador | OCHA/INEC 2024: 24 provinces, 221 cantons, 1,042 parish reference areas, including Galápagos | INEC 2022 census, table 1.2; national total 16,938,986 |
| Venezuela | OCHA 2021: 23 states, Capital District, Federal Dependencies; 335 municipalities plus a dependencies equivalent; 1,134 parishes plus a dependencies equivalent | INE/UNFPA/OCHA 2011 enumerated census; no inferred parish or dependencies population |
| Colombia | DANE/IGAC/OCHA 2020 geometry: 32 departments and Bogotá; 1,122 municipal, district and non-municipal reference areas | DANE/OCHA 2025 population projections |

Administrative reference dates and statistical dates are independent. Later administrative changes are not assigned old polygon shapes. Bogotá remains separate from Cundinamarca. Distrito Capital covers Libertador; metropolitan Caracas also includes Miranda. Venezuela's Essequibo claim is documented without assigning Guyana-administered territory to a Venezuelan state. Remote island destinations retain their own camera bounds.

Colombian departmental GDP and GDP per person use DANE's 2025 preliminary current-price tables. Total GDP is reported in billions of Colombian pesos and converted with the World Bank/IMF 2025 annual average of 4,053.13583333333 COP/USD. These values are not assigned to municipalities. Ecuador and Venezuela have no invented regional GDP.

## Reproducible inputs

`scripts/boundary-sources/north-andes/manifest.json` records original URLs, attribution, reference dates, processing and SHA-256 checksums. Retained source bytes are compressed individually. Original national SVGs are unchanged in the viewer. Ecuador's original INEC population ZIP is retained from a public mirror because the official download endpoint refused automated retrieval; the original table attribution and national total are checked.

Boundary ZIP preparation uses `scripts/prepare-north-andes-sources.mjs`. The large Ecuador archive is read with validated HTTP byte ranges, omitting census sectors unrelated to the administrative map. Colombia and Venezuela archives are cached outside the tracked source tree. Cleaned source polygons use a two metre simplification tolerance and six decimal coordinates. Parent geometry is dissolved from the same local topology.

Complete shared border arcs are selected from a single displayed administrative outline. Existing Peru and Brazil outlines take priority. All three new local hierarchies follow those canonical arcs. Shared junctions use common coordinates. Lake surfaces are excluded from fills; lake shores have no selected-outline stroke. International strokes are stored once, independently of which country is open.

Commands:

```text
npm run fetch:north-andes
npm run build:north-andes
node --max-old-space-size=12000 scripts/build-world-land.mjs
node scripts/refresh-compact-copies.mjs
npm run test:north-andes
node scripts/browser/run.mjs north-andes
```

The build can resume from a locally cached aligned geometry with `node scripts/build-north-andes.mjs --resume`. Runtime asset compression refreshes preserve authoritative geometry; they do not rerun unrelated country repairs.

Peru's older gray Ecuador and Colombia neighbour fills are removed when these full country maps are built. Regional neighbour layers also exclude the active country and territories replaced by an active historical snapshot, so stale supplemental geometry cannot draw beneath that country's own map.
