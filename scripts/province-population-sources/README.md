# Province population sources

Run `node scripts/prepare-province-population.mjs` to regenerate `dist/data/province-population.json` from the checked-in compressed source snapshots. Run it with `--refresh` to download the source tables again, then review the changed totals, dates, references and validation results. The website displays a saved snapshot and does not automatically synchronize.

- Mainland China: 31 entire-region permanent-resident totals from Table 3-1 of the National Bureau of Statistics' Seventh National Population Census, dated 1 November 2020. The separate national servicemen row is excluded from provincial totals.
- Taiwan: the final 2020 resident population census XML published by DGBAS, dated 8 November 2020. Its coverage includes Kinmen and Matsu, and includes non-national usual residents.
- Hong Kong: the 2021 census resident population at 30 June 2021, including usual and mobile residents.
- Macao: the August 2021 census total population, including non-resident workers and non-local students living in Macao.
- Mongolia: the exact population column of the requested Wikipedia article, headed “2020 Census,” with 21 aimags and Ulaanbaatar. The Wikipedia revision is retained in each source link. Mongolian traditional-script names and province capitals come from the same table. Cyrillic names and ISO codes are matched against the retained ISO 3166-2:MN article.

Every population record identifies its date, geographic measure and source. These figures are census snapshots, rather than current estimates. Population totals never inherit from a parent province to a selected city or district. The existing city population data remains a separate dataset.

`manifest.json` records retrieval timestamps and SHA-256 hashes of the uncompressed snapshots. The build checks these hashes before parsing and requires exactly 34 China region matches and 22 Mongolia region matches.
