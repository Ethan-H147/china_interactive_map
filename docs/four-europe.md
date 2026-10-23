# Bosnia and Herzegovina, Croatia, Romania and Belarus

Added locally on 23 October 2026. This change is not a deployment.

The countries use the shared regional renderer, navigation, search, quizzes,
selection styling, statistics cards, flags, comparison controls and saved views.
No separate rendering implementation or country-specific selection widths are added.

## Administrative coverage

- Bosnia and Herzegovina: two entities and Brčko District; ten Federation cantons,
  79 Federation municipality polygons, and 62 Republika Srpska municipality
  polygons. Republika Srpska municipalities have no intervening canton; Brčko
  is not duplicated. The retained geoBoundaries 2013 reference predates later
  changes, including the creation of Stanari. Its erroneous Istočni Stari Grad
  entity assignment and the misspellings of Višegrad and Krupa na Uni are corrected.
- Croatia: 20 counties and Zagreb, with all 556 GISCO 2024 local areas.
- Romania: 41 counties and Bucharest, with 3,181 GISCO 2024 local areas,
  including Bucharest sectors. Individual villages are not municipality polygons.
- Belarus: six regions and Minsk city, with 118 district reference polygons.
  The OCHA source's Minsk equivalent is shown once at the first level. This is
  the 2019 boundary release, valid in 2022 and reviewed by OCHA in November 2024.

Parent geometry is dissolved from the same local mesh, including Bosnia's
mixed hierarchy. Shared borders follow existing neighboring atlas geometry;
new shared frontiers have a single drawing owner. Near coastal endpoints,
source topology cleaning can trim up to 2.5 km along an arc. Inland alignment
is checked within five metres. This is a display alignment, not a new survey.
World fill, packed context, coverage and resident globe geometry include all
four countries. Generalized residual world shoreline strokes within 200 m of
new owned land frontiers are suppressed to avoid duplicate outlines.

## Statistics

Croatian and Romanian local population uses the GISCO 1 January 2024 release.
County totals sum those constituents. Regional GDP and GDP per capita use
Eurostat's latest available matching observation year, with annual exchange
rates for USD comparisons. Smaller-unit GDP is not estimated.

Bosnia's entity and canton populations use the official 2013 census, printed
pages 28–30 of *Final Results*, and are visibly marked historical. Municipal
population and regional GDP are not assigned. Belarus regional and district
population/GDP are not populated by this release. Missing observations remain
missing rather than appearing as zero. All four have separately dated World
Bank national population and current-price GDP figures.

Sources and SHA-256 checksums are retained in
`scripts/boundary-sources/four-europe/manifest.json`, including original census
PDF and provider metadata. GISCO inputs retain the original full-release hash
and document the country extraction. National flags retain original SVG artwork.

## Local rebuild and verification

Run `fetch-four-europe.mjs`, `register-four-europe.mjs`, and
`build-four-europe.mjs`; then regenerate the four color datasets, flag images,
world land, run `finalize-four-europe.mjs`, and refresh compact copies. The
builder's `--resume` reuses retained aligned local meshes without repeating
the frontier operation.

Run `validate-four-europe.mjs`, `validate-countries.mjs`,
`validate-world-country-outlines.mjs`, `validate-context-visibility.mjs`,
`validate-compact.mjs` and browser scenarios matching `four-europe`.
