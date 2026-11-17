# Native historical snapshots

Russia, the United States and the United Kingdom share
`dist/historical-vector-renderer.mjs`. Each chronology swaps the existing first
source to native vector tiles and reuses the same four map layers. Leaving
history restores the three modern source definitions, layer definitions and
international-border visibility. No historical overlay layer is added.

The US and UK retain their existing dates, unit records, cards and search. US
historical foreign/territorial cells use the final chronology's ownership table
to identify the present-day province beneath a click. US election maps keep the
existing election renderer and do not share the snapshot engine's lifecycle.

The build adapter reads the retained geometry, including the US coastal display
(already containing Alaska and the Upper Peninsula), Canadian Rupert's Land,
and all 17 UK physical-coast packages. It preserves the dated face assignments.
Neutral land and water corrections are features in the same tiled source and
fill layers. Water uses the current background color; detailed coast coverage
prevents the modern context renderer from loading a duplicate coastline.

All dates use one immutable partition. Date changes update paint only. Shared
arcs control adjacent ownership cells' simplification, preventing internal water
slivers. Neutral coast points inherit shared importance where available; water
corrections simplify normally. Quantized rings with no drawable area are omitted
from that tile, while original geometry still forces descendant refinement.
This avoids malformed MVT commands without dropping small islands at close zoom.

The main page loads `scene.bin` for chronology metadata. Native workers load the
smaller `manifest.bin`, the compressed tile directory and only visible chunks.
They do not load unit records, configurations, authoring geometry or coast
packages. The existing bounded chunk cache, cancellation, content hashes and
native parent-tile fallback apply to all three countries. No runtime historical
GeoJSON index, viewport mosaic, coast switching job or private tile-cache patch
is used by these snapshots. Other countries and elections retain their paths.

The delivery format and zoom/precision contract are described in
`russia-historical-renderer.md`. The generated US and UK archives are delivery
copies of retained geometry, not new historical sources. Static archive size is
not a per-session download requirement.

## Local verification

`npm run build:historical-tiles` rebuilds both delivery archives from retained
inputs. Build one with `node --max-old-space-size=14000
scripts/build-atlantic-history-tiles.mjs united-kingdom` (or `united-states`).
Changing retained coast/history inputs requires rebuilding their tiles.

`npm run test:historical-tiles` checks every source and archive hash, every tile
offset, every year's ownership and unit records, canonical land/water at several
zooms, and bounded cache reuse. Its browser scenarios render all 218 US and 319 UK
years, province and historical selections, independence transitions, overseas
search, modern restoration, US elections, coast pixels, zoom reversals, rotation,
phone layout and country changes. Russia's existing timeline, coastline, seam
and selection scenarios remain applicable to the shared renderer.

Dense geographic regressions remain in `uk-history-coast`, `uk-history-florida`,
`uk-history-north-america`, `uk-history-overview-borders`,
`historical-region-seams` and `historical-coast-water`. Their readiness and border
queries use the native source; paint-hidden edges are excluded when checking
visible strokes. These checks use headless Chrome and do not establish frame
rates on a physical phone.

## UK 1889 interaction cost

The retained chronology has 25,862 ownership slots, but its prepared physical
partition uses only 1,104 face IDs. Dissolved source cells remain in the authoring
tables for provenance; they must not inflate runtime paint or hover state.
Generated scene metadata lists geometry-backed IDs in `renderFaces`, including
all edge-adjacent cells. The renderer caches unit ownership for at most four date
configurations and returns the same compact hover membership for a date/unit.
Older scenes without this optional field retain their previous edge-based paint
rules, with cached hover membership.

In geometry-backed scenes, edges already carry their left and right face IDs.
Administrative lines compare
the owners of those faces, retaining the physical-coast and selection-only
exclusions. Selected outlines compare whether exactly one adjacent face belongs
to the selection. The optimized selected outline does not enumerate every coastline segment in a
paint expression. Repeated selection updates for the same date and unit do no
work. Geometry, source IDs, layer IDs, coast precision and tile caches are unchanged.

The UK 1889 performance scenario exercises actual drag/wheel input, compact
Canada hover membership and selected outline size. It complements the geographic
pixel, shared-border, selection, date and modern-restoration regressions; waiting
for tiles to finish alone does not establish smooth camera interaction.
