import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {fc,command,geographicBounds,sharedBorders} from './build-regional-dataset.mjs';
import {landIndex,polygons} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';

const dir='dist/data/europe/new-zealand/';
const source=JSON.parse(gunzipSync(fs.readFileSync('scripts/boundary-sources/nz-localities/communities.geojson.gz')));
const catalogue=JSON.parse(gunzipSync(fs.readFileSync(dir+'catalogue.bin')));
const statistics=JSON.parse(fs.readFileSync(dir+'statistics.json'));
const provenance=JSON.parse(fs.readFileSync(dir+'sources.json'));
const link='https://data.linz.govt.nz/layer/113764-nz-suburbs-and-localities/';
const normalize=name=>name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const authorities=new Map(catalogue.records.filter(r=>r.level===2).map(r=>[normalize(r.en),r.id]));
const entries=new Map();
const groups=new Map();
catalogue.records=catalogue.records.filter(r=>r.level<3);
for(const feature of source.features){
 const p=feature.properties;
 const id='NZ-LINZ-'+p.id;
 const parents=p.territorial_authority.split(', ').map(name=>authorities.get(normalize(name)));
 assert(parents.length&&parents.every(Boolean)&&!entries.has(id));
 entries.set(id,{id,level:3,en:p.name,local:p.name,kind:p.type,parent:parents[0],parents,aliases:[...new Set([p.additional_name,p.name_ascii].filter(n=>n&&n!==p.name))]});
 const area=geographicAreaKm2(feature.geometry);
 const population=p.population_estimate;
 statistics.regions['new-zealand:'+id]={name:p.name,level:3,parent:parents[0],area:{value:area,method:'mapped',label:'Mapped area',unit:'km²',source:'linzLocalities'},...(population!=null?{population:{value:population,source:'linzLocalities',method:'estimate',periodLabel:'Stats NZ population estimate'}}:{})};
 feature.properties={id};
}
assert.equal(entries.size,3176);
const neighbours=JSON.parse(gunzipSync(fs.readFileSync('scripts/boundary-sources/nz-localities/adjacent-land.geojson.gz')));
for(const feature of neighbours.features){
 assert(['Island','Conservation Land'].includes(feature.properties.type));
 feature.properties={id:'NZ-LINZ-'+feature.properties.id};
}
// Simplify both sides together so each land boundary follows the displayed polygons.
const land=await command(fc([...source.features,...neighbours.features]),'-simplify dp interval=.00008 planar keep-shapes');
const display=fc(land.features.filter(feature=>entries.has(feature.properties.id)));
const edgesByAuthority=new Map();
for(const edge of sharedBorders(land).features){
 const parents=new Set(edge.properties.owners.flatMap(id=>entries.get(id)?.parents||[]));
 for(const parent of parents){
  if(!edgesByAuthority.has(parent))edgesByAuthority.set(parent,[]);
  edgesByAuthority.get(parent).push(edge);
 }
}
assert.equal(display.features.length,entries.size);
const points=await command(display,'-points inner');
const centers=new Map(points.features.map(f=>[f.properties.id,f.geometry.coordinates]));
for(const f of display.features){
 const r=entries.get(f.properties.id);
 r.center=centers.get(r.id);r.bounds=geographicBounds(f.geometry);r.areaKm2=statistics.regions['new-zealand:'+r.id].area.value;
 const inside=landIndex(polygons(f.geometry).flat());
 if(!inside(r.center)){
  // Try interior points of individual parts when the multipart label falls in a gap.
  const parts=polygons(f.geometry).map(coordinates=>({type:'Feature',properties:{id:r.id},geometry:{type:'Polygon',coordinates}}));
  parts.sort((a,b)=>geographicAreaKm2(b.geometry)-geographicAreaKm2(a.geometry));
  const candidates=await command(fc(parts),'-points inner');
  r.center=candidates.features.map(point=>point.geometry.coordinates).find(inside);
 }
 assert(r.areaKm2>0&&r.center?.every(Number.isFinite),r.id);
 catalogue.records.push(r);
 for(const parent of r.parents){if(!groups.has(parent))groups.set(parent,[]);groups.get(parent).push(f);}
}
fs.mkdirSync(dir+'third',{recursive:true});
for(const [parent,features] of groups){
 const regions=fc(features),file='third/'+parent+'.bin';
 const bytes=Buffer.from(JSON.stringify({regions,boundaries:fc(edgesByAuthority.get(parent)||[])}));
 const zipped=gzipSync(bytes,{level:9});fs.writeFileSync(dir+file,zipped);
 catalogue.chunks[parent]={file,level:3,count:features.length,bytes:zipped.length,decodedBytes:bytes.length};
}
catalogue.levels[2]='Suburb or locality';
catalogue.counts[3]=entries.size;
statistics.sources.linzLocalities={title:'Toitū Te Whenua Land Information New Zealand · NZ Suburbs and Localities, including Stats NZ population estimates',url:link};
provenance.sources.linzLocalities={url:link,provider:'Toitū Te Whenua Land Information New Zealand',license:'CC BY 4.0',types:['Locality','Suburb'],count:entries.size};
provenance.sources.linzLocalities.boundaryNeighbours=['Conservation Land','Island'];
const waterInput=JSON.parse(gunzipSync(fs.readFileSync('scripts/boundary-sources/nz-localities/inland-water.geojson.gz')));
const counts={Lake:0,'Inland Bay':0};
for(const feature of waterInput.features){
 assert(Object.hasOwn(counts,feature.properties.type));
 counts[feature.properties.type]++;
}
assert.deepEqual(counts,{Lake:121,'Inland Bay':289});
// Bays subdivide the same lake. Dissolving removes their internal edges while retaining island holes.
const lakeWater=await command(waterInput,'-dissolve2 -explode -simplify dp interval=.00008 planar keep-shapes');
fs.writeFileSync(dir+'inland-water.bin',gzipSync(encodeGeo(lakeWater,{}, {scale:1e6}),{level:9}));
provenance.sources.inlandWater={url:link,provider:'Toitū Te Whenua Land Information New Zealand',license:'CC BY 4.0',counts,processing:'Lake and inland bay polygons dissolved into permanent water surfaces with island holes.'};
provenance.counts=catalogue.counts;
fs.writeFileSync(dir+'catalogue.bin',gzipSync(JSON.stringify(catalogue),{level:9}));
fs.writeFileSync(dir+'statistics.json',JSON.stringify(statistics));
fs.writeFileSync(dir+'sources.json',JSON.stringify(provenance,null,2)+'\n');
console.log(entries.size,'communities across',groups.size,'territorial authorities');
