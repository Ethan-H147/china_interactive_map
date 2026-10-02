# China Atlas

Interactive static map using the original Alibaba Cloud DataV GeoAtlas GeoJSON coordinates. No synthetic boundary geometry is used. Leaflet 1.9.4 and the data snapshot are vendored, so the running map does not depend on a live map API or CDN.

## Exploring and rendering

The Discover panel includes six province stories with links to UNESCO World Heritage sources, a region search, and a list of subdivisions for the selected province. Province names can be searched in English or Chinese; prefecture and district names can be searched in Chinese or by administrative code.

Boundary layers use SVG with visible overflow and complete polygon rings. Leaflet 1.9.4 normally rejects offscreen polygon bounds even when `noClip` is enabled. A scoped `_clipPoints` override on these polygon instances retains their rings during long pans and flights. Recheck this behavior before changing the pinned Leaflet version. Source coordinates remain unchanged.

Automatic navigation locks map input and navigation controls until its movement completes, with a timeout recovery for background tabs. Reduced-motion preferences use an immediate move. Labels remain on the map during motion and their spacing is refreshed afterward. A single resize observer owns map sizing to avoid competing recenter operations.

Calligraphic headings use bundled Ma Shan Zheng and Marck Script subsets, with their open font licenses in `dist/vendor`.

## Preview

Run `node scripts/serve.mjs` and open http://127.0.0.1:4173.

## Boundary coverage

The snapshot contains 34 province-level features, 333 prefecture-level regions, 112 districts, and 30 directly administered county-level regions. The provider labels direct counties as `city`; the app distinguishes codes with `90` in the third and fourth positions. Municipalities, Hong Kong and Macao use district subdivisions. Taiwan has only an outer outline in this source. Boundary vintage is unspecified, so retrieval does not imply administrative currency.

Source: https://datav.aliyun.com/portal/school/atlas/area_selector

`dist/data/manifest.json` records every downloaded URL, retrieval date, byte count, SHA-256 checksum and regional coverage. Geometry is stored unchanged. Display follows the provider's territorial representation and is intended for geographic exploration. The provider retains rights in its data; no additional data license is asserted here. Leaflet's BSD license is preserved in `dist/vendor/leaflet-LICENSE.txt`.

## Validate or refresh

`node scripts/validate.mjs` verifies source hashes, feature counts, coordinate ranges, unique regional codes and local asset references. `node --check dist/app.js` validates application syntax.

`node scripts/fetch-data.mjs` refreshes the snapshot from DataV and vendors Leaflet. Review changed counts and coverage before publishing a refreshed map.
