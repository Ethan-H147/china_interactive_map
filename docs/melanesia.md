# Papua New Guinea, Solomon Islands and Vanuatu

Added locally on 29 October 2026 through the shared regional country renderer. Country overview pages remain hidden. The three maps share search, parent navigation, source disclosures, mapped area, dated population and density shading, satellite imagery, saved views, and the three first-level quiz modes.

| Country | Mapped hierarchy | Population reference |
| --- | --- | --- |
| Papua New Guinea | 22 province-level units, 87 districts, 326 local-level governments | Matched 2011 COD-PS census figures |
| Solomon Islands | Nine provinces and Honiara, 50 electoral constituencies, 183 wards | Matched 2023 COD-PS estimates |
| Vanuatu | Six provinces, 66 mapped area councils/municipalities | Matched 2020 COD-PS census figures |

Papua New Guinea retains the 2019 NSO/OCHA boundary snapshot, including Bougainville and the National Capital District. Later district/LLG reforms are not inferred. Solomon Islands uses the 2018 SINSO/OCHA reference; constituencies are labelled as electoral geography. The truncated source label “Rennell-Bell” is displayed as [Rennell and Bellona](https://www.mpgis.gov.sb/rennell-bellona.html), retaining the original as a search alias. Its projected World Mercator 150 shapefiles are transformed from their declared CRS to WGS84 before building. Vanuatu retains the 2017 SPC/OCHA reference, reviewed in 2024; the 66 mapped local areas are not presented as the later 72-area council system. Port Vila and Luganville are the source's urban units.

Parents dissolve from the same lowest-level land topology, so their boundaries and child partitions agree. Papua New Guinea's land frontier aligns with the existing Indonesia outline; the full line has one owner, replacing the old Indonesia-owned fragments. Coastlines and maritime gaps have no border stroke. Existing country silhouettes, including the local Qatar–Saudi shoreline correction, remain unchanged.

Regional figures keep their published dates and are joined by source P-code. National World Bank population, GDP and GDP per capita use one common available year and are retained behind the hidden country page; GDP is not allocated to subdivisions. Mapped area is calculated from the displayed geometry. Flags retain their original SVG proportions and open through the shared viewer.

Sources and checksums are retained in scripts/boundary-sources/melanesia/manifest.json. Boundary sources: [PNG COD-AB](https://data.humdata.org/dataset/cod-ab-png), [Solomon Islands COD-AB](https://data.humdata.org/dataset/cod-ab-slb), [Vanuatu COD-AB](https://data.humdata.org/dataset/cod-ab-vut). Population sources are the matching COD-PS packages linked in the generated statistics files; national data comes from World Bank WDI. National flag artwork is retained from FlagCDN/flag-icons with source metadata.

Run npm run build:melanesia to reuse the pinned downloads, register the countries, rebuild the datasets and integrate their world assets. Run npm run test:melanesia for source, hierarchy, statistics, labels, preserved geometry and desktop/phone map and quiz checks. The targeted world integration preserves all other country geometry rather than replacing it during this addition. Committing, pushing and publishing remain separate user-authorized actions.
