# Russia historical rendering

Russia's historical scene uses prebuilt vector tiles in the existing `russia-first`
source and four existing first-level layers. The other two first-level sources
are absent during history. Leaving history recreates all three modern source
definitions and restores their layer definitions. The United States and United Kingdom share this backend; see
`historical-vector-renderer.md`. Other countries retain their existing paths.

The snapshot suppresses replaced modern context only where the chronology
covers its complete land. Modern Poland retains its neutral backdrop because
its western regions fall outside the historical footprint. The snapshot's opaque
cells still own the historically mapped portion.

The build resolves the retained history's canonical path references and verifies
every referenced source hash. It compiles one partition for all 39 dates. Dates
change colors and line opacity; they never replace geometry, source URLs or
filters. Political boundaries and selected outlines come from the same shared
edges. Tile clipping edges never become strokes. Both fill layers disable
per-face antialiasing to avoid internal selection seams.

Selection uses hand-picked counterparts in `russiaHistoricalSelectionColors`:
cornflower blue, warm amber, sage, golden ochre, rose and jade. The selected-fill
layer receives the same face-to-color table as the base fill, using these colors
before the shared appearance transform. The palette retains distinct hues and
avoids the appearance transform's dark-mode light-color threshold. No extra
layer or geometry update is involved.

Simplification uses the importance values of shared topology arcs for every
incident face. Thin ownership cells are retained even when their area falls
below the normal tile simplification threshold. Simplifying whole polygon rings
independently or dropping small ownership cells exposes artificial water slivers
between adjacent territories. This preparation happens only during the build;
the browser still receives standard immutable MVT tiles.

The browser loads roughly 100 KB of chronology metadata, a compressed tile
directory, and only the static chunks needed for visible tiles. It never resolves
the 28 original geometry files or constructs the chronology's GeoJSON index.
The retained authoring geometry remains the source of truth; generated tiles
are disposable delivery copies.

The native MapLibre vector-tile renderer manages visible tiles and parent-tile
fallback. The history path does not patch its source cache or tile index. Each
worker's immutable chunk cache is limited to 16 entries and 2 MiB, expires after
60 seconds of inactivity, and shares in-flight requests. Cancelling the last
consumer cancels a chunk download. Index and chunk hashes are verified before
decoding. Cache keys include the content version.

Tiles refine through zoom 12, with extent 8192 and a 64-unit clipping buffer.
Lower zooms simplify by at most four tile units (one quarter of a 512-pixel tile
pixel). At zoom 12 the compiler retains the original paths before quantization;
the grid is approximately 1.2 meters at the equator and finer at Russian
latitudes. Zooms above 12 use native overzooming. Empty tiles and tiles consisting
of one solid face with no edges have identical solid descendants, which reuse
one payload. Every coast and political boundary continues refining.

`scene.bin` contains date tables, unit metadata, edge adjacency, interior-label
face IDs and a content manifest. `index.bin` is gzip-compressed BAT1: a 16-byte
header (magic, record count, max zoom, extent), then sorted 16-byte little-endian
records (tile key, chunk number, offset, length with a high terminal bit). The
tile key is `(4**z-1)/3 + y*2**z + x`. Numbered chunks contain independently
gzip-compressed MVT payloads. They work on the existing static preview without
range requests or a tile server.

Run `npm run build:russia-history` after changing historical ownership or a
referenced coastline. Run `npm run test:russia-history` for topology, tile,
cache, date, interaction, lifecycle and pixel rendering checks. The pixel tests
sample the framebuffer after rendering, including globe rotation, the date line,
the horizon, zoom reversals, selection and coastal water. These establish visual
coverage in headless Chrome; they do not establish frame rates on a physical
phone.
