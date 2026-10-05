import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {merge,mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {alignMongolia} from './mongolia-topology.mjs';
import {polygons} from './international-topology.mjs';

const source=new URL('./mongolia-sources/',import.meta.url),out=new URL('../dist/data/',import.meta.url);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,source)));
const fc=features=>({type:'FeatureCollection',features});
const process=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o out.json format=geojson geojson-type=FeatureCollection',structuredClone(files)))['out.json']);
const raw=read('nso-original-soum.geojson');
const names=new Map(read('nso-names.json').features.map(f=>[f.attributes.ADM2_PCODE,f.attributes]));
assert.equal(raw.features.length,339);
const enNames={Arxangai:'Arkhangai',Hentii:'Khentii',Khovsgol:'Khövsgöl',Ovorkhangai:'Övörkhangai',Omnogovi:'Ömnögovi',"To'v":'Töv','Bayan-Olgii':'Bayan-Ölgii',Govisumber:'Govisümber'};
let second=raw.features.map(f=>{
 const p=f.properties,n=names.get(p.ADM2_PCODE);assert(n,'Missing NSO native name '+p.ADM2_PCODE);
 assert.equal(p.ADM1_PCODE,n.ADM1_PCODE);
 return {...f,properties:{id:'MN-'+p.ADM2_PCODE.slice(2),parent:'MN-'+n.ADM1_PCODE.slice(2),country:'MN',level:2,en:n.ADM2_EN,mn:n.ADM2_MN,type:n.ADM1_PCODE==='MN11'?'District':'District (soum)',pcode:n.ADM2_PCODE,provinceEn:enNames[n.ADM1_EN]||n.ADM1_EN,provinceMn:n.ADM1_MN}};
});
const china=readData('display-boundaries.json');
const cnTop=topology({regions:china.subdivisions});
const canonical={type:'Feature',properties:{country:'CN'},geometry:merge(cnTop,cnTop.objects.regions.geometries)};
const aligned=alignMongolia(second,canonical,2500);
// Node projected junctions together and remove zero-width projection folds.
// The tolerance is less than 2 mm, so geographic detail is retained while
// matching coordinate noise introduced by the source service's reprojection.
second=(await process('-i aligned.json -clean gap-width=0 snap-interval=0.00000001 overlap-rule=min-area',{'aligned.json':fc(aligned.features)})).features;
// The existing China mask also contains small detached border pieces. Respect
// those components as well, so no fill from the two countries overlaps.
second=(await process('-i aligned.json -erase china.json',{'aligned.json':fc(second),'china.json':canonical})).features;
const mnMask=(await process('-i regions.json -dissolve',{'regions.json':fc(second)})).features[0];
const combined=(await process('-i countries.json -dissolve',{'countries.json':fc([canonical,mnMask])})).features[0];
const pointKey=p=>p.map(n=>n.toFixed(8)).join(',');
const mnKeys=new Set(polygons(mnMask.geometry).flat(2).map(pointKey));
const cnKeys=new Set(polygons(canonical.geometry).flat(2).map(pointKey));
const gapRings=polygons(combined.geometry).flatMap(p=>p.slice(1)).filter(r=>r.some(p=>mnKeys.has(pointKey(p)))&&r.some(p=>cnKeys.has(pointKey(p))&&!mnKeys.has(pointKey(p))));
const repairs=[];
for(const ring of gapRings){
 const touching=second.filter(f=>polygons(f.geometry).flat(2).some(p=>ring.some(q=>pointKey(p)===pointKey(q))));
 assert.equal(touching.length,1,'A shared-border gap must have one unambiguous Mongolia district owner');
 const owner=touching[0],gap={type:'Feature',properties:owner.properties,geometry:{type:'Polygon',coordinates:[ring]}};
 const repaired=(await process('-i land.json -dissolve',{'land.json':fc([owner,gap])})).features[0];
 second=second.map(f=>f===owner?{...owner,geometry:repaired.geometry}:f);
 repairs.push({id:owner.properties.id,vertices:ring.length,bounds:[Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))]});
}
aligned.report.enclosedBorderGapsRepaired=repairs;
console.log('Border alignment',aligned.report);
const dissolved=await process('-i second.json -dissolve parent copy-fields=provinceEn,provinceMn',{'second.json':fc(second)});
const first=dissolved.features.map(f=>({...f,properties:{id:f.properties.parent,country:'MN',level:1,en:f.properties.provinceEn,mn:f.properties.provinceMn,type:f.properties.parent==='MN-11'?'Capital city':'Province (aimag)',pcode:f.properties.parent.replace('-','')}}));
assert.equal(first.length,22);
const population=JSON.parse(fs.readFileSync(new URL('province-population.json',out)));
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
for(const f of first){
 const iso=population.mongoliaAliases[normalized(f.properties.en)],record=population.mongolia[iso];
 assert(record,'Missing Mongolia province match: '+f.properties.en);
 Object.assign(f.properties,{iso,traditional:record.traditional,traditionalSource:record.sourceUrl});
}
const all=fc([...first,...second]),points=await process('-i all.json -points inner',{'all.json':all});
for(let i=0;i<all.features.length;i++){
 const f=all.features[i];f.properties.center=points.features[i].geometry.coordinates;
 const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(f.geometry.coordinates);
 f.properties.bounds=[[b[0],b[1]],[b[2],b[3]]];
}
const st=topology({second:fc(second)});
const countries=fc([{type:'Feature',properties:{country:'MN',en:'Mongolia',mn:'Монгол'},geometry:merge(st,st.objects.second.geometries)}]);
const t=topology({first:fc(first),second:fc(second),countries});
const boundaries={first:mesh(t,t.objects.first,(a,b)=>a!==b),second:mesh(t,t.objects.second,(a,b)=>a!==b&&a.properties.parent===b.properties.parent),countries:mesh(t,t.objects.countries)};
const data={first:fc(first),second:fc(second),countries,boundaries};
fs.writeFileSync(new URL('mongolia-boundaries.bin',out),gzipSync(JSON.stringify(data)));
fs.writeFileSync(new URL('mongolia-outline.bin',out),gzipSync(JSON.stringify(countries)));
const report={retrieved:new Date().toISOString(),provider:'National Statistical Office of Mongolia',geometryUrl:'https://services-ap1.arcgis.com/QIJaUt9oyULFXfLr/ArcGIS/rest/services/mng_admbnda_adm2_nso_20201019/FeatureServer/0',nativeNamesUrl:'https://services-ap1.arcgis.com/QIJaUt9oyULFXfLr/ArcGIS/rest/services/mng_admbnda_adm2_nso_20201019/FeatureServer/0',sourceDate:'2020-10-19',reviewed:'2025-10-30',attribution:'National Statistical Office of Mongolia; OCHA Common Operational Dataset',license:'CC BY-IGO',licenseUrl:'https://data.humdata.org/dataset/cod-ab-mng',licenseMetadata:'https://data.humdata.org/api/3/action/package_show?id=cod-ab-mng',counts:{first:first.length,provinces:21,capitalCities:1,second:second.length,soums:second.filter(f=>f.properties.parent!=='MN-11').length,capitalDistricts:second.filter(f=>f.properties.parent==='MN-11').length},method:'First-level regions and the country outline are dissolved from the official soum polygons without simplification. Only exterior edges within 2.5 km of the existing China outline inherit that outline. Contiguous exterior runs inherit each intervening China vertex once. All existing China components are erased from the Mongolia fill to avoid overlap. Existing China geometry is unchanged. Native names are matched by official NSO P-code.',border:aligned.report,sha256:{}};
report.traditionalNames={url:population.sources.mongolia.revisionUrl,license:population.sources.mongolia.license,method:'Exact traditional-script province names from the requested Wikipedia province table, matched through the population record ISO code.'};
for(const n of ['nso-original-soum.geojson','nso-names.json','nso-original-service.json','hdx-license.json'])report.sha256[n]=createHash('sha256').update(fs.readFileSync(new URL(n,source))).digest('hex');
fs.writeFileSync(new URL('mongolia-sources.json',out),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(new URL('mongolia-border-report.json',out),JSON.stringify({method:report.method,...aligned.report},null,2)+'\n');
console.log(report.counts);
