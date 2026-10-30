# Sri Lanka, Malawi, Madagascar and Mozambique

Added locally on 29 October 2026. All four use the existing regional renderer, country menu, search, saved views, statistics, satellite controls and three first-level quiz modes. Country overview pages remain hidden.

| Country | First level | Second level | Third level |
| --- | --- | --- | --- |
| Sri Lanka | 9 provinces | 25 districts | 339 divisional secretariats |
| Malawi | 3 regions | 28 districts and 4 cities | 432 land-based traditional authorities and other local reference areas |
| Madagascar | 24 regions | 120 districts | 1,645 communes |
| Mozambique | 10 provinces and Maputo City | 161 districts | 457 administrative posts |

The retained boundary releases are [Sri Lanka COD-AB](https://data.humdata.org/dataset/cod-ab-lka), [Malawi COD-AB](https://data.humdata.org/dataset/cod-ab-mwi), [Madagascar COD-AB](https://data.humdata.org/dataset/cod-ab-mdg) and [Mozambique COD-AB](https://data.humdata.org/dataset/cod-ab-moz), distributed under CC BY-IGO. Their original geometry dates differ from their subsequent review dates. The source notes in each map disclose those dates and coverage limits. Fourth-level data is not exposed. Sinhala and Tamil names are retained for Sri Lanka.

Population uses separately dated COD-PS releases: Sri Lanka and Malawi 2023, Madagascar 2018, Mozambique 2025. Names, administrative levels and parents are checked as well as codes. Malawi's city districts remain separate from rural districts. Madagascar's older population geography matches only part of the newer boundary roster; unmatched values remain unavailable. Mozambique's province codes were reassigned between source releases: province populations use an explicit unique-name crosswalk with original population codes recorded in the statistic. District values are withheld across that mismatch. National GDP is never assigned to subdivisions.

All parent geometries dissolve from the same third-level partition. Shared subdivision edges have one ownership mesh. New land frontiers follow the already mapped neighbors; ocean coastlines and lake crossings have no new border stroke. The broad lake mask preserves the small source polygons at Likoma, the Salima national-park islands. The Malawi third-level source contains 433 records; the water-only Lake Malombe record is excluded from the 432 land areas. The retained land roster includes parks, forests and other reference areas as well as traditional authorities.

Source archives are pinned by SHA-256 in `scripts/boundary-sources/indian-ocean/manifest.json`. Only the selected ADM1–3 GeoJSON members, population tables, metadata and flags are retained in Git; oversized original ZIP download caches are ignored. The selected geometry is simplified together at 0.00015 degrees before rounding to six decimals. Existing interactive country silhouettes are preserved by hash during world integration.

Local regeneration:

```sh
npm run fetch:indian-ocean
npm run build:indian-ocean
npm run test:indian-ocean
```

## Laos–Myanmar–China junction

The northern Laos–Myanmar stroke previously ended about 1.9 km short of China. The repair follows the seven existing Myanmar outline vertices to the exact common endpoint `[101.143703, 21.563789]`. It updates the canonical Laos alignment report and removes the obsolete locally owned Myanmar fragment. Chinese province geometry is unchanged. The general frontier rebuild and Myanmar/Laos rebuild both retain this repair.

```sh
npm run build:mekong-tripoint
npm run test:mekong-tripoint
node scripts/browser/run.mjs mekong-tripoint
```

Verified locally: 9/9 real-browser scenarios passed across desktop and phone layouts, including all three quiz modes, flags, search, deep links, satellite mode and the repaired junction in both Laos and Myanmar views. Country source/hierarchy/population checks, the existing 408,108 Myanmar/Laos frontier probes, all 128 country registrations and labels, entry routing, 253 compact-asset copies and diff formatting checks passed. The older east/south Africa audit passes its four country data sections but has a pre-existing stale Belarus preservation hash; the current Belarus silhouette matches HEAD byte-for-byte in the relevant feature hash.

## Malawi–Mozambique lakes and preview repair

The countries’ separately simplified background previews could differ from the detailed border by over 200 metres. Both now retain the same full land geometry in their previews. Mozambique’s local partitions conform to one exact shared interior frontier; overlapping Malawian land is removed. The border stroke derives from actual edges shared by both final land partitions, keeping coastlines and lake-water crossings unstroked. Existing endpoint junctions with other neighbors are preserved.

Pinned OpenStreetMap relations provide lake water for Chilwa (4656098), Chiuta (2259615), Malombe (2631185) and Amaramba (19351588), under ODbL 1.0. These lakes were absent from the broad retained Natural Earth water layer. Real source-mapped Malawian islands are retained, including Chisi, Likoma and Chizumulu. The water-only Lake Malombe source polygon is removed from the land roster. Full map geometry, subdivisional chunks, area calculations, labels, comparisons, compact files, world fallback land and previews are regenerated together.

`npm run test:malawi-mozambique` checks country overlap, preview equality, 4,448 interior frontier points, stroke ownership, lake interiors and real islands. Browser pixel checks cover the former preview gaps and the Lake Chilwa/Chisi scenes from both countries.

Detached pieces around the four border lakes are also checked against Mozambique’s retained original national outline. Pieces introduced outside that outline by shore-to-frontier alignment are clipped away; the connected mainland, correctly sourced lake islands and ocean islands are preserved. Additional regression locations cover the formerly detached opposite-shore fragments.

Final repair verification: 6/6 desktop/phone and rendered-pixel scenarios passed after the shore-fragment cleanup, along with source/hierarchy checks, 4,448 shared-frontier probes, color-data checks, 253 current compact files and the Laos–Myanmar–China junction regression. All changes remain local.
