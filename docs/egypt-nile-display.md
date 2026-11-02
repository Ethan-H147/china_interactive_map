Egypt's Nile display
===================

The retained 2017 Egyptian reference excludes the Nile channel from its administrative land polygons. The resulting bank detail and river islands increased the governorate fill to 112,777 vertices in 888 polygon parts. `scripts/egypt-nile.mjs` fills the connected river channel for display, reducing it to 69,612 vertices in 318 parts. The shared renderer and its timing are unchanged.

The fill extends from a cross-section north of the Aswan reservoir to cross-sections near the Rosetta and Damietta mouths. Temporary cross-section polygons isolate the river from the sea and reservoir; they are used to identify the channel and are not added to the map. Topological buffers divide that channel between adjacent units without covering existing bank land. Districts are clipped and reconciled to their filled governorate. Shared border meshes are regenerated from these partitions, so borders continue through the former water gaps.

Lake Nasser, other existing lake exclusions, the Mediterranean and Red Sea coasts, and international frontier strokes remain in place. This is a display change, not a cadastral boundary source. Existing population, mapped land-area statistics, identifiers, parent relationships and label centers are preserved. Catalogue bounds and chunk sizes follow the new display geometry.

Rebuild the existing Egypt assets with `node scripts/egypt-nile.mjs`. The operation is idempotent and updates Egypt's context and its entries in world land and the resident overview, including existing compact copies. Other countries and the international-border buffer are preserved. The normal coastal/Oceania country builder also runs the Egypt transformation after producing its source-derived country assets; its subsequent world integration uses that context.

Verify with `node scripts/validate-egypt-nile.mjs` and `node scripts/browser/run.mjs egypt-nile`. The browser checks cover desktop and phone layouts, river fills, border crossings, lake exclusions and district navigation. Geometry reduction measures the rendering workload; it does not establish the frame rate on a particular laptop.
