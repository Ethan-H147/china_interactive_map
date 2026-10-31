# Beijing, Tianjin and Langfang shared borders

The existing atlas had mismatched copies of the same boundary around Langfang’s northern exclave and southern component. Several joins left enclosed holes hundreds of metres wide.

The repair uses the retained Langfang outline for the four adjoining Beijing/Hebei and Tianjin/Hebei arcs, and the Beijing outline for the two connecting Beijing/Tianjin arcs. Complete boundary runs share the same vertices. Seven municipal districts are adjusted: Tongzhou, Daxing, Pinggu, Wuqing, Baodi, Jinghai and Jizhou. Langfang, its exclave components, its county boundaries and the surrounding Hebei prefectures retain their geometry.

Province fills are rebuilt from their subdivisions, and the shared border meshes, packed geometry and mobile source shards are rebuilt together. The pre-repair source and its hash are retained in `scripts/boundary-sources/langfang/`. No external survey or new administrative boundary is introduced.

Run `npm run build:langfang-seams` to reapply the fix and rebuild delivery assets. Run `npm run test:langfang-seams` and `node scripts/browser/run.mjs langfang-seams` to check shared-edge distances, two-sided ownership, absence of holes and overlaps, province/subdivision agreement, county coverage, and desktop/phone rendering. The main boundary build also reapplies these shared arcs.

Verification checked 3,042 shared-edge samples and 1,602 two-sided ownership probes, with zero local holes and no overlapping fills. Desktop and phone checks confirm that previously empty locations now render as land. The delivery checks pass. The older `validate-boundaries.mjs` check has an existing Inner Mongolia area-tolerance failure: both the original commit and this repair have the identical difference of 1.3238903306955763e-7 square degrees against its 1e-7 limit. The Inner Mongolia province and subdivision geometries are unchanged; that unrelated tolerance is not relaxed here.
