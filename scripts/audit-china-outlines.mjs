import fs from 'node:fs';
import {readData} from './read-data.mjs';
import {polygons,lineIndex,metres} from './geo-index.mjs';
const d=readData('display-boundaries.json'),near=lineIndex([...d.boundaries.province.coordinates,...d.boundaries.prefecture.coordinates,...d.boundaries.other.coordinates]);
const provinces=new Map(d.provinces.features.map(f=>[f.properties.adcode,lineIndex(polygons(f.geometry).flat())]));
const prefectures=d.subdivisions.features.filter(f=>f.properties.level==='city'&&String(f.properties.adcode).slice(2,4)!=='90'),indexes=prefectures.map(f=>({f,near:lineIndex(polygons(f.geometry).flat())}));
const missing=[];let checked=0;
for(const f of prefectures)for(const p of polygons(f.geometry))for(const r of p)for(let i=1;i<r.length;i++){
 const a=r[i-1],b=r[i];if(metres(a,b)<50)continue;checked++;
 const mid=a.map((v,j)=>(v+b[j])/2),distance=near(mid);if(distance<2||provinces.get(f.properties.provinceCode)(mid)<3)continue;
 const neighbors=indexes.filter(x=>x.f.properties.adcode!==f.properties.adcode&&x.f.properties.provinceCode===f.properties.provinceCode).map(x=>({id:x.f.properties.adcode,d:x.near(mid)})).sort((a,b)=>a.d-b.d);
 if(neighbors[0]?.d<1500)missing.push({code:f.properties.adcode,name:f.properties.name,point:mid,missingStrokeMetres:distance,neighbor:neighbors[0].id,gapMetres:neighbors[0].d});
}
const report={scope:'All mainland prefecture boundaries; segments at least 50 m, interior to a province, with another prefecture within 1.5 km. Coasts and province borders excluded. This is a targeted missing-stroke screen, not a worldwide geometry certification.',prefectures:prefectures.length,segmentsChecked:checked,candidates:missing};
fs.writeFileSync('docs/china-outline-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({prefectures:prefectures.length,segmentsChecked:checked,candidates:missing.length,regions:[...new Set(missing.map(x=>x.name))]}));
