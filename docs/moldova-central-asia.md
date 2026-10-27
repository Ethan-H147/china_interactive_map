# Moldova and Central Asia

Added locally on 26 October 2026. Kazakhstan and Kyrgyzstan were already available; this addition completes the five Central Asian country maps with Uzbekistan, Tajikistan and Turkmenistan.

| Country | Administrative coverage | Population coverage |
| --- | --- | --- |
| Moldova | 37 OCHA/UNHCR units: 32 districts, three municipalities, Gagauzia and the left-bank territorial unit. Boundaries valid 10 May 2022. | Final 8 April 2024 census, table T5, for 33 complete matching units. |
| Uzbekistan | 14 regions/equivalents and 199 district/city units in the retained OCHA 2018 reference, reviewed January 2024. | All 14 regions/equivalents, permanent population on 1 July 2025. |
| Tajikistan | Five regions/equivalents from current OpenStreetMap relation snapshots, including Dushanbe and the districts of republican subordination. | All five regions/equivalents, preliminary estimates on 1 July 2026. |
| Turkmenistan | Five provinces, Ashgabat and Arkadag; 51 mapped local units including provincial districts/cities and capital city boroughs. Current OpenStreetMap relation snapshots. | Five regions with matching scope in the 17 December 2022 census. |

Moldova includes the eastern territory within its internationally recognized borders. Bender and Transnistria have notes identifying their de facto administration. Moldova’s 2024 census excluded these areas and some localities in Căușeni and Dubăsari. Their partial counts are not used for the full map polygons. Gagauzia is a separate autonomous territorial unit.

Uzbekistan’s district roster is a dated reference. It does not claim to incorporate subsequent district reforms. Karakalpakstan is an autonomous republic; Tashkent city is separate from Tashkent Region. English, Uzbek and Russian source names remain searchable.

Tajikistan uses current mapped regional geometry. The public OCHA resource contains an administrative taxonomy and withholds geographical boundaries. A retained geoBoundaries district layer represents 2017 and omits current city divisions; it is not exposed as current national district coverage. Tajik and Russian names come from the retained OpenStreetMap relations.

Arkadag is shown as a separate first-level city according to its statutory status, although the retained OpenStreetMap relation places it under Ahal. Its polygon is removed from Ahal’s fill. Ahal’s 2022 population predates this separation, so neither that combined total nor an inferred Arkadag count is applied to the present polygons. The remaining five regional census totals are displayed with their date. District/city polygons follow their displayed parents exactly; small source strips join the adjoining local unit with the longest shared boundary, with nearest-area assignment for isolated parent islands.

## Geometry and loading

New international edges follow the existing atlas outlines of Ukraine, Kazakhstan, Kyrgyzstan, Afghanistan and China. New-country shared edges use the first country built as the canonical outline. Closed enclave rings are matched separately from open frontier arcs. Inland lake surfaces are excluded. Existing interactive world silhouettes are hash-checked during integration; neighboring gray land is reconciled to the new outlines.

District geometry loads only within the selected parent. All four maps use the existing renderer, search, selection, saved views, first-level quizzes and bounded country cache. Country overview pages remain hidden. National World Bank population, current-price GDP and GDP per capita remain in the statistics data, separately dated from regional statistics. National GDP is not allocated to subdivisions.

## Sources and reproduction

Sources are retained with original URLs, licenses, retrieval date and SHA-256 hashes in `scripts/boundary-sources/moldova-central-asia/manifest.json`.

- [OCHA: Moldova administrative boundaries](https://data.humdata.org/dataset/cod-ab-mda), CC BY 3.0 IGO.
- [OCHA: Uzbekistan administrative boundaries](https://data.humdata.org/dataset/cod-ab-uzb), CC BY 3.0 IGO.
- [OpenStreetMap](https://www.openstreetmap.org/copyright), ODbL 1.0. Direct relation downloads retain their revision metadata. All relation IDs and local parent mappings are in the manifest.
- [Moldova: final 2024 census geographical tables](https://statistica.gov.md/files/files/serii_de_timp/recensamant_2024/date_finale/Anexa_Caracteristici_Geografice_RPL2024_en.xlsx), table T5. The extraction records the workbook hash.
- [Uzbekistan: regional population, 1 July 2025](https://stat.uz/en/press-center/news-of-committee/62565-hududlar-kesimida-doimiy-aholi-soni-pp-3).
- [Tajikistan: regional population, 1 July 2026](https://www.stat.tj/en/population-growth-and-demographic-changes-in-the-country/).
- [Turkmenistan: 2022 census](https://stat.gov.tm/en/population-census).
- [Arkadag administrative status](https://mejlis.gov.tm/single-law/6?lang=tm).
- [World Bank World Development Indicators](https://data.worldbank.org/), CC BY 4.0.
- Original national flag SVGs from Wikimedia Commons; individual file URLs and public-domain provenance are retained in the manifest and flag registry.

Run `npm run fetch:moldova-central-asia`, then `python scripts/extract-moldova-census.py` with openpyxl installed. Run `npm run build:moldova-central-asia` and `npm run test:moldova-central-asia`. The data validator checks source hashes, counts, hierarchy, parent coverage, native search, population scope, national economics and preserved world silhouettes. Browser scenarios cover desktop and mobile maps, search, selection, district loading, statistics, flags, quizzes and saved views.

## Shared-boundary repair

The 26 October 2026 [Central Asian boundary repair](central-asian-frontiers.md) supersedes the initial country-by-country frontier alignment. All five countries share matching national masks and enclave loops. Uzbekistan has 198 district/city polygons plus Shirin as a searchable settlement point; the original 199-entry administrative reference is retained in the source cache.
