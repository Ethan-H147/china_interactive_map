# Xinjiang, Tibet and Qinghai: full shared-border repair

The previous coastline-filter change restored hidden stroke fragments but left mismatched province polygons. This repair reconciles the entire Xinjiang–Tibet, Tibet–Qinghai and Xinjiang–Qinghai boundary arcs, including the land fills on both sides.

The existing detailed Xinjiang edge supplies the Xinjiang–Tibet and Xinjiang–Qinghai arcs. The existing detailed Tibet edge supplies Tibet–Qinghai. One existing Xinjiang vertex anchors their common junction. No new administrative claims or external survey is introduced. The retained pre-repair geometry and reference arcs are under `scripts/boundary-sources/western-provinces/`.

Province boundaries are derived from reconciled prefecture polygons. County overlays follow the same arcs and are clipped and filled to their corrected prefectures. Province unions, boundary meshes, precise/overview packs, camera-motion geometry and background context are rebuilt together. Other provinces retain their geometry; China's outer/national edge stays within 0.1 m of its previous geometry.

The repair closes 159.093 km² of narrow source cracks across roughly 4,000 km of borders. Validation covers 5,835 samples of the complete arcs and 3,394 probes on both sides, verifies that province and county fills agree, checks parent/child coverage and identities, and rejects overlaps. Browser regressions use actual previously empty crack interiors across all three pairs, at two zoom levels on desktop and mobile, then test clicking and panning.

Regenerate with `npm run build:western-province-seams`. Normal boundary and county rebuilds also apply the reconciliation. Run `npm run test:western-province-seams` and `npm run test:browser:western-province-seams`, plus the existing China boundary, county, pack, motion, selection and international-frontier checks.

Local preview: http://127.0.0.1:4174/#china. No publication was performed.
