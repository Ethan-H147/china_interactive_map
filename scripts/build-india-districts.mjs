import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {load} from './geo-index.mjs';
import {fc,command,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {alignLadakhDistrictCoverage} from './india-district-coverage.mjs';

const root='dist/data/europe/india/',sourceRoot='scripts/boundary-sources/india-districts/',source=load(sourceRoot+'lgd-2024.geojson.gz'),manifest=load(sourceRoot+'manifest.json'),catalogue=load(root+'catalogue.bin'),first=load(root+'first.bin'),states=catalogue.records.filter(r=>r.level===1),statistics=load(root+'statistics.json');
const stateCodes={1:'JK',2:'HP',3:'PB',4:'CH',5:'UK',6:'HR',7:'DL',8:'RJ',9:'UP',10:'BR',11:'SK',12:'AR',13:'NL',14:'MN',15:'MZ',16:'TR',17:'ML',18:'AS',19:'WB',20:'JH',21:'OD',22:'CG',23:'MP',24:'GJ',27:'MH',28:'AP',29:'KA',30:'GA',31:'LD',32:'KL',33:'TN',34:'PY',35:'AN',36:'TS',37:'LA',38:'DH'};
const chunks={},records=[...states],audit=[],excluded=[];
const write=(file,data)=>{fs.mkdirSync(root+file.slice(0,file.lastIndexOf('/')+1),{recursive:true});const json=JSON.stringify(data),bytes=gzipSync(json,{level:9});fs.writeFileSync(root+file,bytes);return{bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};};
assert.equal(states.length,36);assert.equal(source.features.length,manifest.count);
for(const [lgd,code]of Object.entries(stateCodes)){
 const parent=states.find(r=>r.code===code),mask=first.regions.features.find(f=>f.properties.id===parent.id),input=source.features.filter(f=>f.properties.state_lgd===+lgd).map(f=>{const p=f.properties,id=p.dist_lgd?'IN-D-'+p.dist_lgd:'IN-D-'+code+'-'+p.dtname.toUpperCase().replace(/[^A-Z0-9]+/g,'-');return{...f,properties:{id,name:p.dtname,lgd:p.dist_lgd||null}};});
 assert(input.length,'District source for '+parent.en);
 // The existing state and international outlines remain the map's mask. This
 // dated district source supplies only the internal administrative division.
 const clipped=await command({'districts.json':fc(input),'state.json':fc([mask])},'-clip state.json -clean gap-fill-area=0 overlap-rule=min-area');
 let regions=await command(clipped,'-dissolve id copy-fields=name,lgd');
 if(parent.id==='IN-LA')regions=alignLadakhDistrictCoverage(regions,mask).regions;
 const points=await command(regions,'-points inner'),sourceIds=new Set(regions.features.map(f=>f.properties.id));
 for(const f of input)if(!sourceIds.has(f.properties.id))excluded.push({id:f.properties.id,name:f.properties.name,parent:parent.id,reason:'No geometry remains after clipping and source-overlap repair'});
 for(let i=0;i<regions.features.length;i++){
  const f=regions.features[i],p=f.properties,r={id:p.id,parent:parent.id,level:2,en:p.name,local:p.name,localLang:'en',localLanguage:'English',kind:'District',code:p.lgd?String(p.lgd):null,aliases:[p.name+' district',p.name+', '+parent.en,...(p.lgd?['LGD '+p.lgd]:[])],center:points.features[i].geometry.coordinates,bounds:geographicBounds(f.geometry),areaKm2:geographicAreaKm2(f.geometry),sourceSnapshot:'2024'};
  records.push(r);statistics.regions['india:'+r.id]={name:r.en,level:2,parent:r.parent,area:{value:r.areaKm2,unit:'km²',year:2024,source:'lgd-districts-2024',method:'mapped',label:'Mapped land area'},note:'District boundary snapshot: 2024. Later reorganisations may differ.'};f.properties={id:r.id,name:r.en};
 }
 const data={regions,boundaries:sharedBorders(regions)},file='second/'+parent.id+'.bin';chunks[parent.id]={file,count:regions.features.length,level:2,...write(file,data)};audit.push({parent:parent.id,state:parent.en,source:input.length,displayed:regions.features.length});console.log(parent.en,regions.features.length,'districts');
}
assert.equal(new Set(records.map(r=>r.id)).size,records.length);assert.equal(records.length-36+excluded.length,source.features.length);
catalogue.records=records;catalogue.chunks={...catalogue.chunks,...chunks};catalogue.counts={1:36,2:records.length-36};catalogue.levels=['State or union territory','District'];write('catalogue.bin',catalogue);
statistics.sources['lgd-districts-2024']={title:manifest.title,url:manifest.url,year:2024,license:manifest.license};fs.writeFileSync(root+'statistics.json',JSON.stringify(statistics)+'\n');
const sources=load(root+'sources.json');sources.counts=catalogue.counts;sources.districts={snapshot:'2024',count:records.length-36,sourceFeatures:source.features.length,excluded,coverage:'Districts in the LGD 2024 boundary snapshot. Loaded by state or union territory. Later reorganisations are outside this dated snapshot. Existing state and international land outlines are preserved.',source:manifest,processing:manifest.processing};fs.writeFileSync(root+'sources.json',JSON.stringify(sources,null,2)+'\n');fs.writeFileSync(sourceRoot+'coverage-audit.json',JSON.stringify({snapshot:'2024',audit,excluded},null,2)+'\n');console.log('India district coverage',catalogue.counts,'excluded',excluded);
