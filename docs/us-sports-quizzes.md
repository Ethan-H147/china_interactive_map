# US sports quizzes

Added locally on 29 October 2026 under United States → Miscellaneous. Existing College towns, Sports towns, history, medals and drafts retain their original identities.

| Quiz | Difficulty | Included teams |
| --- | --- | --- |
| College football | Power Four | 67 |
| College football | All FBS | 138 |
| Baseball | MLB, one pool with no difficulty selector | 30 |
| Soccer clubs | MLS | 30 |
| Soccer clubs | MLS + USL Championship | 55 |
| Soccer clubs | All three leagues, adding USL League One | 72 |

These are reviewed 2026-season snapshots. College football covers FBS, including 2026 transitioning members; its first level contains the 17 ACC, 18 Big Ten, 16 Big 12 and 16 SEC football programs. Independents, including Notre Dame, appear in All FBS. Hawaii remains included and visible within the college pack’s bounds. League quizzes retain the Canadian MLB and MLS members.

All three quizzes reuse the shared dot-quiz controller in `dist/city-quiz.mjs`. All modes retain the common answer feedback and color rules. Click mode shows authentic team artwork beside the question; typing modes hide it. Preview supports the ordinary hover tooltip and persistent clicked team details, using the same larger logos, city and stadium layout as European football. Baseball uses a single internal scope but shows no difficulty selector in either the sidebar or account menu.

Source packs live in `scripts/us-sports-sources/{college-football,baseball,soccer}/`. Each retains roster and venue responses, original logos, attribution, SHA manifests, an offline builder and a validator. Current and temporary home grounds take precedence over obsolete provider venue entries. Examples include the new Northwestern Ryan Field, Hawai‘i’s Ching Complex, Athletics in West Sacramento, Rays back at Tropicana Field, Inter Miami’s new Nu Stadium, and Omaha’s Morrison Stadium. Clubs with regular alternate venues use their documented primary home and keep explanatory source notes. Stadium dots use actual ground coordinates rather than town centres.

`dist/us-sports-definitions.mjs` is the shared source for topic, difficulty, instructions, file paths and storage names. The US miscellaneous controller adds these topics to the existing menu and delegates them to the common dot controller. The account dashboard uses the same definitions for launch, personal bests and history. Recorded results use the existing level 3 schema with distinct dated `misc-<sport>-2026-*` scopes; drafts are isolated by sport and difficulty. No backend migration is needed.

Build with `node scripts/build-us-sports-quizzes.mjs`. Run each source folder’s `validate.mjs`, then `node scripts/validate-us-sports-quizzes.mjs` and `node scripts/browser/run.mjs us-sports-quiz`. Browser coverage exercises each sport on desktop and phone, cumulative counts, no baseball difficulty UI, Preview selection, authentic question logos, stadium/city feedback, highlighted naming, satellite switching, menu cleanup, independent drafts and account sync. Existing US miscellaneous and European football regression scenarios are also checked.