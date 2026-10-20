# Baltic countries

These are present-day country pages under Estonia, Latvia and Lithuania. The Soviet historical snapshot remains separate and suppresses these modern previews while active. All three use the shared Western European sidebar, search, local-name controls, flag viewer, population/area/economy cards, colour modes, first-division quizzes, layer settings and saved-view links. There are no separate duplicate town dots: towns and cities are already part of the subdivision hierarchy.

| Country | Top level | Second level | Third level |
| --- | --- | --- | --- |
| Estonia | 15 counties | 78 municipalities | 4,715 distinct settlement/city-district codes |
| Latvia | 35 municipalities and 7 independent state cities | 586 towns/parishes | — |
| Lithuania | 10 counties | 60 municipalities | 533 mapped elderships |

Estonia's Jõhvi–Toila merger is included. The original Estonian settlement download has 4,717 polygon records; duplicate Ridaküla and Tapa codes are dissolved into one feature per place. Latvia's Varakļāni–Madona merger of 1 July 2025 is included, using the revised Madona code 0038001. Carnikava's later 2026 town/parish split is mapped from current address-register polygons; its separate January 2026 population values are not invented. Six Lithuanian municipalities lack eldership polygons in the official source and remain selectable at municipal level. Counties are territorial units: their governments were abolished in Lithuania in 2010 and Estonia in 2018.

## Boundaries and names

- [Estonian Land and Spatial Development Board](https://geoportaal.maaamet.ee/eng/spatial-data/administrative-and-settlement-division-p312.html), 2 September 2026 county, municipality and settlement shapefiles. Unrestricted use with source and validity-date attribution. The DBF uses Windows-1257; Estonian diacritics are retained. The separate full administrative-border layer supplies the international line through Lake Peipus; the land-only shoreline is not used as an international border.
- [Latvian State Land Service address-register spatial data](https://data.gov.lv/dati/dataset/varis-atvertie-dati/resource/b643b1b3-223f-4394-9beb-18524f8b0b82), October 2026, CC BY 4.0. Full-resolution municipality, town and parish polygons are used, rather than the old district system or the generalized 1:1.2m map. Current official territorial codes join the statistical tables. English labels come from the CSB territorial classification; Latvian names retain their accents.
- [Lithuanian SSVA / Centre of Registers INSPIRE data](https://www.geoportal.lt/metadata-catalog/catalog/search/resource/details.page?uuid=%7B2BADE6E6-1D35-456F-9441-6DC82E4FBD14%7D), 30 September 2026, CC BY 4.0. Official county/municipality/eldership codes and parent references are retained. City municipalities and surrounding district municipalities remain distinct.

Parent geometry is dissolved from the same detailed children, including the actual city polygons where Lithuania has no ward layer. Shared subdivision edges are stored once. Baltic mutual display edges are reconciled as complete runs; detailed source geometry and dates remain documented. Natural Earth major lake water is removed from land fills while administrative strokes through lakes remain continuous. Display alignment is not a legal boundary determination.

## Statistics

- Estonia: Statistics Estonia **RV0291U**, population and published statistical area, 1 January 2026, for counties and municipalities. **RAA0051/RAA0050**, 2024 county GDP and published GDP per capita; the latter uses the official mean annual population denominator. Detailed settlement population is not replaced with parent totals.
- Latvia: CSB **IRS051**, January 2026 resident population on current territorial units; **DRT011**, 2026 land area; **IKR060**, 2023 municipal GDP and GDP per capita, published on the revised territorial basis. Two newly split Carnikava units have no separately matched January population.
- Lithuania: State Data Agency **S3R167_M3010320**, 1 January 2026 resident population. County and municipal codes all match; eldership population is shown only for matching official codes. Registry municipal area is reported in hectares and converted to square kilometres; county areas sum the municipal registry figures. Eurostat **nama_10r_3gdp**, 2024 county GDP and GDP per capita. Municipal GDP is not invented.
- Annual average EUR/USD conversions use Eurostat **ert_bil_eur_a**, for the same year as GDP. Cards keep the euro amount, year and source; the shared colour scale uses the documented dollar conversion.

County centres are reference dots for Estonia and Lithuania. County names take priority over centre names when labels collide. They select their county. Local flag files retain original artwork, dimensions, source-page links, attribution, license and SHA-256 hashes. All 15 Estonian county flags and all 10 Lithuanian county flags are included. Latvian municipal artwork is included where downloaded; the source rate limit leaves some regional flags unavailable. The importer preserves cached artwork and stops further downloads during a rate limit. The module includes verified available flags; missing municipal artwork is not replaced with unrelated symbols.

## Rebuild and validation

Retained inputs, exact API selections, conversion notes and hashes: `scripts/boundary-sources/baltics/manifest.json`. Use `npm run build:baltics` and `npm run test:baltics`; browser scenarios are in `scripts/browser/baltics.test.mjs`. Raw source bytes are retained even when the display uses derived shared topology. Country addition dates are logged separately from source/statistic reference dates. This implementation remains local.

## Eastern and southern display edges

The Estonia–Russia boundary uses Estonia’s full administrative-border layer. Lithuania’s Russia and Poland boundaries use its official INSPIRE administrative geometry, including the Curonian Lagoon crossing. Russian exterior display edges are aligned to these references. Internal Russian administrative strokes, including Gdovsky District, are retained verbatim; lake water is removed from land fills separately. OpenStreetMap lake relations 1318060 (Peipus–Lämmijärv–Pskov) and 7546467 (Curonian Lagoon), retrieved 20 October 2026, supply detailed water masks, with islands retained. The Peipus shoreline was visually compared with Esri World Imagery; satellite pixels are only verification material, not atlas assets. Sources, hashes and original Russian geometry are retained in `scripts/boundary-sources/baltic-frontiers/`; public provenance is in `data/russia/baltic-frontiers-sources.json`. The source polygons remain administrative references; visual land masking does not redefine district jurisdiction.

The generic frontier classifier can mistake the opposite bank of a narrow lake for foreign land. The frontier rebuild excludes mapped Baltic lake/lagoon shore segments from the shared country-border layer unless they coincide with the official international boundary. This affects only generic country strokes; the international lake crossing and Russian administrative meshes remain intact.
