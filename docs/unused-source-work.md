# Unnecessary map preparation

An audit of Japan, China, Brazil, Russia, Indonesia, Canada, the United States and the United Kingdom followed the international-border ownership fix. That fix already applies worldwide. This audit counted native tile requests, source preparation, buffer uploads and actual GL draws during camera movement.

Additional changes:

- Permanent Canadian, major world and American inland-water overlays now use conservative source extents for off-screen and globe-horizon culling. Their source IDs, geometry, paint and ordering stay the same. Visible lake surfaces return within the existing camera guard band.
- The coverage builder includes configured country control-boundary files, including Cyprus's division line. These otherwise requested empty tiles around the world. Country claim rules and border geometry remain intact.
- The shared regional loader skips the verified empty neighbour files for Chile, Peru and Paraguay, including their fetches and worker/source setup. The geographic culler also treats verified empty extents as empty rather than unknown; genuinely unknown sources remain available.
- Map and city quiz visibility enforcement reads the existing scene layer inventory instead of serializing the complete map style and its sources on repeated style callbacks. Quiz geography, feedback and restoration use the same installed layers.

The existing selection-fill residency and country rendering pipeline remain in place. Coverage metadata is regenerated from the current local geometry, including the earlier Egypt edits; no lake or boundary coordinates change in this work.

Checks:

- `node scripts/validate-context-visibility.mjs`: retained source hashes and conservative extents, empty/unknown handling, wrapping, water re-entry, intended visibility and context recovery.
- `node scripts/validate-empty-map-sources.mjs`: empty inputs skip transport/setup; nonempty, unknown and explicitly required sources retain their data and options.
- `node scripts/validate-quiz-layer-work.mjs`: repeated enforcement and restoration without full source serialization.
- `node scripts/browser/run.mjs unused-source-work africa-border-zoom`: desktop/phone tile counts and pixel comparisons with culling enabled/disabled, including visible lakes, Cyprus, globe, flat map, the date line and polar views.

The audit reports in `artifacts/render-work-before.json` and `artifacts/render-work-after.json` measure work submitted by a test browser. They do not measure the foreground Windows compositor's presented frame rate.
