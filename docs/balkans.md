# Remaining Balkan countries

Local additions on 23 October 2026: Albania, Montenegro, Kosovo, Serbia,
North Macedonia and Bulgaria. Greece, Turkey, Slovenia, Croatia, Bosnia and
Herzegovina, and Romania already have atlas pages. No commit or deployment
is part of this change.

All six use the shared map renderer, region navigation, search, first-level
quizzes, statistics, saved views, selection widths and original national flags.

## Coverage

| Country | First level | Local level | Boundary reference |
| --- | --- | --- | --- |
| Albania | 12 counties | 61 municipalities | GISCO 2024 |
| Montenegro | 25 municipalities | No invented extra tier | OpenStreetMap snapshot, 23 October 2026; GISCO 2024 land coast |
| Kosovo | 7 statistical districts | 38 municipalities | GISCO 2024 district reference; geoBoundaries / OSM 2017 municipal reference |
| Serbia | 24 districts and Belgrade | 168 local reference areas | GISCO 2024, including city municipalities |
| North Macedonia | 8 statistical regions | 80 municipalities | GISCO 2024 |
| Bulgaria | 28 provinces | 265 municipalities | GISCO 2024 |

Montenegro includes Tuzi and Zeta. The ten Skopje city municipalities are
retained individually; the whole city is not duplicated. Sofia City and the
surrounding Sofia province are separate.

Kosovo is shown according to its separate administration; its status is disputed
and Serbia claims it. Serbian regional geography and economic statistics exclude
Kosovo. This follows the scope of the retained statistical sources rather than
assigning the same land or population twice.

Parent polygons are dissolved from one local mesh. Complete shared frontier
arcs reuse existing neighboring atlas geometry, and each stroke has one owner.
New neighboring countries share the same path. The existing Croatia–Montenegro
stroke previously continued around part of the Prevlaka coast: shared OSM way
identities now locate the coastal endpoint on the retained Croatian survey.
The correction also updates the earlier country generator and retained frontier.
The Romania–Serbia–Bulgaria, Serbia–Bulgaria–North Macedonia and
Albania–North Macedonia–Kosovo junctions use exact vertices shared by all three
retained country geometries. Complete two-border runs preserve the interior
corner when the older Kosovan geometry is reconciled. The proof is retained in
`verified-junctions.json`. Border lines are clipped at exact lake intersections
so no dangling segment continues into a cross-border lake. Turkey's older
unlabelled copy of the Bulgarian border is removed segment by segment.
Interior replacements are checked within five metres; source coastline cleaning
can trim endpoints within a 2.5 km allowance. Lake surfaces are removed and lake
shore strokes are omitted, including selected outlines.

## Statistics and provenance

Bulgarian and North Macedonian municipal populations are the GISCO 1 January
2024 reference; regional populations sum the same local units. Albania and
Serbia have all-zero placeholders in the geometry source, so those local values
are omitted. Their regional populations use the latest available separately
dated Eurostat observations instead. Eurostat GDP and GDP per capita are shown
for all 12 Albanian counties, 25 Serbian districts, eight North Macedonian
regions and 28 Bulgarian provinces, with annual EUR/USD exchange rates matching
the economic observation year. Municipal GDP is not inferred.

Montenegrin and Kosovan subnational population and GDP are not assigned by this
release. All six countries have separate World Bank national series, with their
own observation years. Missing values remain unavailable, never zero.

Sources, provider metadata, extraction scope and SHA-256 checksums are retained
under `scripts/boundary-sources/balkans/`. Full GISCO source checksums are checked
before extracting the six country subsets. OpenStreetMap data retains ODbL
attribution, and original flag SVGs retain their source URLs and checksums.

## Rebuild

Run `fetch-balkans.mjs`, `build-balkans.mjs`, then `register-balkans.mjs`.
Rebuild the six region-color datasets and shared flag catalogue, world land,
`finalize-four-europe.mjs`, `finalize-balkans.mjs`, and compact copies.
`clip-balkan-lake-borders.mjs` runs automatically after the country build;
`refresh-balkan-world.mjs` refreshes final Balkan fallback geometry without
changing other country or foreign land following a local frontier adjustment.
`build-balkans.mjs --continue` reuses completed aligned country meshes;
`--resume` reuses all retained aligned meshes for a statistics/content rebuild.

Checks: `validate-balkans.mjs`, `validate-countries.mjs`, world-outline and
context-coverage checks, compact-copy checks, and browser scenarios matching
`balkans`. Browser checks cover desktop and phone layouts, original flags,
deep selection, saved views, statistics and quizzes, plus the shared borders
from a third-country view.
