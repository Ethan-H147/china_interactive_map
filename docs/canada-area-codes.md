# Canadian area codes

Canada uses the existing US-style **Area codes** map view, search and selected-area card. Choose it in the map-view menu beside the administrative levels, then choose a province or search a three-digit code. Saved links retain the view and selected code.

The 23 October 2026 snapshot contains 55 active geographic codes, three Canadian non-geographic services (600, 622, 633), and three assigned future codes (273, 568, 851). Future codes and services have separate lists under Sources & coverage. Services have no polygon or inherited population/GDP.

NANPA supplies assignments, dates and overlay complexes. CNA maps and CRTC decision 2023-135 verify current coverage, including Toronto 942 and the province-wide British Columbia 257 overlay. The retained source manifest records hashes and links. The public-domain UCLA 2015 geometry is retained as a Canadian-only extract; it supplies generalized subprovincial footprints. Whole-province coverage uses the atlas land directly. These are reference areas; later small exchange-boundary changes may not be represented.

867 shares one record and complete footprint across Yukon, Northwest Territories and Nunavut. 782/902 similarly span Nova Scotia and PEI. Each province has its own lazy geometry chunk and label placement; selecting a shared code preserves the current parent when possible. Its card names every province or territory, without showing one province's flag as the code's flag.

Regional footprints share one simplification topology. Dividing lines use the regional reference mesh, excluding province-wide overlays and obsolete perimeter fragments. Continuous paths remain joined for zoom fades, and terminal ends meet the current province land boundary. The tests check the repaired Alberta, Ontario and Quebec segments and reject floating endpoints in all four provinces with regional codes.

Canada and the US draw a selected phone area in a separate fill layer above the neutral code footprints. This keeps overlapping codes from painting over its highlight in tile-shaped patches. Screenshot tests sample interior and exterior pixels at multiple zooms on desktop and phone layouts.

Rebuild with `npm run build:canada-area-codes`; verify with `npm run test:canada-area-codes` and `npm run test:canada-area-codes-browser`. Refreshing mutable snapshots requires reviewing and updating the retained source pins. The US snapshot and datasets remain independent.
