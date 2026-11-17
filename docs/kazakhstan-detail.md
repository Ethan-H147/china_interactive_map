# Kazakhstan districts and cities

Local expansion of the existing Kazakhstan regional dataset. Country overview pages stay hidden. No separate renderer, parallel country fill, history layer or duplicated parent geometry is introduced.

## Coverage and dates

- The Bureau of National Statistics KATO register published 4 November 2026 supplies current codes and Kazakh/Russian names. The July 2026 administrative inventory independently checks 170 regional districts, 25 urban districts and 90 cities.
- The existing 21 first-level map units remain: 17 regions, 3 republican cities and Baikonur's special-status city. Baikonur remains within Kyzylorda's official statistical scope; no population or GDP is duplicated.
- 227 second-level polygons represent the regional districts, 38 city administrations and 19 districts in republican cities. Baikonur reuses its existing first-level polygon.
- Four urban districts under Aktobe and Taraz have third-level polygons. Karaganda's Alikhan Bokeikhan and Qazybek Bi districts have official searchable cards with an explicit unavailable-boundary notice; no boundary, area or point is invented. Their map labels and selection outlines are suppressed.
- All 90 official cities are searchable. The 48 district-level cities use the existing settlement-point component; the other cities reuse their administrative pages. A city administration can contain surrounding settlements and is distinct from a city's built-up footprint.
- All 227 second-level cards have matched official 2026 monthly population estimates, with their actual release month displayed. First-level region/city population remains the verified 1 September 2026 estimate. Annual 2025 GRP and GRP per capita are official nominal KZT values, converted from million/thousand tenge without deriving an incompatible population denominator. Administrative counts use the dated July 2026 inventory rather than counting every KATO locality entry as a village.

## Geometry reuse

The first.bin, political.bin, context.bin and international.bin assets are preserved byte-for-byte; their SHA-256 values are recorded in sources.json. The earlier geokz district source is reused from the existing retained cache. Only outdated units are replaced from pinned OSM snapshots: Alatau's expanded city, Sauran/Kentau/Turkistan, Markakol/Kurshim, Ulken Naryn/Katonkaragay, Sarayshyq and the Taraz/Aktobe urban partitions. Zhanasemey and Satpaev use corrected administration codes; the city settlement codes are aliases of their city-administration pages.

New city extents erase their predecessor district areas before ownership is resolved. Every district group is partitioned onto its exact existing parent land mask with the shared partitionRegionalMask helper. A single shared ownership mesh supplies internal borders. Lake holes, coastal edges and reconciled international borders come from the existing parent geometry. Deeper chunks load only for their selected parent and use the existing workers, detail switching, cache, selection and teardown.

Unchanged interiors retain their 2024 source vintage. The register check does not claim a new cadastral survey of every boundary. Source-specific dates, licenses, relation versions and retained hashes remain in sources.json and scripts/boundary-sources/kazakhstan-detail/manifest.json. OSM data is credited under ODbL 1.0 and geokz under CC BY 4.0.

## Local build and checks

From the atlas checkout:

```powershell
node --max-old-space-size=8000 scripts/build-kazakhstan-detail.mjs
node scripts/validate-kazakhstan-detail.mjs
node scripts/validate-pakistan-kazakhstan.mjs
node scripts/browser/run.mjs kazakhstan-detail kazakhstan-rendering
```

The builder reads retained, hash-verified source files and does not fetch changing network responses. Geometry checks cover identity, hierarchy, all label centers, rings, chunk accounting, pairwise-free fill coverage on 105,600 sampled points, shared meshes, exact parent land membership, original lake samples, city point containment, raw workbook population values and unchanged parent hashes. All 227 second-level populations reconcile to their official regional table totals at the same reference month; Kyzylorda reconciliation explicitly subtracts the separately retained Baikonur reporting row. Two original XLS workbooks have retained XLSX conversions for the shared reader, with both original and derivative hashes.

Real-browser scenarios check all 20 parents and 227 district land centers, and exercise desktop/mobile cards, search, names, drill-down, restored URLs, hit testing, camera gestures, lazy requests and cleanup. Nothing is committed or published automatically.

## Outstanding legal boundary revisions

The November 2026 legal review found that public OSM and official cadastral vectors still lag two enacted land changes: the 281 ha Karaganda/Bukhar-Zhyrau transfer of July 2026 and the Zhanaozen/Karakiya expansion and Bolashak transfer of 2025–2026. These four cards visibly identify the displayed 2024 footprint and link to the decree. They are not certified as current boundaries. This is an outstanding part of the requested current-boundary coverage. The two Karaganda urban district cards also remain without verified polygons.

Aktau’s 2026 expansion consists of water-fund territory, according to the decree annex; it does not warrant painting the Caspian as land. All six Astana district interiors use the newer retained OSM outlines, fitted to the existing parent mask.
