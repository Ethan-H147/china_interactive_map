# United States historical snapshot

The **Historical snapshot** button beside the United States header opens the states and territories as they stood at the end of any year from 1783 to 2000. The button then reads **Present day** and returns to the present-day map. Unlike the China and Soviet snapshots, this is not a separate route: it is a view of the United States map (`dist/historic-view.mjs`, configured by `dist/us-history.mjs`), so search, selection and the sidebar stay as they are. The map-view dropdown and level buttons are hidden while it is open.

## What is shown

- A dock picks the year: 218 ticks, darker where the map changed from the year before, with arrows, Home, End and the arrow keys. The snapshot opens on 1789 and remembers the last year.
- States are pale blue, territories sand, unorganized territory a lighter sand, and areas claimed by two jurisdictions a darker sand labelled Disputed. Land not yet acquired is shown as part of the country that held it, coloured like the neighbouring countries' land: Spanish Louisiana, French Louisiana (1800–1803), Spanish East and West Florida, New Spain, Mexico (from 28 September 1821), Rupert's Land (Britain), Oregon Country, Russian America and Hawaii. The Republic of Texas and the Vermont Republic are drawn the same way. Frontiers between countries are drawn heavier than state lines; today's borders with Canada and Mexico are drawn only where the two sides had different holders.
- Labels name every unit. The dock counts states and territories and says whether boundaries changed that year.
- Map settings lists the year's changes, dated, with the source's description of each, and the changes of holder that the source does not record (Louisiana's return to France in 1800, Mexican independence in 1821 and Hawaii's changes of government).
- Clicking a unit selects the present-day state it now is (Maine in 1789 opens Massachusetts) or, for a territory or foreign land, the present-day place clicked. The card names the unit and its kind, when it began and when its boundary that year took effect, the source's description and citation, or, for foreign land, its holder and when it passed to the United States. Stepping years keeps the clicked place.

## Data and method

Boundaries come from the Newberry Library's [Atlas of Historical County Boundaries](https://publications.newberry.org/ahcb/), U.S. Historical States and Territories, every configuration from 3 September 1783 to 31 December 2000, dated to the day, released under CC0 1.0 (manifest: `scripts/boundary-sources/united-states/historic-states/manifest.json`). The archive is over GitHub's file limit and ignored by Git; the Newberry server refuses scripted downloads, so restore it from the download page in a browser.

`scripts/build-us-historic-borders.mjs` writes `dist/data/europe/united-states/history/borders.bin`, which the Elections view's historic borders also use:

- All 220 dated polygons are simplified together at 30 m, so lines they share stay shared, and cut into one flat mosaic of 4,035 faces. Each face lists the polygons covering it.
- A date assigns each face to the unit covering it that day. Faces covered by two units at once are the source's recorded disputes. Deseret, the provisional state of 1849–1851 that Congress never recognised, is left out in favour of the official jurisdictions.
- Land outside the country on a date takes the holder from before the next polygon to cover it: the one that first brought it in, or that brought it back after a cession (the Adams–Onís Treaty of 1819 gave Spain land the United States had claimed). West Florida, which the source places in Orleans Territory from 1804 when the United States claimed it, is Spanish before then. Land never covered again, such as Oregon Country north of the 49th parallel, lies outside the present-day country.
- Land frontiers with Canada and Mexico are the outer mosaic edges within 3 km of the atlas's present-day international border.
- A configuration (each face's unit, the borders and frontiers to draw, and which unit holds each present-day state) is stored once and shared by every date that has it: 76 configurations cover the 60 elections and 218 year-ends, adding about 30 KB to the 2.7 MB of geometry. The snapshot ends with the source, in 2000.

Changes of holder outside the source: Spain to France, 1 October 1800 (Treaty of San Ildefonso; Spain governed Louisiana until 1803); Mexican independence, 28 September 1821; Hawaii united, 1795; monarchy overthrown, 17 January 1893; Republic of Hawaii, 4 July 1894. Acquisitions by the United States use the source's dates, such as the Louisiana Purchase on 30 April 1803 and Florida on 22 February 1819.

The geometry is decoded in MapLibre's workers (`dist/atlas-data.mjs` reads one collection of the file per source); changing year only recolours faces and filters edges. The page keeps the configurations and compact polygons for picking.

## Check locally

- `npm run build:us-historic-borders` rebuilds `borders.bin`.
- `npm run test:us-history` runs the data checks (`scripts/validate-us-historic-borders.mjs`: every election and year, each holder of present-day states over time, the southwestern frontier) and the browser scenarios in `scripts/browser/us-history.test.mjs`.
