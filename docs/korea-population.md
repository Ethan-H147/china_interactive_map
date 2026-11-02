# Korea population cards

Korea uses the common country page and statistics renderer. Population cards are explicitly enabled for Korea because its statistics share region-statistics.json with countries that have separate population controls.

South Korea: 16 first-level units use the retained MOIS September 2026 resident-registration snapshot, totaling 51,082,431 registered Korean nationals. Foreign residents are excluded. All 229 mapped city/county/district units use the matching September 2026 MOIS administrative-area export. Exact administrative codes and Korean names match every unit. Each region with mapped children reconciles exactly to its child totals. The EUC-KR CSV is retained compressed, with a SHA-256 hash, beside its normalized code/name/population rows. Registration-scope details are available through a keyboard- and touch-accessible info icon.

North Korea: retained dated Wikidata statements from the 2008 census supply historical figures where one unambiguous value exists. Pyongyang's administrative total is checked against census Table 2, printed page 22 (3,255,288); conflicting city/locality statements are not interchangeable. Sources link to the retained statement's entity. These are historical census areas, not current population estimates. Detailed scope and boundary notes use the same population info popup as South Korea; the historical census year stays visible. Nampo and Kaesong describe older city extents; current special-city boundaries differ. Regional and city values may overlap. Historical totals are excluded from population-density calculations using current map areas. Unmatched or ambiguous records remain without population; no values are allocated from parents.

Rebuild: node scripts/prepare-korea-population.mjs (or the full prepare-region-statistics.mjs builder).

Check: node scripts/validate-korea-population.mjs and node scripts/browser/run.mjs korea-population.
