# Pakistan and Kazakhstan

Added locally on 18 October 2026. Both use the shared country adapter, search, saved views, settings, population shading, full selected outlines and first-level quizzes. Both are recorded in the country addition log. No publication is part of this change.

## Administrative coverage

Pakistan contains four provinces, Islamabad Capital Territory, and the Pakistan-administered territories of Azad Jammu and Kashmir and Gilgit-Baltistan. FATA is incorporated into Khyber Pakhtunkhwa. Geometry is the WFP/OCHA HDX COD-AB snapshot valid 9 September 2022, reviewed September 2024, under CC BY 3.0 IGO. This is the seven-unit first-level structure described by the Pakistan Bureau of Statistics. The available district and tehsil layers miss subsequent reorganizations and are not exposed.

Kazakhstan contains 17 regions and three cities of republican significance: Astana, Almaty and Shymkent. Abai, Jetisu and Ulytau are separate regions. The CC BY 4.0 geokz January 2024 boundaries are pinned to commit 41c1a00454ec9e01bda031b5074920bd82de02ce and credited to Alexander Rodionov. The 20 first-level identities are checked against the July 2026 official inventory. Baikonur is an additional selectable special-status city, with the geokz KATO 431900000 city polygon separated from the Kyzylorda display fill. It remains part of Kazakhstan and is leased to Russia until 2050, as documented by the city administration. The cosmodrome lease area is not mislabeled as the city. There are 21 map units; this does not change the official count of 17 regions and three republican cities. The rest of the obsolete district layer is omitted. KATO and source PCodes are retained; historical ISO letter codes are not relabeled as current identifiers.

## Facts and rendering

Pakistan's five PBS reporting units use the 2023 census, totaling 241,499,431. This total excludes AJK and Gilgit-Baltistan. Their separate 2023 figures, 4,333,467 and 1,709,049, come from their respective official 2025 statistical publications. Kazakhstan's regional estimates are dated 1 September 2026 and sum to 20,618,796. Kyzylorda population and statistical area retain the whole-region scope, including Baikonur. A separate city population is not supplied or added to the national total. No unsupported GDP figures are added.

Shared border adjustments follow the existing China and Russia geometry within conservative distance and stretch limits. The build rejects any adjustment that removes more than five percent of a first-level unit, preventing topological loss near the Caspian coast. Named lake polygons are removed from land fills. The source coastlines remain distinct from international borders; Pakistan's control-line classification is retained.

The regular Pakistan–India frontier follows one continuous retained India outline, including every river bend. Pakistan Punjab and Sindh land edges match it exactly; each country view draws the same resolved line once. Existing Kashmir claim and control-line coverage is preserved. Mangla and Tarbela reservoir water is excluded from the India and Pakistan land, portals and world fallback. Claim ownership is determined before water removal, preventing isolated claim-line fragments inside reservoirs. Pakistan provincial boundaries retain their full political paths through water. India first-level geometry changes only to exclude Mangla water; the affected mapped land area is recalculated. Its source claim and neighbor display is reconciled with Pakistan's portal; retained input snapshots make this operation reproducible. The new full Pakistan/Kazakhstan portals replace their old background fragments. Kashmir coverage describes the source's administration and does not establish sovereignty.

Sources and hashes are retained under scripts/boundary-sources/pakistan-kazakhstan, with public coverage and attribution in each country's sources.json. Flag artwork is retained locally with provenance.

## Rebuild and validation

`npm run build:pakistan-kazakhstan` fetches verified retained inputs, builds the datasets, reconciles context, and refreshes world/compact/flag/color assets. `npm run test:pakistan-kazakhstan` checks identities, current units, populations, land centers, region preservation, overlaps, water, sources and logs. `npm run test:pakistan-kazakhstan-browser` checks desktop and phone search, fills, selected borders, saved views, map clicks, quizzes, camera behavior and cleanup.

## Northern disputed-area rendering

The India background silhouette now follows the same continuous northern path as the displayed Pakistan land edge. Full outline runs replace the mismatched background survey, preventing alternating gaps and overlap strips. The path includes the Siachen sector and reaches the actual shared Chinese edge; it does not stop at the coarse control-line reference endpoint. Nearby legacy Indian claim strokes remain available in India view and are hidden in Pakistan view. Detailed administrative identities, source claim extents and statistics are unchanged.

`validate-kashmir-frontier.mjs` checks both sides of every segment, complete stroke coverage, duplicate-claim visibility, the southern junction and the northern extension. Browser checks cover Jammu, Kashmir and Siachen at close zoom on desktop and mobile. The shared Pakistan/Kazakhstan test commands include these checks.
