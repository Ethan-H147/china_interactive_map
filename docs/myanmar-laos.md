# Myanmar, Laos and Chinese province outlines

Added locally on 18 October 2026. Both countries are recorded once in the country log. No publication or source push was performed.

## Myanmar

The map includes 15 first-level units: seven states, seven regions and Nay Pyi Taw union territory. All 330 MIMU townships are available beneath them. Source statistical subregions for Bago and Shan are merged into their first-level parents. Current district reorganisations are not consistently represented by the humanitarian source, so no district layer is exposed. English and Burmese names, source PCodes, search, selection, saved views and a first-level quiz are supported.

Boundaries: [MIMU administrative boundaries, PCode v9.4](https://data.themimu.info/en/dataset/myanmar-administrative-boundary). First-level populations are from the official **2014 census**, including the source estimates for non-enumerated areas. They are labelled historical and do not estimate present population or control. Township population is left unavailable.

### Control and administrations

Map settings contains a separate control overview:

- Approximate northern and southern UWSA/Wa territories and the separate NDAA/Mongla territory, from the [IISS Myanmar Conflict Map](https://myanmar.iiss.org/methodology).
- Dated points for military-held urban/governing centres at Naypyitaw, Yangon and Mandalay. A city point does not assign the surrounding township or region to the military.
- An optional outline of the six formal self-administered areas from MIMU. These are administrative boundaries, not current frontlines. Southern Wa territory lies outside the formal Wa Self-Administered Division.
- Explanations of the separate command structures and relationships of the military authorities, military-aligned militias, UWSA, NDAA, NUG/PDFs and other ethnic armed organisations.

Unclassified land is neutral. It must not be interpreted as military-held. IISS distinguishes armed-group activity from territorial control; only its three stable ceasefire territory polygons were used. Their effective boundary date is unspecified; the retained source snapshot is dated 18 October 2026. No complete current frontline dataset was verified. The ISP-Myanmar figure for resistance control of 38% of land and 87 towns is explicitly a **2025 retrospective assessment**, not a current percentage.

IISS reference geometry is retained for the requested local research/private-study preview. Its terms do not establish a public redistribution licence. `control/sources.json` records this restriction; publication would need a permitted replacement or permission.

## Laos

The map includes 17 provinces plus Vientiane Capital prefecture and all 148 districts, with English/Lao names, explicit PCodes and parent relationships. Vientiane province and capital remain distinct; Xaisomboon/Xaysomboun is included.

Geometry: National Geographic Department/UNICEF via [OCHA HDX COD-AB](https://data.humdata.org/dataset/cod-ab-lao), 2019, reviewed October 2025, CC BY 3.0 IGO. Population: Lao Statistics Bureau/UNFPA **2024 projections based on the 2015 census**, via [OCHA HDX COD-PS](https://data.humdata.org/dataset/cod-ps-lao). All 148 district codes and parents join exactly; both administrative levels sum to 7,631,798. The values are projections, not 2025 census results.

## Geometry and regressions

New subdivision fills are aligned to complete detailed outlines of China, India, Thailand and Vietnam, with Laos aligned to Myanmar. Seven full shared border arcs are drawn once through the atlas frontier layer. Inland water is removed from detailed fills and world fallback land; Myanmar's Inle and Indawgyi lakes use retained OpenStreetMap relations, ODbL 1.0.

Chinese province geometry is unchanged. The coastline filter now recognises exact shared polygon edges before trying side probes. This prevents probes at tight bends from mistaking Xinjiang–Tibet, Tibet–Qinghai and Xinjiang–Qinghai boundaries for shorelines. An independent regression checks 41,789 shared mesh segments against the actual rendered line data (125,367 probes within 0.6 m, including existing sub-metre retraces and international stroke rounding).

Regenerate with `npm run build:myanmar-laos`; validate with `npm run test:myanmar-laos`, `npm run test:china-province-continuity`, `npm run test:browser:myanmar-laos` and `npm run test:browser:china-province-continuity`. Retained inputs have SHA-256 checksums in `scripts/boundary-sources/myanmar-laos/manifest.json`.

Local preview: `npm start`, fixed at http://127.0.0.1:4174/.

## Verified locally

Data checks passed for all 478 second-level units, source checksums, parent relationships, non-overlap, population totals, lake cutouts and 408,090 shared-border stroke/fill probes. The independent China outline test passed 125,367 probes. Desktop/mobile checks passed for subdivision selection, native label languages, saved views, quizzes, overlay visibility and cache reload; all seven new-country shared border arcs rendered. Existing country registry, label anchors, regional loading, color scales, world-land budget, compact assets, China packs, southern China frontiers and naming quiz checks passed.
