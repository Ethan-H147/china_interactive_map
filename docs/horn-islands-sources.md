# Horn of Africa, Great Lakes and Maldives maps

These countries use the shared regional renderer, search, statistics cards and three first-level quiz modes. Country overview pages remain hidden. Changes stay local until publication is explicitly requested.

| Country | Reference geography | Search coverage |
| --- | --- | --- |
| Ethiopia | OCHA 2025 | 14 regions / chartered cities, a separately labeled contested reference area, 107 zones, 1,148 woredas |
| Somalia | OCHA 2025 operational reference | 18 reference regions and 91 districts |
| Uganda | OCHA 2020 boundary reference | Four statistical regions, 135 district polygons and 203 county reference areas |
| Rwanda | NISR 2018 boundary release | Five provinces / Kigali City, 30 districts and 416 sectors |
| Burundi | OCHA 2026 release | Five provinces, 42 communes, 451 zones and 11 protected-area reference pieces |
| Maldives | Government OneMap May 2024 island registry | 21 atolls / Male City and all 1,560 island features |

Somaliland remains within the Somalia country entry. Awdal and Woqooyi Galbeed show the Somaliland flag and administration notes. Togdheer, Sool and Sanaag describe the distinction between reference regions, competing claims and current administration. The boundaries do not imply current control. The notes cite the [EUAA 2026 report](https://www.euaa.europa.eu/somalia-security-situation/27-sool-sanaag-cayn-and-north-eastern-state-nes).

Maldives searches include inhabited, uninhabited, resort and reclaimed islands, with native names where supplied. The source names 1,131 features; the remaining 429 display as unnamed islands and remain searchable by their official FCODE. Atoll polygons contain island land, with no lagoon or administrative sea-buffer fills. Source and license: [Maldives OneMap](https://readme.onemap.mv/).

Population observations retain their source years. Somalia uses regional PESS 2014 estimates; Uganda uses the rows' 2022 reference year; Rwanda uses verified NISR 2022 census province and district totals; Maldives uses the 2022 atoll / Male census totals. Old Burundi province counts are not transferred to the new five-province geography. The inconsistent Rwanda COD-PS 2023 provincial table is not used. National World Bank figures are not allocated to subdivisions.

Geometry is reconciled to displayed parent boundaries and existing neighboring maps. Numerical returns narrower than half a metre are removed, and shared country strokes follow the displayed land on both sides. Kenya, Tanzania and Congo retain their subdivision geometry; their background contexts now match that geometry. Inland lake water is excluded, including an OSM Lake Tana mask that retains its 56 island holes. Source disagreements around the Ilemi junction are reconciled to the atlas's displayed Kenya and Ethiopia coverage; this is not a current-control map.

The retained source manifest records source URLs, licenses and SHA-256 hashes. Extracted source members are pinned in `scripts/boundary-sources/horn-islands/`; bulky download archives are unnecessary for a normal build.

Run from the atlas checkout:

```sh
npm run fetch:horn-islands  # Populate / verify pinned sources if needed
npm run build:horn-islands # Local generation only
npm run test:horn-islands  # Source, hierarchy, land-border probes and browser checks
npm run test:deployment    # Existing application, cache, compact data and quiz checks
```

The border audit probes both sides of every new land-frontier segment at ten metres and fails if either side lacks land. Hierarchy checks also reject gaps or overflows wider than the one-metre numerical tolerance. Browser checks cover all six country routes, selected details, flags, imagery, quizzes, link restoration, and Maldives island searches on a phone-sized viewport.
