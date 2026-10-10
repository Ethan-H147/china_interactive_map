# South African settlement points

`settlement-source.json` pins 500 named populated-place coordinates and their matching 2011 census main-place codes. `mainplaces-2011.csv` is the Stats SA census table reproduced by Adrian Frith. Normal builds verify its SHA-256, every selected population/area, and containment in the atlas's current municipality geometry:

```sh
node scripts/prepare-south-africa-settlements.mjs
```

The extract selects the 500 most populous main places for which a GeoNames populated-place point with a matching name lies inside the exact 2011 census main-place polygon. Non-urban municipality remainder areas (`NU`) and gazetteer suburban sections (`PPLX`) are excluded. This produces cities, towns, townships and some large villages; records are labeled `Settlement` because the sources do not consistently distinguish legal city/town classes. No GeoNames population numbers are used.

Population and area refer to the **2011 census main place**, not the current built-up urban area or municipality. For example Cape Town main place excludes separate named census places elsewhere within Cape Town metro. Pretoria, Durban, Cape Town, Johannesburg and Port Elizabeth population totals were independently compared with the corresponding official Stats SA Statistics by Place pages; those records link directly to the official source. Source spelling `Port Elizaberth` is corrected to Port Elizabeth before matching, and displayed as the present official name Gqeberha.

To reproduce the original spatial extraction, download the source archives below into this directory, unzip `ZA.zip` here, and unzip `MP_SA_20.zip` into `mainplaces/`. Convert the shapefile to WGS84 GeoJSON with mapshaper, then run the extractor:

```sh
mapshaper mainplaces/MP_SA_20.SHP -proj wgs84 -o format=geojson mainplaces.geojson
node scripts/prepare-south-africa-settlements.mjs --extract
```

Run the commands from the repository root with paths prefixed by this directory as needed. Archive hashes are pinned in `settlement-source.json`. GeoNames is updated daily; a later archive may differ and should be reviewed before replacing the snapshot. Large raw geometry and gazetteer downloads are intentionally not checked in.

- Census table: https://stuff.adrianfrith.com/mainplaces-2011.csv
- Census main-place polygons: https://stuff.adrianfrith.com/MP_SA_20.zip
- GeoNames coordinates: https://download.geonames.org/export/dump/ZA.zip
- GeoNames attribution/license: https://www.geonames.org/export/
- Census product documentation: https://www.statssa.gov.za/?page_id=3955
- Official scope description: https://gis.westerncape.gov.za/server2/rest/services/SpatialDataWarehouse/StatsSA_CensusBoundaries/MapServer/3

The census main-place snapshot retains 2011 names for provenance. Current names, multilingual endonyms, and historical aliases are maintained as a separate sourced supplement.
