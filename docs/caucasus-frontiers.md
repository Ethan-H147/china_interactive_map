# Caucasus shared borders

The Russia–Georgia–Azerbaijan junction is 46.422069°E, 41.908043°N. The separate Armenia–Georgia–Azerbaijan junction is 45.014969°E, 41.297014°N; Armenia does not border Russia.

Pinned OSM country relations and their shared, non-maritime ways are retained in `scripts/boundary-sources/caucasus-frontiers/`. The manifest records original URLs, checksums and attribution. `caucasus-frontiers.mjs` extracts one matching path per adjoining pair. The northern Armenia–Azerbaijan correction rejoins the retained border after 20 km; other enclave references and claim/control notes remain unchanged.

`npm run build:caucasus-frontiers` reconciles the adjoining regions and Russian districts, preserves district names and reported statistics, updates mapped areas, and refreshes country/background geometry, owned strokes and generated previews. Russia and Caucasus/Gulf rebuilds apply it last. Global border rebuilds retain the two Russian strokes without restoring their older copies. Only land borders get strokes.

`npm run test:caucasus-frontiers` checks both exact junctions, all shared vertices and segment midpoints in detailed and background geometry, opposite-side coverage, district coverage/names/labels, country counts, retained unrelated silhouettes and desktop/mobile rendering.

The Indonesia/Philippines renderer separately hides its coarse portal fill once the detailed overview is loaded. It retains the fallback during loading and restores it when leaving. Visibility intent uses the shared map scene so offscreen culling cannot accidentally re-enable a coarse fill. `npm run test:archipelago-fill` checks Belitung, Bali and the Mahakam delta, including country switching on desktop and mobile.
