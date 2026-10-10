# South African settlement outlines

These are the **2011 census main-place polygons** for the exact 500 main-place codes selected in `settlements.json`. They match the scope and year of the city population and area cards. They are not modern built-up footprints, municipal borders, or telephone-code zones.

Source: Statistics South Africa Census 2011, reproduced by Adrian Frith:

- https://stuff.adrianfrith.com/MP_SA_20.zip
- https://www.statssa.gov.za/?page_id=3955
- Official scope documentation: https://gis.westerncape.gov.za/server2/rest/services/SpatialDataWarehouse/StatsSA_CensusBoundaries/MapServer/3

Download `MP_SA_20.zip` here and extract its contents into `raw/`. The builder checks the archive SHA-256 against the existing settlement source snapshot, converts to WGS84, simplifies shared topology at 5 metres, and emits one gzip JSON chunk per current province:

```
node scripts/prepare-south-africa-settlement-boundaries.mjs --rebuild
```

Requires mapshaper. Raw files and the intermediate country topology are ignored. Every census polygon ID and settlement point containment is checked. Each chunk contains transparent hit polygons (`regions`) and deduplicated shared boundaries (`boundaries`, with city IDs in `owners`). Outer arcs that belong to only one main place in the complete nationwide census coverage are omitted from boundary rendering. This suppresses the coastline and national perimeter while retaining inland city boundaries, including boundaries adjacent to unselected settlements. Province files are loaded on demand; their combined gzip size is recorded in `manifest.json`.

Simplification is computed across the whole census topology before selecting cities or partitioning by province. Shared city borders therefore use the same coordinates, without duplicate outlines within a chunk. The map's normal screen-space line simplification can further reduce detail when zoomed out.

