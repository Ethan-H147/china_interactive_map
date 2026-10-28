import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import polygonClipping from 'polygon-clipping';
import {source,root} from './fetch-west-asia.mjs';
import {definitions} from './west-asia-definitions.mjs';
import {load,polygons,lineIndex,metres} from './geo-index.mjs';
import {command,fc,buildRegionalDataset,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),manifest=load(root+'manifest.json');
const only=process.argv.find(a=>a.startsWith('--country='))?.slice(10);if(only)assert(definitions.some(d=>d.country===only));
const area=f=>f.geometry?geographicAreaKm2(f.geometry):0,report={version:1,retrieved:manifest.retrieved,countries:{}};
const hash=b=>createHash('sha256').update(b).digest('hex'),save=(file,data)=>fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));
function globalEdgeDistance(feature,p){
 const c=Math.cos(p[1]*Math.PI/180);let best=Infinity;
 for(const poly of polygons(feature.geometry))for(const ring of poly)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  best=Math.min(best,((p[0]-a[0]-u*(b[0]-a[0]))*c)**2+(p[1]-a[1]-u*(b[1]-a[1]))**2);
 }
 return Math.sqrt(best)*111195;
}
// Use one rounded topology for overlays. Unrounded intersections along aligned
// river mouths can otherwise leave nearly coincident floating-point segments.
async function conform(children,parent){
 const clipped=await command({'children.json':children,'parent.json':fc([parent])},'-clip parent.json -clean gap-fill-area=0');
 clipped.features=clipped.features.filter(f=>area(f)>.0001);assert(clipped.features.length,'Parent retains local polygons');
 const gaps=await command({'parent.json':fc([parent]),'children.json':clipped},'-erase children.json -explode -clean gap-fill-area=0');
 const edges=clipped.features.map(f=>lineIndex(polygons(f.geometry).flat())),pieces=[...clipped.features];
 for(const gap of gaps.features.filter(f=>area(f)>0)){
  const lengths=edges.map(()=>0);
  for(const poly of polygons(gap.geometry))for(const ring of poly)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];edges.forEach((edge,j)=>{if(edge(mid)<.5)lengths[j]+=metres(a,b);});}
  let owner=lengths.indexOf(Math.max(...lengths));
  if(!lengths[owner]){
   const p=polygons(gap.geometry)[0][0][0];let distances=edges.map(edge=>edge(p));
   // The local edge index deliberately has a short search radius. Offshore
   // islands beyond it need a real nearest-edge search, not an Infinity tie.
   if(!distances.some(Number.isFinite))distances=clipped.features.map(f=>globalEdgeDistance(f,p));
   owner=distances.indexOf(Math.min(...distances));
  }
  pieces.push({...gap,properties:{...clipped.features[owner].properties}});
 }
 const joined=await command({'children.json':fc(pieces),'parent.json':fc([parent])},'-dissolve2 id,parent -clean gap-fill-area=0 -clip parent.json');
 const lattice=v=>typeof v==='number'?Math.round(v*1e6):v.map(lattice),degrees=v=>typeof v==='number'?Math.round(v)/1e6:v.map(degrees),mask=lattice(polygons(parent.geometry));
 // An explicit final intersection preserves water holes even when the topology
 // cleaner removes a small ring during a large multipart overlay.
 for(const f of joined.features)if(f.geometry)f.geometry={type:'MultiPolygon',coordinates:degrees(polygonClipping.intersection(lattice(polygons(f.geometry)),mask))};
 joined.features=joined.features.filter(f=>area(f)>.0001);return joined;
}
for(const d of definitions.filter(d=>!only||d.country===only)){
 const base='dist/data/europe/'+d.country+'/',catalogue=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),sources=load(base+'sources.json');let first=load(base+'first.bin').regions;
 const retained=Object.fromEntries(['first.bin','context.bin','international.bin','political.bin'].map(f=>[f,fs.readFileSync(base+f)]));
 const units=new Map(catalogue.records.filter(r=>r.level===1).map(r=>[r.id,{...r,...(stats.regions[d.country+':'+r.id].population?{population:stats.regions[d.country+':'+r.id].population}:{})}]));
 const byLevel={1:first},year=d.country==='saudi-arabia'?2021:2019,raw={},sourceCounts={},portions=[];let saudiNames;
 if(d.country==='saudi-arabia'){
  raw[2]=JSON.parse(source('saudi-governorates.geojson'));
  saudiNames=new Map(JSON.parse(source('saudi-governorate-names.json')).map(r=>[r.id,r]));assert.equal(raw[2].features.length,147);
  const regions={Eastern:'SA04',Qassim:'SA05',Hail:'SA06',Northern:'SA08',Jouf:'SA12',Tabuk:'SA07',Riyadh:'SA01',Najran:'SA10',Madinah:'SA03',Makkah:'SA02',Baha:'SA11',Jazan:'SA09',Asir:'SA14'};
  const maskName='saudi-national-mask.geojson';
  if(!manifest.files[maskName]){
   const mask=await command(first,'-dissolve2');mask.features.forEach(f=>f.properties={id:'saudi-arabia'});const text=JSON.stringify(mask);
   fs.writeFileSync(root+maskName+'.gz',gzipSync(text,{level:9}));manifest.files[maskName]={url:'data/europe/saudi-arabia/first.bin',credit:'Retained OCHA-based Saudi national land mask with established neighbouring frontier alignments',license:'OCHA CC BY-IGO; retained atlas alignments',derivedFromSha256:hash(retained['first.bin']),method:'Dissolve the approved first-level land before aligning the deeper hierarchy.',sha256:hash(text),bytes:Buffer.byteLength(text)};
   fs.writeFileSync(root+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
  }
  const national=JSON.parse(source(maskName));assert.equal(national.features.length,1);
  const children=fc(raw[2].features.map(f=>{const n=saudiNames.get(f.properties.shapeID);assert(n&&regions[n.officialParent]);const id='SA-GB-'+n.id,parent=regions[n.officialParent];
   units.set(id,{id,sourceId:n.id,sourceRegion:n.officialParent,code:n.id,codeScheme:'geoBoundaries SAU ADM2 3984122',level:2,parent,en:n.en.replace(/ Governorate$/,''),local:n.local,localLang:'ar',localDir:'rtl',names:{ar:n.local},aliases:[...new Set([...n.aliases,id,n.id])],kind:'Governorate',areaYear:2021,note:n.note||'2021 geoBoundaries/OpenStreetMap governorate reference. Regional membership uses the official Taadeen emirate reference; later local reforms are not inferred and population is not assigned.'});
   return {...f,properties:{id,parent}};
  }));
  raw[2]=await conform(children,national.features[0]);
  first=await command(raw[2],'-dissolve2 parent -rename-fields id=parent -clean gap-fill-area=0');assert.equal(first.features.length,13);byLevel[1]=first;
  for(const u of units.values())if(u.level===1)u.areaYear=2021;
  sourceCounts[2]=147;
 }else{
  const zip=unzipSync(source(d.iso.toLowerCase()+'.zip'));
  for(const level of d.country==='iraq'?[2,3]:[2]){raw[level]=JSON.parse(Buffer.from(zip[d.iso.toLowerCase()+'_admin'+level+'.geojson']));sourceCounts[level]=raw[level].features.length;}
 }
 for(const level of Object.keys(raw).map(Number)){
  if(d.country==='saudi-arabia'){byLevel[level]=raw[level];continue;}
  const parents=byLevel[level-1],candidates=[];
  for(const parent of parents.features){
   const u=units.get(parent.properties.id),sourceParent=u.sourceId||u.id;
   const bounds=geographicBounds(parent.geometry);
   const children=raw[level].features.filter(f=>{if(d.country!=='saudi-arabia')return f.properties['adm'+(level-1)+'_pcode']===(u.id==='IQ-OSM-3826029'?'IQG06':sourceParent);const b=geographicBounds(f.geometry);return b[0][0]<=bounds[1][0]&&b[1][0]>=bounds[0][0]&&b[0][1]<=bounds[1][1]&&b[1][1]>=bounds[0][1];});
   assert(children.length,'Source children for '+d.country+' '+u.id);
   let data=fc(children);
   // Halabja crosses three historical districts. These remain explicitly dated
   // reference portions; clipping does not establish new statutory districts.
   const split=d.country==='saudi-arabia'||d.country==='iraq'&&(level===2&&['IQG06','IQ-OSM-3826029'].includes(u.id)||level===3&&u.sourceId!==undefined);
   if(split){data=await command({'children.json':data,'parent.json':fc([parent])},'-clip parent.json -clean gap-fill-area=0');data.features=data.features.filter(f=>area(f)>(d.country==='saudi-arabia'?.1:.0001));}
   const normalized=fc(data.features.map(f=>{
    if(d.country==='saudi-arabia'){
     const n=saudiNames.get(f.properties.shapeID),id='SA-GB-'+n.id+(u.id===n.parent?'':'-IN-'+u.id);assert(!units.has(id));
     units.set(id,{id,sourceId:n.id,sourceRegion:n.officialParent,code:n.id,codeScheme:'geoBoundaries SAU ADM2 3984122',level:2,parent:u.id,en:n.en.replace(/ Governorate$/,''),local:n.local,localLang:'ar',localDir:'rtl',names:{ar:n.local},aliases:n.aliases,kind:'Governorate',areaYear:2021,note:n.note||'2021 geoBoundaries/OpenStreetMap administrative reference, clipped to the displayed regional snapshot. Later governorate reforms are not inferred; no current population is assigned.'});
     return {...f,properties:{id,parent:u.id}};
    }
    const p=f.properties,sourceId=p['adm'+level+'_pcode'],originalParent=p['adm'+(level-1)+'_pcode'],id=u.id===originalParent?sourceId:sourceId+'-IN-'+u.id;
    const local=String(p['adm'+level+'_name1']||p['adm'+level+'_name']).replace(/^شهرستان\s+/,''),en=p['adm'+level+'_name'];
    assert(!units.has(id),'Unique deeper identity '+id);
    units.set(id,{id,sourceId,code:sourceId,codeScheme:'OCHA COD administrative P-code',level,parent:u.id,en,local,localLang:d.lang,localDir:'rtl',names:{[d.lang]:local},aliases:[...new Set([p['adm'+level+'_name'],p['adm'+level+'_name1'],sourceId,id].filter(Boolean))],kind:d.country==='iran'?'County':level===2?'District':'Subdistrict',areaYear:2019,note:'2019 OCHA administrative reference; later local reforms are not inferred. Mapped land area is shown; subdivision population is not estimated from the parent.'});
    return {...f,properties:{id,parent:u.id}};
   }));
   assert(normalized.features.length,'Nonempty children for '+u.id);
   const aligned=await conform(normalized,parent);aligned.features=aligned.features.filter(f=>area(f)>.0001);
   for(const f of aligned.features)assert(units.has(f.properties.id));
   candidates.push(...aligned.features);console.log('Prepared',d.country,'level',level,u.id,aligned.features.length);
  }
  byLevel[level]=fc(candidates);
  if(d.country==='iraq'||d.country==='saudi-arabia'){
   const groups=new Map();for(const f of candidates){const u=units.get(f.properties.id);if(!groups.has(u.sourceId))groups.set(u.sourceId,[]);groups.get(u.sourceId).push(u);}
   for(const [sourceId,parts]of groups)if(parts.length>1)for(const u of parts){u.referencePortion=true;u.en+=' (part)';u.local+=' (جزء)';u.names.ar=u.local;u.kind=d.country==='saudi-arabia'?'Governorate reference portion':level===2?'District reference portion':'Subdistrict reference portion';u.note='Part of the '+year+' '+(d.country==='saudi-arabia'?'governorate':level===2?'district':'subdistrict')+' reference '+sourceId+', clipped to the displayed parent '+(d.country==='iraq'?'after the Halabja split.':'because the regional and local source vintages use different boundaries.')+' This portion is not a newly asserted statutory unit. Population is not assigned.';portions.push({id:u.id,sourceId,level,parent:u.parent});}
  }
 }
 const counts=Object.fromEntries(Object.entries(byLevel).map(([level,data])=>[level,data.features.length]));
 await buildRegionalDataset({country:d.country,units,byLevel,year,retrieved:manifest.retrieved,levels:d.levels,sources:sources.sources,coverage:sources.coverage,statisticsSources:stats.sources});
 const deeper=load(base+'statistics.json');deeper.regions={...deeper.regions,...Object.fromEntries(Object.entries(stats.regions).filter(([,r])=>r.level<=1).map(([id,r])=>[id,d.country==='saudi-arabia'&&r.level===1?{...r,area:deeper.regions[id].area}:r]))};deeper.sources={...deeper.sources,...stats.sources};fs.writeFileSync(base+'statistics.json',JSON.stringify(deeper)+'\n');
 for(const [file,bytes]of Object.entries(retained))if(d.country!=='saudi-arabia'||!['first.bin','political.bin'].includes(file))fs.writeFileSync(base+file,bytes);
 if(d.country==='saudi-arabia')save(base+'political.bin',first);
 const info={sourceCounts,displayedCounts:counts,referencePortions:portions,sourceYears:{2:year,...(byLevel[3]?{3:2019}:{})},method:d.country==='saudi-arabia'?'Regional polygons are dissolved from the same 147 governorates using official Taadeen emirate assignments, so all local areas nest consistently. The retained national land mask, context and international strokes remain unchanged. Deeper geometry loads by selected region.':'Deeper polygons load by selected parent, are clipped to its retained land geometry, and cover the same parent without changing country or first-level borders. Source identities and parent links are retained. Split historical Iraqi references are explicitly named as portions.'};
 sources.counts=counts;sources.depth=info;
 if(d.country==='saudi-arabia')for(const name of ['saudi-governorates.geojson','saudi-adm2-metadata.json','saudi-governorate-names.json','saudi-name-reference.geojson'])sources.sources[name]=manifest.files[name];
 sources.coverage=sources.coverage.split(' The deeper layer')[0].split(' Districts and subdistricts are dated')[0];
 sources.coverage=d.country==='saudi-arabia'?'13 regions and 147 governorates use a consistent hierarchy from the 2021 geoBoundaries/OpenStreetMap snapshot, with official Taadeen emirate assignments and Arabic names. The existing national land mask and international border strokes are retained. GASTAT 2022 population belongs only to the 13 regions. Older combined governorate areas, including Al Taif, are not assigned newer population totals. Country overview pages remain hidden.':sources.coverage+' '+(d.country==='iran'?'The deeper layer contains the retained 429 counties (shahrestan), dated 2019.':'Districts and subdistricts are dated 2019 references. Units cut by the newer Halabja governorate are shown as reference portions with their original source codes, not as current statutory districts.');
 fs.writeFileSync(base+'sources.json',JSON.stringify(sources,null,2)+'\n');
 report.countries[d.country]={...info,preservedAssets:Object.fromEntries(Object.entries(retained).filter(([file])=>d.country!=='saudi-arabia'||!['first.bin','political.bin'].includes(file)).map(([file,bytes])=>[file,hash(bytes)])),preservedStatistics:Object.fromEntries(Object.entries(stats.regions).filter(([,r])=>r.level<=1&&(d.country!=='saudi-arabia'||r.level===0)).map(([id,r])=>[id,hash(JSON.stringify(r))])),preservedPopulation:Object.fromEntries(Object.entries(stats.regions).filter(([,r])=>r.level===1&&r.population).map(([id,r])=>[id,hash(JSON.stringify(r.population))]))};
 console.log('Completed deeper layers',d.country,counts);
}
const file=root+'depth-report.json',previous=fs.existsSync(file)?load(file):{countries:{}};report.countries={...previous.countries,...report.countries};fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
