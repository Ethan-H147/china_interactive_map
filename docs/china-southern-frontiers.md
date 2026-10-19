# China–India and Pakistan–China outline repair

Local correction, 18 October2026. No new boundary claims or source surveys are introduced.

The western China–India frontier had 96 missing segments in a 311-segment source arc. The Pakistan–China frontier also had missing segments, and Pakistan's earlier edge-by-edge alignment retained small mismatched bends. Around Siachen, the shared China edge and the northern Pakistan–India display path ended at different points.

The repair follows the existing displayed China province outline as a complete path. It projects the retained Pakistan junction onto that outline, inserts the junction into the reference segment, and makes the three paths meet at one coordinate. Pakistan land and the western India background are rebuilt to that path. The pre-existing approximate diagonal in the source Siachen coverage is retained; no additional geographic detail is invented. Inland water remains excluded.

The repaired international strokes are stored once in atlas-frontiers.bin. Old overlapping strokes are removed. India's detailed claim geometry and its alternate claim strokes remain intact, while their source metadata keeps them from competing with the shared display path in other country views. Afghanistan's adjacent seam is rebuilt against the corrected Pakistan outline.

Reproduction: `npm run build:china-southern-frontiers`. The repair also runs during `build:borders` and `build:pakistan-kazakhstan`. Original affected inputs are retained with SHA-256 checksums in `scripts/boundary-sources/china-southern-frontiers/atlas-reference/`. The detailed processing report is `dist/data/europe/pakistan/china-frontier-reconciliation.json`.

Validation: `npm run test:china-southern-frontiers` and `npm run test:browser:china-southern-frontiers`. Tests sample the complete strokes, probe land on both sides, check the junction and duplicate strokes, compare retained claim geometry, and render former gaps at zoom8 and10. Desktop/mobile scenarios cover Afghanistan and Pakistan; another covers China. Existing Pakistan–India, Kashmir, Afghanistan/Kyrgyzstan and other resolved-frontier checks also run.
