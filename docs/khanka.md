# Lake Khanka permanent water

Khanka (兴凯湖) is carved out of China and Russia land fills, regional detail, gray context and world fallback land. It remains visible with China's optional major rivers and lakes switched off. That optional layer no longer contains Khanka.

The shoreline is OpenStreetMap relation 1125603, retained with its checksum and ODbL attribution under scripts/boundary-sources/khanka. The detailed contour was compared against Esri World Imagery; the image extent and comparison are retained in artifacts/border-lake-research. Output coordinates are rounded to six decimal places so repeated masking uses the same vertices. Imagery capture dates and lake water levels vary.

The old lake void is restored before the new shoreline is cut, preventing remnants of the coarse shore from surviving outside the mapped water. The original Chinese political outline supplies a continuous border through the lake. Regional and district boundary meshes remain intact. Coastline fill slivers join the nearest existing Russian district; all original district IDs remain.

Rebuild with npm run build:khanka. The China pack, Russia and world builders retain their lake hooks. Validate with npm run test:khanka and node scripts/browser/run.mjs khanka.
