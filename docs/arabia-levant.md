# Oman, Yemen, Syria and Jordan

Added locally on 29 October 2026 through the shared regional renderer. Each map supports subdivision search, parent navigation, saved views, original flag proportions, satellite imagery and the three governorate quiz modes. Country overview pages remain hidden; subdivision statistics remain visible.

| Country | Mapped hierarchy | Governorate population |
| --- | --- | --- |
| Oman | 11 governorates, 61 wilayats (2020 geometry) | End-2025 NCSI registered population |
| Yemen | 22 governorates, 335 districts (2023 reference) | 2025 adjusted current-resident estimates |
| Syria | 14 governorates, 62 districts, 272 subdistricts (2020 reference) | 2004 resident census, explicitly dated |
| Jordan | 12 governorates, 52 districts (2006 reference) | Official end-2025 estimates |

Oman's geometry comes from the geoBoundaries open release of the Oman National Geographic Structure. The 61 source wilayats are grouped into the 11 governorates using the membership descriptions in the retained NCSI yearbook. The later wilayats Jabal Al Akhdar and Sinaw are not invented within the older geometry. The reviewed HDX Oman package uses a different source and omits districts, so it is retained for review but is not used to build the map. Musandam, Madha and the UAE enclave Nahwa are retained.

Yemen and Syria use the retained UNCS/OCHA COD-AB geometry. Yemen's population table has 333 district records, while the boundary reference has 335. Population is therefore aggregated to matching governorates; district populations are withheld. Syria uses the workbook's resident-census governorate worksheet, not the separate civil-registration table. These historical figures do not estimate later displacement. Neither administrative map represents current territorial control.

Jordan uses separately sourced geoBoundaries governorate and district geometry. Districts are assigned by greatest overlap and conformed to their governorate. Official 2025 governorate statistics are not allocated to the older district geography. Arabic governorate names and available source Arabic subdivision names are searchable; English names remain available where the source has no Arabic label.

Shared frontiers align with the existing Saudi, UAE, Iraqi and Turkish maps and with each other. Closed enclave rings are retained. Each international land frontier has one owner; coastlines and lake water have no border stroke. Child partitions are clipped to their parent and source gaps assigned to adjacent children. Existing interactive country silhouettes, including the earlier local Qatar–Saudi coast repair and Melanesia additions, are preserved by hash.

Population retains its method and reference date. Area is calculated from displayed land geometry. National World Bank population, GDP and GDP per capita use a common available year behind the hidden country page; national GDP is not allocated to subdivisions. Syria's flag uses the retained green, white and black SVG with three red stars.

Source downloads, attribution and SHA-256 checksums are in scripts/boundary-sources/arabia-levant/manifest.json. Boundary references: [Oman geoBoundaries](https://www.geoboundaries.org/api/current/gbOpen/OMN/ADM2/), [Yemen COD-AB](https://data.humdata.org/dataset/cod-ab-yem), [Syria COD-AB](https://data.humdata.org/dataset/cod-ab-syr), [Jordan geoBoundaries](https://www.geoboundaries.org/api/current/gbOpen/JOR/ADM2/). Official population tables are linked in each generated statistics file. The Oman membership descriptions and population table are in the retained NCSI Statistical Yearbook 2026.

Run npm run build:arabia-levant to validate/reuse pinned downloads, register the maps, build their scoped datasets and update world assets. The normalized population JSON files are retained alongside their source checksums. To re-extract them, run scripts/extract-arabia-levant-statistics.py with Python, pypdf, xlrd and pypdfium2; --python-deps accepts a local dependency directory. The extractor checks published totals and renders the two PDF tables for visual verification.

Run npm run test:arabia-levant for source, hierarchy, frontier, population, label and desktop/phone browser checks. Committing, pushing and publishing require a separate user request.
