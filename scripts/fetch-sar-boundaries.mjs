import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const sources=[
 {file:'hk-districts-official.json',url:'https://www.had.gov.hk/psi/hong-kong-administrative-boundaries/hksar_18_district_boundary.json',expected:18},
 {file:'hk-sea.json',url:'https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637221775627_85634/MapServer/7/query?where=TYPE%3D%27SEF%27&outFields=CLASS%2CTYPE&outSR=4326&f=geojson'},
 {file:'mo-parish-native.json',url:'https://webmap.gis.gov.mo/arcgis/rest/services/ThematicMap/Freg_stats/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=json',expected:11}
];
for(const source of sources){
 const response=await fetch(source.url,{signal:AbortSignal.timeout(90000)});assert(response.ok,`${source.file}: HTTP ${response.status}`);
 const text=await response.text(),data=JSON.parse(text);assert(!data.error&&data.features?.length,`Invalid dataset: ${source.file}`);
 if(source.expected)assert.equal(data.features.length,source.expected,`Source coverage changed: ${source.file}`);
 await fs.writeFile(new URL('additional-sources/'+source.file,import.meta.url),text);
 console.log(JSON.stringify({file:source.file,features:data.features.length}));
}
