# Caucasus and Gulf countries

Added locally on 26 October 2026: Armenia, Azerbaijan, Georgia, Qatar, Bahrain and the United Arab Emirates.

| Country | Administrative coverage | Population coverage |
| --- | --- | --- |
| Armenia | Ten provinces and Yerevan, from retained OpenStreetMap relations. | All 11 units, Armstat permanent population on 1 January 2025. |
| Azerbaijan | 71 districts, cities and autonomous-republic entries. Baku has 12 districts; Nakhchivan has seven districts and one city. Restored Aghdara is included. | All 71 first-level entries and 18 detailed units, official resident population on 1 January 2026. |
| Georgia | Nine regions, two autonomous republics, Tbilisi and a separate South Ossetian de facto administrative reference. | Eleven government-administered regional units, Geostat population on 1 January 2026. |
| Qatar | Eight municipalities, 90 zone polygons and 781 district polygons in the retained OCHA GeoJSON. | All eight municipalities, 2020 census. |
| Bahrain | Four governorates from the land-only 2017 geoBoundaries/OpenStreetMap release. | All four governorates, 2020 census. |
| United Arab Emirates | Seven emirates, from the OCHA 2023 reference, including exclaves. | Abu Dhabi 2024; Dubai end-2025; Sharjah 2022 census. |

## Coverage and statistical scope

Armenia uses current mapped provincial boundaries. The older OCHA file of 39 communities represents an earlier administrative arrangement and is not exposed as current municipal coverage.

Azerbaijan includes Nakhchivan and the restored Aghdara district. Baku's administrative polygon is reconstructed from its 12 districts. This preserves the jurisdiction's extent beyond the smaller built-up-city polygon. Caspian territorial sea is removed using the shared Natural Earth coastline; coastal land area is consequently a dated cartographic measurement. Nakhchivan's seven districts and its separate city load within the autonomous republic.

Georgia is shown within its internationally recognized borders. Abkhazia and South Ossetia carry notes explaining their de facto administration. Geostat's population coverage excludes these territories; no population is assigned to their full polygons. Regional counts are rounded and sum to 100 more than the published national total. The South Ossetian polygon uses an atlas reference code rather than an invented ISO code.

Qatar's source catalogue describes 87 zones and 718 districts, while the retained GeoJSON contains 91 unique zone P-codes and 781 unique district P-codes. One zone entry, QAT004099, consists of three identical artificial offshore circles with no district children. It is excluded from zones and municipal land, leaving 90 valid mapped zone polygons. Stable identifiers are retained for the remaining units. The boundaries were created in November 2015 and reviewed in April 2024. Municipality names follow the official census spellings; alternative source spellings remain searchable. No municipality population is divided among zones or districts.

Bahrain's current OpenStreetMap governorate relations include territorial sea. The retained 2017 land-only release avoids treating that sea as land. It contains the four governorates following the abolition of Central Governorate in 2014. Later coastal reclamation lies outside this dated geometry. Census population sums the nationality and sex categories for each governorate.

UAE figures retain their separate source years. Abu Dhabi has 4,135,985 residents in 2024. Dubai's current administrative-record series reports about 4.58 million residents at the end of 2025; daytime population is a different measure. Sharjah's published 2022 census figure is rounded to 1.8 million. Missing emirate counts are left unavailable. National GDP is not allocated to subdivisions.

## Geometry and loading

Shared Caucasus edges follow the established atlas outlines of Turkey and Russia, then the first country built along each new shared frontier. Enclaves and inland holes are matched separately from open frontier arcs. Inland lake surfaces and Caspian territorial sea are excluded from land fills. Detailed units are clipped to their displayed parent; small source strips join an adjoining unit, using the longest shared boundary where available.

Detailed geometry loads within the selected parent. All six maps use the existing renderer, bounded country cache, native-name search, saved views, flags and first-level quizzes. Country overview pages remain hidden. National World Bank population, current-price GDP and GDP per capita remain in the statistics data with their source year. Existing interactive world silhouettes are hash-checked during integration.

## Sources and reproduction

Original files, retrieval dates, licenses, relation IDs and SHA-256 hashes are retained in `scripts/boundary-sources/caucasus-gulf/manifest.json`.

- [OpenStreetMap](https://www.openstreetmap.org/copyright), ODbL 1.0. Relation snapshots retain their original revision metadata.
- [OCHA Qatar administrative boundaries](https://data.humdata.org/dataset/cod-ab-qat) and [OCHA UAE administrative boundaries](https://data.humdata.org/dataset/cod-ab-are).
- [geoBoundaries Bahrain land geometry](https://github.com/wmgeolab/geoBoundaries/tree/9469f09/releaseData/gbOpen/BHR/ADM1).
- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public domain, for the shared Caspian coast and surrounding-country reference.
- [Armstat: population on 1 January 2025](https://www.armstat.am/file/article/population_01_01_25.pdf).
- [Azerbaijan State Statistical Committee: territorial population](https://www.stat.gov.az/source/demoqraphy/en/001_15en.xls).
- [Geostat: population on 1 January 2026](https://www.geostat.ge/media/78328/Number-of-Population-as-of-January-1%2C-2026.pdf).
- [Qatar: population and density by municipality, 2010 and 2020 censuses](https://www.data.gov.qa/explore/dataset/total-population-and-population-density-by-municipality-in-census-2010-2020/).
- [Bahrain: population by governorate, nationality and sex, 2020 census](https://www.data.gov.bh/explore/dataset/population-by-governorate-nationality-and-sex-census-2020/).
- [Statistics Centre Abu Dhabi: 2024 population](https://www.statad.gov.ae/en/w/abu-dhabi-population-in-2024-grows-7-5-to-reach-4-14m).
- [Digital Dubai: end-2025 resident population](https://www.digitaldubai.ae/initiatives/paperless/dubai-digital-dubai%27s-population-tops-4.580-million-by-the-end-of-2025-recording-7.5-growth).
- [UAE government: Sharjah](https://u.ae/en/about-the-uae/the-seven-emirates/Sharjah).
- [World Bank World Development Indicators](https://data.worldbank.org/), CC BY 4.0.
- National flag SVG provenance and original file URLs are recorded in the source manifest and flag registry.

Run `npm run fetch:caucasus-gulf`, then `python scripts/extract-caucasus-statistics.py` with pypdf and xlrd installed. Run `npm run build:caucasus-gulf` and `npm run test:caucasus-gulf`. Data checks cover source hashes, hierarchy, parent containment, native search, population coverage, country-page visibility and world silhouettes. Browser checks cover desktop and mobile maps, all six countries, detailed layers, statistics, flags, quizzes and saved views.

## Qatar coordinate and source-artifact correction

The retained export declares CRS84/WGS84, while its numerical coordinates retain the QND95 offset. Qatar alone is transformed from QND95 to WGS84 with the Qatar Centre for GIS seven-parameter [EPSG:1840 operation](https://epsg.io/1840). Municipalities, zones and districts receive the same correction before hierarchy reconciliation. The country context retains the complete corrected outline. Bahrain and the other country geometries are unchanged.

Independent retained OpenStreetMap shoreline controls verify the correction. At West Bay, 556 source vertices have a median shore residual of 93.46 m before correction and 2.67 m afterward. At Ras Laffan, 2,504 vertices improve from 59.78 m to 15.50 m. Remaining differences can reflect the dated source shoreline, coastal development and reference generalization. The measured report is `dist/data/europe/qatar/alignment-report.json`; raw controls and source hashes are retained with the boundary files. The correction is restricted to the pinned Qatar source hash so an updated export requires a coordinate review.

The artificial 99 entry is not used as an administrative zone. Qatar’s [official 2011 atlas](https://www.psa.gov.qa/en/statistics/Documents/Qatlas-Part-1.pdf) lists numbers from 1 through 98 and explicitly identifies reserved numbers; the highest zone number does not give the number of mapped polygons. The atlas’s 99 sample appears in the map legend. The retained later boundary reference also omits zones 10 and 11; missing or reserved codes are not filled with invented units.

Run `npm run fetch:qatar-reference`, `npm run build:qatar-reference` and `npm run test:qatar-reference`. Tests check independent shoreline residuals, the published datum operation, exclusion of all three artificial circles, administrative hierarchy, satellite rendering, saved views and unchanged Bahrain geometry.

## Khor Al Adaid shoreline

`npm run build:khor-al-adaid` replaces the mismatched Qatar–Saudi inlet join with a continuous, retained OpenStreetMap shoreline. The correction is restricted to 51.18–51.65° E and 24.47–24.85° N. Its 7,621 mainland-coast vertices define land fills only. The existing 48-point inland reference path is preserved, with its eastern endpoint extended 137.5 m along the same straight segment to meet the mapped shore. The coastline and maritime boundary have no international-border stroke.

The correction propagates through affected municipalities, zones, districts and Saudi governorates; mapped area, label positions, context silhouettes, compact files, globe outlines and border previews are refreshed together. Unrelated country silhouettes remain unchanged. Normal Qatar and West Asia rebuilds reapply this step. The retained source, ODbL attribution and checksum are in `scripts/boundary-sources/caucasus-gulf/manifest.json`; the build report is `dist/data/europe/qatar/khor-al-adaid-report.json`. Run `npm run test:khor-al-adaid` for water, land, hierarchy, land-only line and desktop/phone rendering checks.
