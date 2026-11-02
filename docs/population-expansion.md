# Subdivision population expansion

Added population observations for 6,642 mapped subdivisions. Existing national and first-level observations, areas and economic statistics are preserved. No boundaries changed. Brazil, Malaysia and Indonesia now show local population cards through the existing shared statistics component.

| Country | Added coverage | Reference |
| --- | ---: | --- |
| Brazil | 5,571 municipalities or equivalent units | IBGE 2022 census; 2025 estimates for three changed municipalities |
| Indonesia | 514 regencies and cities | BPS September 2020 census |
| Malaysia | 156 mapped districts | DOSM 2026 midyear estimates, rounded to 100 people |
| Ghana | 16 regions and 260 districts | GSS 2021 census, boundary-aligned UNFPA/OCHA workbook |
| Malta | 68 localities | NSO November 2021 census, preliminary publication |
| Montenegro | 25 municipalities | MONSTAT final 2023 census |
| Mauritius | 12 districts and island groups | Statistics Mauritius 2022 enumeration |
| Israel | 6 districts and 14 mapped subdistricts | CBS 2022 census, rounded to 100 people |

## Coverage decisions

- **Brazil:** Boa Esperança do Norte was installed in 2025 from parts of Sorriso and Nova Ubiratã. All three use the 2025 IBGE municipal estimate. Other municipal cards retain 2022 census observations. State cards retain 2026 estimates. Figures across these years must not be summed. Municipalities do not inherit state GDP. [IBGE explanation](https://educa.ibge.gov.br/criancas/voce-sabia/22741-novo-municipio.html), [census table 4714](https://sidra.ibge.gov.br/tabela/4714), [estimate table 6579](https://sidra.ibge.gov.br/tabela/6579).
- **Indonesia:** The BPS census export matches all 514 BPS codes. Padangsidimpuan / PADANG SIDEMPUAN is an explicitly reviewed spelling variant. The HDX table labeled 2020 was rejected because its metadata describes projections from the 2010 census. The new census counts sum exactly to 270,203,917. Province cards retain newer projections. [BPS census table](https://sensus.bps.go.id/topik/tabular/sp2020/5/0/0).
- **Malaysia:** Match district names within their state, never nationwide. Four older mapped districts differ from the source: Beaufort excludes the separately reported Membakut; Serian excludes Siburan; Simunjan excludes Gedong and Sebuyau; Sri Aman excludes Pantu and Lingga. These cards say “Population (source district)” and explain the difference in the info dot. Their population figures are not allocated to the older polygons, and density is not calculated. The source also contains Perlis and three federal territories as district-equivalent rows; their existing first-level cards remain in use. CSV dates are annual labels, not 1 January observations. [DOSM population series](https://open.dosm.gov.my/data-catalogue/population_district), [DOSM Sarawak gazette summary](https://www.dosm.gov.my/uploads/content-downloads/file_20221107000029.pdf), [Sabah yearbook](https://storage.dosm.gov.my/reviews/yearbook_sabah_2023.pdf).
- **Ghana:** Use the workbook's `gha_admpop_adm2_2021` sheet, whose 260 PCODEs match the map. The download's separate CSV was inconsistent and was rejected. Districts sum exactly to 30,832,019. The workbook combines former submetros and retains Guan inside mapped Hohoe. Oti and Volta region cards therefore sum the aligned districts and explain why their geography differs from the published census region totals. [Source and technical notes](https://data.humdata.org/dataset/cod-ps-gha).
- **Malta:** The retained locality transcription has one correction: Nadur is 4,548, confirmed in NSO Tables 3/4/5, rather than the secondary table's erroneous 1,707. All 68 localities have unique matches and sum to the preliminary publication's 519,562. Mainland and Gozo total 480,275 and 39,287. The raw NSO PDF download was unavailable; the retained secondary transcription is identified in the manifest, with this correction explicit in the matcher. [NSO publication](https://nso.gov.mt/wp-content/uploads/Census-of-population-2021-publication-web.pdf).
- **Montenegro:** All 25 municipalities match by reviewed names and sum to 623,633. [MONSTAT final census Table 1](https://www.monstat.org/uploads/files/popis%202021/saopstenja/SAOPSTENJE_Popis%20stanovnistva%202023%20I_ENG.pdf).
- **Mauritius:** District and Rodrigues figures are the unadjusted detailed enumeration, totaling 1,233,097; these differ from the adjusted headline population. Agalega's 330 is from the report's island count; St. Brandon has no permanent residents. Detailed tables omit these two island groups. The info dot explains the distinction. [Census demographic report](https://statsmauritius.govmu.org/Documents/Census_and_Surveys/Census2022/HPC_TR_Vol2_Demography_Yr22.pdf).
- **Israel:** Use the 2022 census column, not the 2023 preliminary estimate. Published counts include foreign residents. Northern District subtracts Golan's 54,900 because Golan is outside this layer. Its children differ from the rounded parent by 100. Jerusalem district/subdistrict counts include East Jerusalem, while the map retains its separate Palestine polygons; both cards explain the scope difference and suppress density. Rounded population values carry an approximation sign. [CBS Table 2.16](https://www.cbs.gov.il/he/publications/doclib/2024/2.shnatonpopulation/st02_16x.pdf).

## Reproduction and checks

Retained evidence lives in `scripts/statistics-sources/population-expansion`. The manifest records download URLs, SHA-256 hashes, original byte sizes and compressed filenames. Extracted tables identify their parent document and selection. The normalized snapshot records every map ID, matched source name and population metric.

```sh
node scripts/match-population-expansion.mjs
node scripts/prepare-population-expansion.mjs
node scripts/prepare-region-colors.mjs brazil indonesia malaysia ghana malta montenegro mauritius israel
node scripts/validate-population-expansion.mjs
node scripts/validate-brazil-statistics.mjs
node scripts/validate-malaysia-statistics.mjs
node scripts/validate-archipelago-statistics.mjs
node scripts/validate-region-colors.mjs
node scripts/browser/run.mjs population-expansion
```

Brazil, Malaysia, Indonesia and the shared regional dataset builder reapply the overlay when rebuilding their base statistics. The dedicated population preparation command reapplies it independently. Validation checks source hashes, unique identities, reference years, published totals, exception handling, color values and deterministic output. Desktop and phone browser checks cover every country, source links, coverage notes and preservation of state/province GDP cards.

No new public asset files are introduced; existing statistics and color files grow in place. Retained build inputs are outside the Cloudflare static asset package.
