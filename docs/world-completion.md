# Remaining country additions

Local implementation, 31 October 2026. No commit, push or publication requested.

Added Burkina Faso, Central African Republic, Chad, Mali, Niger, South Sudan, Andorra, Liechtenstein, Malta, Israel, Kuwait, Lebanon and Palestine. Each has administrative navigation, search, saved views, quizzes, national flag artwork, a full flag-based interface palette and matching map colors. Country overview pages remain hidden.

| Country | Available administrative levels |
| --- | --- |
| Burkina Faso | 17 regions, 47 provinces, 351 communes |
| Central African Republic | 17 prefectures / Bangui in the dated open reference |
| Chad | 23 provinces, 70 departments |
| Mali | 20 regions / Bamako, 160 cercles |
| Niger | 8 regions, 67 departments, 266 communes |
| South Sudan | 10 states, 78 counties, 511 payams excluding the separately mapped Abyei area |
| Andorra | 7 parishes |
| Liechtenstein | 11 municipalities |
| Malta | 68 local councils |
| Israel | 6 districts, 14 subdistricts within the mapped territorial scope |
| Kuwait | 6 governorates |
| Lebanon | 9 governorates, 26 districts |
| Palestine | 2 territories, 16 governorates |

## Sources and statistical scope

Original source bytes, URLs, licenses and SHA-256 checksums are retained under scripts/boundary-sources/world-completion/. The generated country sources.json files explain their administrative dates independently of statistical observation dates. National population and economic series come from the retained World Bank response. GDP is never allocated to subdivisions. Unmatched subdivision population remains unavailable.

- Burkina Faso uses the 2025 reform. Population is matched only to 43 unchanged province identities. Soum and Tapoa were each split; their older totals are not copied onto either new province. Older regional totals are not assigned to new regions.
- Chad retains the dated 23-province / 70-department reference. The HDX release is validated in 2025, while its underlying geometry dates to 2012; it is not presented as the latest department reform.
- Mali uses the current 20-region structure. Official INSTAT 2023 population projections, published in the January 2026 village directory, match all 20 regions and 146 cercles. Unmatched cercles have no allocated population. [INSTAT directory](https://www.instat-mali.org/laravel-filemanager/files/shares/rgph/repvila-rgph5_rgph.pdf).
- Andorra's official 2025 table covers all seven parishes. Village rows are combined into their real parish: Pas de la Casa with Encamp, Santa Coloma with Andorra la Vella. Total: 89,058.
- Liechtenstein's official provisional permanent-resident table at 31 December 2025 covers all eleven municipalities; total 41,237. [Statistics Portal](https://www.statistikportal.li/de/publikation/bevoelkerungsstand-vorlaeufige-ergebnisse-31-dezember-2025/2025/02/v-1/p42384/pdf).
- The Central African Republic uses the unrestricted geoBoundaries 2006 reference. The current 20-prefecture HDX geometry carries a humanitarian-only use restriction and is excluded. Duplicate source ISO labels for Sangha-Mbaéré and Mambéré-Kadéï are disambiguated using retained source feature identity.
- South Sudan uses the dated ten-state source. Ruweng and Greater Pibor are not separate source polygons. Abyei stays in the existing disputed-area display and is excluded from ordinary South Sudan fill. The latest retained World Bank GDP observation is 2015, and is labeled accordingly.
- Malta retains all 68 local councils, including separate Mġarr and Mellieħa identities despite a duplicated source code. The official 2025 locality workbook returned HTTP 403; published density is not reverse-engineered into population counts.
- Lebanon includes Keserwan–Jbeil, formed from the Jbeil and Kesrwane district polygons.
- Israel's mapped districts exclude the separately retained Palestine polygons and the existing Syrian display. Subnational population totals with broader territorial coverage are not assigned to those clipped polygons. Palestine's 2023 territory estimates are dated observations, not current wartime counts.
- Kuwait, Lebanon and Israel currently have mapped subdivision area and national statistics, without verified subdivision population observations.

## Borders and preservation

Shared international arcs have a single display owner. The new subdivisions follow the retained neighboring boundary wherever possible. Neighbor context silhouettes use unchanged detailed administrative polygons. Existing administrative files, unrelated country contexts and permanent lake masks remain unchanged. Common junctions are selected from detailed source intersections; disconnected territories are preserved during clipping.

## Local verification

npm run test:world-completion checks hierarchy coverage, source pins, population dates, label placement, shared frontier interiors, preserved geometry, all 69 national palettes, and desktop / phone country workflows. npm run test:deployment checks the complete static package. Browser evidence is retained in artifacts/stability/.

The local coverage audit checks an explicit list of all 193 UN members plus the two observers. The existing Congo and Korea entries retain their combined-country structure. The new batch has 1,810 administrative units and 697 matched population observations. All 49,579 shared-border probes, including endpoints and junctions, meet the final fills within 0.16 metres. Earlier administrative geometry and lake regression checks pass.

## Name and neighboring-border follow-up

Chad's source used uppercase province names. Display names now use ordinary case across all 93 provinces and departments, while source identifiers, population values and geometry remain unchanged. Distinct native country names are retained in the country declarations, including Israel, Palestine, Kuwait, Lebanon, Chad, Central African Republic and São Tomé and Príncipe. Identical English/native spellings are not duplicated.

Hebrew names cover Israel's six mapped districts and fourteen subdistricts. Arabic names cover Palestine's two territories and sixteen governorates. Existing Arabic source names for Kuwait, Lebanon and Sudan are also supplied as language variants, so native-only and bilingual controls can actually display them. Sudan now has an explicit Arabic language option. Sources: [Israel CBS district/subdistrict table](https://www.cbs.gov.il/he/publications/doclib/2021/1.shnatongeography/st01_01.pdf), [Palestinian government governorate register](https://www.zinnar.gov.ps/EntitiesMainTables/Details/3), and [PCBS governorate definitions](https://microdata.pcbs.gov.ps/PCBS-Metadata-ar-v5.2/index.php/catalog/638/variable/F3/V26?name=Gov).

The former 10 km cleanup corridor also removed untagged borders between existing countries near new-country junctions. About 26.3 km of France–Spain border beside Andorra was affected. Original detailed segments are restored from the retained prior commit and tagged with their actual country pair, so future world builds preserve them. Other affected existing-country junction segments were audited and restored by the same rule. Original administrative polygons are unchanged. The restoration excludes new-country arcs and avoids duplicate ownership. Pinned coordinates and administrative hashes are in scripts/boundary-sources/world-completion/preserved-existing-frontiers.json.

Local verification: npm run test:world-display-fixes checks name casing, native language variants, 7,423 retained-border probes, unchanged administrative geometry, idempotent restoration, and real desktop/phone rendering. The browser checks both sides of Andorra with Andorra, France and Spain active. The complete static package, all country palettes, new-country border checks and permanent-lake regression checks also pass.
