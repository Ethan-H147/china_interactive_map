# San Matías and Laguna Uberaba

The local repair uses the existing IBGE-derived Brazilian border between two exact common vertices, at 58.478636°W, 16.814186°S and 57.741023°W, 17.694876°S. It changes San Matías municipality and its Ángel Sandóval/Santa Cruz parents; the Peru and Paraguay junctions stay unchanged. The original municipal census figures and reported area remain intact. Mapped parent areas follow the corrected geometry.

The triangular fill at Laguna Uberaba came from leaving the political lake crossing inside the land polygons while suppressing its outline. The pinned OSM multipolygon 456940 supplies the lake shoreline and island holes. Its water is removed from both countries' detailed fills, Brazilian telephone areas and local municipalities, and their inactive/background previews. Border strokes end at the lake shore. Shores and open-water crossings are not outlined.

`scripts/boundary-sources/brazil-bolivia/manifest.json` records the IBGE source and the original OSM URL, version, checksums and ODbL attribution. `npm run build:brazil-bolivia` stages the local correction and checks matching edges and preserved statistics before writing. Running `scripts/repair-brazil-bolivia.mjs` without `--apply` performs that check without writing map data. Bolivia rebuilds apply the correction last; global border rebuilds retain its land-only stroke.

`npm run test:brazil-bolivia` checks matching land edges, lake cutouts at every fill level, original identities/counts/reported statistics, preserved unrelated geometry and desktop/mobile views from both countries.
