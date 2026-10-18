# Largest US municipalities: population and flags

The local atlas adds Census population cards for the 500 largest functioning municipal governments represented by its Municipalities layer. The figures are July 1, 2025 estimates from the Census Bureau's Vintage 2025 subcounty release, published May 2026. Source bytes and SHA-256 are pinned in scripts/us-municipal-fact-sources.json and retained in compressed form under scripts/statistics-sources/united-states/.

## Ranking and identity

The build matches whole-government Census summary levels 162 (incorporated places), 061 (minor civil division governments) and 170 (consolidated cities), using exact geographic identifiers. It ranks 35,648 active general-purpose governments (functional status A/B/C), then takes 500. It excludes county/place parts, metropolitan populations, CDPs, statistical city balances and subordinate special-purpose townships.

Cities, towns and functioning townships are included. Distinct overlapping governments remain distinct; their populations must not be added as disjoint areas. Consolidated Indianapolis and Louisville use whole-government counts rather than their statistical balances. Hempstead town is distinct from Hempstead village. Governments represented elsewhere in the atlas, such as Hawaii's county government and DC, retain their existing population and flag cards at those levels.

The cutoff is 84,647 residents. The complete ranked list, source names and summary levels are in dist/data/europe/united-states/municipalities/top500.json. The records reference their own 2025 land areas and never inherit county/state population or GDP.

## Flag sources

Every targeted government is audited. Geographic-ID-matched Wikidata entities and the specific municipality's Wikipedia page identify candidate artwork. State/county identity is retained to distinguish similarly named places and towns from villages or cities. Commons/Wikipedia artwork records supply originals, dimensions, authors and licensing metadata. Remaining city gaps are checked against state-specific Flags of the World references, using current-flag sections and excluding former designs, proposals, organization flags and uncertain reconstructions. Alternative filenames require state-specific identity evidence.

Proposed or explicitly unofficial designs, stand-alone seals, logos, map illustrations and ambiguous geographic matches are omitted. The review found sources for 423 of the 500 targeted governments. A missing image means no sufficiently sourced flag was added; it does not assert that the municipality has no official flag. Anaheim's explicitly unofficial rectangular variant is omitted. Capital Township does not inherit Springfield's city flag.

The reviewed source lists and exclusions are in scripts/us-municipal-flag-files.json and scripts/us-municipal-fotw-flag-files.json. Cached artwork and source hashes are recorded in dist/data/us-municipal-flag-sources.json and dist/data/us-municipal-fotw-flag-sources.json. The latter adds 56 flags supported by current municipal-use references. Source copyright and licensing labels are preserved; Wikipedia fair-use labels describe that source's rationale, not a general reuse license.

Original images are stored unchanged. Lossless WebP thumbnails preserve proportions and open the exact original through the existing flag viewer. Existing national and state flags retain their behavior.

## Loading and rebuilding

A small facts file adds rank and flag metadata to the existing search records. Images are requested only for the selected municipality. The catalogue never embeds image bytes, and the three-country memory cap and one-state geometry limit remain intact.

Population cards use the shared statistics renderer, including date and source link. Unranked municipalities retain their existing area card and do not inherit a preceding city's population. Population/density colors contain only the 500 actual municipal metric records, while reporting full coverage totals; missing units stay marked as no data.

- node scripts/prepare-us-municipal-facts.mjs — reproduce the ranking, statistics and compact facts from the pinned Census snapshot and prepared flags.
- node scripts/fetch-us-municipal-flags.mjs — fetch the reviewed originals and lossless thumbnails; validate hashes, resume local copies and respect Retry-After.
- node scripts/fetch-us-municipal-fotw-flags.mjs — restore the 56 additional reviewed flags from cached originals or their pinned sources, checking SHA-256 before accepting them.
- npm run build:us-municipal-facts — update facts, shared flag viewer metadata and population colors.
- npm run test:us-municipal-facts — exact source/ranking and artwork audits.
- node scripts/browser/run.mjs us-municipal-facts — desktop/phone cards, flags, original viewer, reload and eviction.

Preview locally at http://127.0.0.1:4174/ and press Ctrl+Shift+R. Try New York NY, Chicago IL, Los Angeles CA, Hempstead town New York and Louisville KY. No publication is part of this change.

Official population release: https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html
Census file layout: https://www2.census.gov/programs-surveys/popest/technical-documentation/file-layouts/2020-2025/SUB-EST2025.pdf
