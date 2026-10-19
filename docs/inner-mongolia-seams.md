# Inner Mongolia: full shared borders

The local atlas now reconciles Inner Mongolia's entire boundary with all eight neighboring provinces: Heilongjiang, Jilin, Liaoning, Hebei, Shanxi, Shaanxi, Ningxia and Gansu. The four northeastern/eastern borders highlighted by the user are covered in full, including the enclosed Heilongjiang section and Inner Mongolia’s detached component. Initial vertex-only inspection missed bowed segments on Gansu's copy; the complete arc comparison caught those too.

The existing detailed Inner Mongolia outline supplies each shared arc. Its area and outline are preserved. Neighboring prefecture polygons are aligned to those complete arcs before deriving the parent province unions and shared boundary mesh. Two short Shaanxi–Shanxi and Shaanxi–Ningxia connectors meet the same junction vertices, preventing overlaps where three provinces meet.

County shapes are clipped to their corrected prefectures. Small uncovered border patches join the nearest adjacent county, following the atlas's existing county-coverage method. The enclosed component retains its existing Jagdaqi county identity and uses its complete parent boundary. Guards reject large losses of existing county interiors or unexpectedly large gap fills. County identities and internal boundaries remain available; all 2,728 county records are retained. Jilin's exact fill triangles are regenerated to keep its special fill renderer synchronized with the corrected province geometry. Precise and overview packs, motion geometry, context and compact assets are rebuilt together.

Retained inputs: `scripts/boundary-sources/inner-mongolia/before.bin`, its SHA-256 manifest, full reference arcs, and the previous county shapes. The repair uses existing atlas geometry rather than introducing a new boundary survey or changing national claims. Country/coastal outlines remain within 0.1 m of their previous geometry.

Validation checks 12,192 samples along the complete eight shared arcs plus enclosed/detached components, county coverage and 7,174 probes of land ownership on both sides of every border. It rejects overlapping repaired provinces and checks parent/child coverage. Browser checks use actual former empty gap interiors on every border at two zoom levels on desktop and mobile, followed by selection and panning.

Regenerate with `npm run build:inner-mongolia-seams`. Normal province and county rebuilds also apply the repair. Checks: `npm run test:inner-mongolia-seams` and `npm run test:browser:inner-mongolia-seams`, alongside the existing China boundary, county, fill, pack, motion and selection checks.

Local preview: http://127.0.0.1:4174/#china. No publication was performed.

Existing China boundary, county identity/coverage, Jilin fill, packed-source, motion, compact-asset and western province regressions also passed.
