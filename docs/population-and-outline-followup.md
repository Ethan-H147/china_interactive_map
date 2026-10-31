# Population and outline follow-up

All 36 numeric discrepancies identified in the supplied 2020 census workbook are now applied across 35 regions. Prior website figures and exact source cells remain in the comparison audit as resolved corrections. The population cards and China's population shading now use the workbook totals. Blank cells remain unreported.

Two further shared arcs align Tianjin with Tangshan and Cangzhou. Five complete Qitaihe boundary arcs are shared with its neighbors, closing the mismatched edge that prevented an outline segment from being drawn. Affected county layers are nested to their repaired parents. Rebuild with npm run build:langfang-seams.

The focused missing-outline audit checked 181,180 segments across all 333 mainland prefectures and found no candidates under its criteria. It excludes coasts and province edges, which have separate rules. Eight further first-level country datasets were spot-checked on exact shared edges: Germany, France, the United Kingdom, Austria, Romania, Egypt, India and Australia. No missing segments were found in those spot checks. This is not an exhaustive worldwide audit. Full results are in china-outline-audit.json and outline-spotchecks.json.

Run node scripts/validate-remaining-seams.mjs for 856 shared-edge and ownership checks, and node scripts/browser/run.mjs remaining-seams china-census for desktop and phone checks. The all-country region-color validator has an existing Micronesia count assertion (0 versus an undefined expected count); the focused China checks verify the corrected values independently.
