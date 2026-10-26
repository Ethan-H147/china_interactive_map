# Zimbabwe, Zambia, Tanzania and Kenya

Added locally on 26 October 2026. The shared map renderer supplies subdivision search, first-level quizzes, flags, saved views, satellite mode and scoped district loading. No publication is performed by these build scripts.

| Map | Dated boundary source | First level | Second level | Population |
| --- | --- | --- | --- | --- |
| Zimbabwe | OCHA COD-AB, 2018, reviewed 2025 | 10 provinces/cities | 91 districts, including separately mapped urban districts | Final ZIMSTAT 2022 census, all 10 provinces |
| Zambia | OCHA COD-AB, last geometry edit 2020, valid 2023 | 10 provinces | 116 districts | ZamStats 2022 preliminary census, all 10 provinces; explicitly labeled preliminary |
| Tanzania | OCHA COD-AB, 2018 | 31 regions, including five Zanzibar regions and Songwe | 170 dated district reference units | NBS/OCGS 2022 census, all 31 regions |
| Kenya | OCHA COD-AB, geometry 2018, valid 2019 | 47 counties | 290 source sub-county units | KNBS 2019 census county totals, including intersex respondents |

The source dates and administrative systems remain explicit. Tanzania’s 170-unit district reference is not the later council roster. Kenya’s source sub-counties differ from the lower-level census division. The retained Kenyan county workbook is used instead of the older HDX sex-disaggregated extract, which omits intersex respondents. Zimbabwe’s older HDX projection tables are retained for audit but are not substituted for the final census counts. District populations are withheld until matching census areas are verified.

World Bank 2025 GDP and published GDP per capita are used for Zimbabwe, Zambia and Kenya. Tanzania uses the newly published NBS/OCGS national accounts for the whole United Republic, including Zanzibar. Table 26 reports 2025 nominal GDP of TZS 243,346,944 million and an annual average rate of 2,550 TZS per USD. The GDP-per-resident calculation uses the explicitly listed 66,054,123 mainland residents plus 2,098,881 Zanzibar residents. The report’s aggregate URT population row repeats its 2024 total, so it is not used as the 2025 denominator. This calculation is labeled and explained beside the sources. No national GDP is distributed to regions or districts.

Each country’s first-level boundaries dissolve from its district geometry. Lake surfaces are removed after legal country-frontier matching; lake crossings remain water references. The existing country geometries are preserved. New surveys follow adjoining existing outlines, with the stated river-island tolerance and separate lake endpoint allowances retained in `frontiers.json`. Kenya’s northern boundary follows its OCHA source around the disputed Ilemi Triangle; this is a cartographic reference, not a sovereignty determination.

Original inputs, selected source archive members, download URLs, licenses and hashes are retained in `scripts/boundary-sources/east-south-africa/`. Zambia’s 123 MB original ZIP is pinned by archive hash and cached under ignored artifacts; only the two required GeoJSON members are retained in the source tree, avoiding an oversized Git object. The fetch script verifies every retained source before rebuilding. Government census workbooks/reports are normalized once into a separately pinned JSON table; normal builds work offline.

Run `npm run build:east-south-africa` and `npm run test:east-south-africa`. Targeted asset integration replaces the four gray silhouettes and refreshes adjacent background borders, compact copies, context culling, globe overview and border previews while preserving existing interactive-country fallback geometry.
