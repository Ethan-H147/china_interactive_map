# Timor-Leste

Added 18 October 2026 for local preview. The country picker, search, selection, saved views, population shading and first-level quiz use the shared regional renderer. The country log records the addition.

The map contains 14 first-level units: 13 municipalities, including Ataúro, and the Special Administrative Region of Oe-Cusse Ambeno. Ataúro is removed from Díli and has its own map destination. Jaco Island remains part of Lautém.

Geometry comes from the licensed DGE/OCHA 2020 administrative boundary snapshot distributed through HDX (CC BY-IGO). The former Ataúro administrative-post polygon supplies the island's exact shape; its municipal status dates to 1 January 2022. The common Indonesian frontier follows the existing BPS West Timor geometry in detailed land, background views and border strokes. Context retains the exact Timorese land shape. Retained downloads and SHA-256 hashes are in `scripts/boundary-sources/timor-leste/manifest.json`.

Population values are the Ministry of State Administration's September 2025 municipal register, totaling 1,520,586. The interface labels the date and method. These values are not a census or an estimate for 2026. Administrative posts and sucos are withheld because the licensed lower-level geometry predates current divisions; the July 2026 legal list recognizes 472 sucos.

Rebuild with `npm run build:timor-leste`. Validate with `npm run test:timor-leste` and `npm run test:timor-leste-browser`. The tests cover identities, land and water, municipal overlaps, the Indonesian border, source hashes, search, saved views and quizzes on desktop and phone widths.

## Borneo outlines

The existing reconciled Malaysian and Indonesian land shapes already matched. Their outline builder still tested the coarser Natural Earth land mask on both sides of each edge, which incorrectly discarded some inland frontier segments. The builder now preserves the complete reconciled Borneo path before applying that coastline heuristic. Timor's shared frontier receives the same treatment.

`node scripts/validate-borneo.mjs` checks actual stroke coverage as well as polygon alignment at every level. `node scripts/browser/run.mjs borneo-continuity` checks rendered outlines from both countries at three zoom levels.
