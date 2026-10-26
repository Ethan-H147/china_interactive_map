# Taiwan township-level divisions

The China map includes 368 districts, townships, and county-administered cities beneath Taiwan’s 22 counties and cities. Names and official codes come from NLSC dataset 7441. Search results identify the parent county or city.

Source: https://data.gov.tw/dataset/7441

The accessible NLSC download contains TOWN_MOI_1120317 (17 March 2023), plus the separate Majia–Sanhe polygon. The newer TGOS download returned HTTP 403 during this update. The build unions the supplement into Majia. Source metadata, archive checksum, license and per-parent counts are in dist/data/taiwan-townships/sources.json.

Run npm run build:taiwan-townships to rebuild from scripts/additional-sources/taiwan-townships. Townships are simplified together to preserve shared edges, then reconciled to the atlas’s displayed county boundaries. This is a display alignment, not a newer official boundary revision.

Only names and bounds load at startup. Boundary files load for one parent at a time through the existing county-scope loader. The 22 parent areas total about 5.5 MB compressed; no country-wide township geometry is loaded.

Run npm run test:taiwan-townships for coverage, containment, search, navigation and phone checks. No township population or GDP figures are inferred from county statistics.

Fills are triangulated in Mercator coordinates after resolving projected ring contacts. Each triangle is a separate fill feature sharing its township ID, preventing tile clipping from joining triangles into overlapping rings. Their source disables tile simplification to keep shared triangle edges aligned. Selection and administrative outlines retain the original rings. All 368 fills are checked against their parent footprints.
