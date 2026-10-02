# China Atlas

Interactive static map using the original Alibaba Cloud DataV GeoAtlas GeoJSON coordinates. No synthetic boundary geometry is used. Leaflet 1.9.4 and the data snapshot are vendored, so the running map does not depend on a live map API or CDN.

## Preview

Run `node scripts/serve.mjs` and open http://127.0.0.1:4173.

## Boundary coverage

The snapshot contains 34 province-level features, 333 prefecture-level regions, 112 districts, and 30 directly administered county-level regions. The provider labels direct counties as `city`; the app distinguishes codes with `90` in the third and fourth positions. Municipalities, Hong Kong and Macao use district subdivisions. Taiwan has only an outer outline in this source. Boundary vintage is unspecified, so retrieval does not imply administrative currency.

Source: https://datav.aliyun.com/portal/school/atlas/area_selector

`dist/data/manifest.json` records every downloaded URL, retrieval date, byte count, SHA-256 checksum and regional coverage. Geometry is stored unchanged. Display follows the provider's territorial representation and is intended for geographic exploration. The provider retains rights in its data; no additional data license is asserted here. Leaflet's BSD license is preserved in `dist/vendor/leaflet-LICENSE.txt`.

## Validate or refresh

`node scripts/validate.mjs` verifies source hashes, feature counts, coordinate ranges, unique regional codes and local asset references. `node --check dist/app.js` validates application syntax.

`node scripts/fetch-data.mjs` refreshes the snapshot from DataV and vendors Leaflet. Review changed counts and coverage before publishing a refreshed map.
