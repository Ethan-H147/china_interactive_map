# Australian suburbs and localities

The source supplies 15,650 government-defined suburb/locality identities from Geoscape Administrative Boundaries, November 2026. These are addressing localities, not municipalities, postcodes, or ABS statistical suburb approximations. Councils remain separate local government pages.

## Data and identities

The retained source is the GDA2020 Shapefile release published on 16 November 2026 at [data.gov.au](https://data.gov.au/data/dataset/geoscape-administrative-boundaries). `scripts/boundary-sources/australia-localities/manifest.json` pins the release URL, member names, sizes, SHA-256 hashes, licence and attribution. Gzipped source components are kept beside the manifest, including the council/locality relationship tables and the ABS council identity correspondence.

Each locality uses its published `LOC_PID` as `AU-SUB-<LOC_PID>`. Multipart source rows are grouped under that identity, without dissolving overlapping ACT districts into suburbs. The 19 ACT records classified as `District` are excluded from the suburb view; all 121 gazetted ACT localities remain. Five other-territory localities use the existing Jervis Bay, Christmas Island, Cocos (Keeling) Islands and Norfolk Island parents.

Councils use their existing atlas/ABS identities. Their displayed geometry is updated from the same Geoscape release. Southern Limestone Coast retains the former Grant council identity and search alias. Published relationships link a locality to every applicable council. The locality polygon is stored once, whole, in its state/territory chunk. There are 1,162 localities with multiple council relationships.

## Geometry and display

The existing first-level, context and international geometry assets are unchanged. Council and locality display data use a shared-edge simplification of 0.00008 degrees (about 9 metres north-south), preserving small polygons, before clipping to the existing state/territory land mask. Full source components remain available for rebuilding. Ordinary border meshes contain shared internal boundaries rather than coastline strokes. ACT suburb meshes also include unshared inland perimeters facing land with no suburb assignment; the existing territory and water edges are still omitted. Undefined locality areas stay unassigned.

Suburbs use the existing state-scoped third-detail loader and shared renderer. Councils and suburbs alternate in the existing detail slots; the suburb view releases the council source. Country entry does not download suburb chunks. In suburb mode, the state in view is resolved from the existing first-level geometry. Panning between states updates the same detail source without requiring a search or selected card. Saved unselected suburb views restore this behavior. Existing country memory limits, indexed geometry reuse, selected outlines, cards, search, saved views and country cleanup are reused. Other countries keep their existing detail behavior.

Suburb cards show mapped area, council context and the boundary source. No council population or GDP is copied to a suburb. Existing council population estimates retain their original date and are marked unsuitable for density against the updated boundaries.

## Local rebuilding and checks

Run `npm run build:australia-localities` from the atlas checkout with the retained source cache present. This step also runs after the original geography/statistics steps in `build:oceania`, so a full Oceania rebuild retains suburb coverage.

Run `npm run test:australia-localities`. The validator checks every gazetted source identity, polygon rings, labels, hierarchy, whole cross-council relationships, mapped areas, retained hashes and byte accounting. Browser scenarios exercise desktop and phone selection, painted pixels, council drill-down, real pan/zoom input, saved views and country cleanup. `npm run test:oceania-browser` covers the existing councils, remote islands, flags, statistics and New Zealand behavior.

Incorporates or developed using Administrative Boundaries © Geoscape Australia licensed by the Commonwealth of Australia under Creative Commons Attribution 4.0 International licence.

## Maritime intersections

The catalogue retains all 15,650 locality identities. Five water-only localities—Middle Harbour, North Harbour, Pittwater, the NSW Jervis Bay water locality, and Darwin Harbour—use their source water polygon with the existing land geometry erased. They remain labelled, searchable and selectable, with water area shown on their cards. Their neutral fills are transparent in the existing third-detail source; no new layer is added.

Coastal land fragments are removed from maritime localities without assigning them to another place. Coherent island polygons remain. The source report records removed fragments and water-only identities.

The reviewed land localities Brooklyn, Box Head, Patonga, Narrabeen, Dee Why, Berowra Waters, Mooney Mooney, Woy Woy, Berowra, Fullerton Cove and Kooragang also span water in the source. Their land clipping created detached shoreline fragments on other banks. The build removes only additional detached parts with area/perimeter below 20 metres and an interior point within 40 metres of the source boundary. It preserves the largest surviving part of each original source component, independent small source islands, and all retained coordinates. This is a scoped display correction, not a blanket small-polygon filter. All place identities and original source files remain; removed pieces are recorded in the existing cleanup report and are not reassigned. The same existing boundary mesh is rebuilt so removed pieces leave no selected outlines.

The SA local-government names Anangu Pitjantjatjara Yankunytjatjara and Maralinga Tjarutja use their full source names in labels, cards and locality context. APY and MT remain searchable aliases.
