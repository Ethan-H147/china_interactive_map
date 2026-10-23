import assert from 'node:assert/strict';
import {polygons,landIndex} from './geo-index.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';

export const julcuyCoverageSource={title:'GAD Parroquial Rural Julcuy · PDOT 2023–2027',url:'https://gadpuertocayo.gob.ec/media/gadparroquiajulcuy/pdot_archivos/PDOT_PARROQUIA_JULCUY_2023-2027_compressed.pdf',pages:[38,79],note:'The parish map shows continuous Julcuy land through the inland omission in the OCHA/INEC polygons. The repair reuses the exact surrounding source edges; no coastline or international border is changed.'};
export const julcuyGapPoint=[-80.66,-1.56];
const contains=(f,p)=>landIndex(polygons(f.geometry).flat())(p);

export async function restoreJulcuyLand(bottom){
 const julcuy=bottom.features.find(f=>f.properties.id==='EC130653');
 assert(julcuy,'Julcuy source polygon');
 if(contains(julcuy,julcuyGapPoint))return bottom;
 assert(!bottom.features.some(f=>contains(f,julcuyGapPoint)),'Repair must not displace an existing parish');
 const national=await command(bottom,'-dissolve');
 const holes=national.features.flatMap(f=>polygons(f.geometry).flatMap(p=>p.slice(1).map(r=>({type:'Feature',properties:{id:'EC130653'},geometry:{type:'Polygon',coordinates:[r]}}))));
 const gap=holes.find(f=>contains(f,julcuyGapPoint));
 assert(gap,'Known inland source omission');
 const area=geographicAreaKm2(gap.geometry),bounds=geographicBounds(gap.geometry).flat();
 assert(area>132&&area<134&&bounds[0]>-80.71&&bounds[2]<-80.61&&bounds[1]>-1.68&&bounds[3]<-1.45,'Only the verified Julcuy omission may be repaired');
 const repaired=await command(fc([julcuy,gap]),'-dissolve id -clean gap-fill-area=0');
 assert.equal(repaired.features.length,1);
 assert(contains(repaired.features[0],julcuyGapPoint));
 assert(Math.abs(geographicAreaKm2(repaired.features[0].geometry)-geographicAreaKm2(julcuy.geometry)-area)<.01,'Restore the omitted land without changing existing coverage');
 console.log('Restored Julcuy land',area.toFixed(3),'km²');
 return fc(bottom.features.map(f=>f===julcuy?repaired.features[0]:f));
}
