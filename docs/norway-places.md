# Norway settlements and selection fills

The atlas contains 6,973 settlement pages: all 1,000 SSB urban areas, supplemented from Kartverket SSR. The source snapshot contains 6,662 Norwegian records in the by, tettsted, tettbebyggelse, grend and bygdelagBygd categories. Five relic places and twelve places with no current public spelling are excluded and recorded in the audit. The remaining 6,645 source identities map to pages; 672 named centres share an existing urban-area page when name, municipality and polygon membership agree. All others retain separate identities. Farms, individual buildings, neighbourhoods and historical settlement classes are outside this coverage.

Årstein is NO-SSR-138567 in Gratangen, with Norwegian and Sami search aliases. Named villages have no invented population. The original SSB urban IDs and their total population of 4,696,257 remain intact.

Source: [Kartverket SSR](https://www.kartverket.no/api-og-data/stedsnavndata), CC BY 4.0. The fetcher partitions county queries into municipalities when needed rather than relying on inconsistent broad-query page estimates. Every final partition is checked against its reported count. Raw responses, request URLs, the manifest and source-to-page mapping are retained under scripts/boundary-sources/norway-places.

The compressed settlement download is about 426 KB. Existing spatial spacing, viewport filtering and zoom limits handle the 6,973 points without the large-dataset streaming path used for Mexico. A nationwide search remains available.

The shared regional renderer draws selected polygons above all neutral administrative fills and below borders. Previously, deeper statistical-area fills obscured selected municipalities, leaving highlight slivers around unmatched edges. One filtered selection layer per loaded administrative level reuses its existing geometry source; no municipality-specific boundary edits or extra downloads are needed. Choropleth profiles preserve each selection layer’s actual administrative level.

Build with npm run build:norway-places; check with npm run test:norway-places. Existing Nordic settlement population and regional loading checks also apply.
