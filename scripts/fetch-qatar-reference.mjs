import {retain,source} from './fetch-caucasus-gulf.mjs';
const resource=JSON.parse(source('qat-metadata.json')).result.resources.find(r=>r.name.endsWith('shp.zip'));
await retain('qat-shp.zip',resource.url,{credit:'OCHA HDX / Qatar Centre for GIS',license:'CC BY 3.0 IGO'});
for(const[name,bbox]of [['west-bay','51.523,25.309,51.546,25.329'],['ras-laffan','51.58,25.88,51.64,25.97']])await retain('qatar-'+name+'-osm.json','https://www.openstreetmap.org/api/0.6/map.json?bbox='+bbox,{credit:'OpenStreetMap contributors',license:'ODbL 1.0',purpose:'Independent Qatar shoreline control for datum validation'});

const khorQuery='[out:json][timeout:60];way["natural"="coastline"](24.45,51.15,24.9,51.7);out body;>;out skel qt;';
await retain('qatar-khor-al-adaid-coast-osm.json','https://overpass-api.de/api/interpreter?'+new URLSearchParams({data:khorQuery}),{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',purpose:'Land-only shoreline of Khor Al Adaid; omit maritime and coastal border strokes',retrieved:'2026-10-29'});
