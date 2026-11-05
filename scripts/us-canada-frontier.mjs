import {preserveCanadianBorderMesh,preserveCanadianLakeEdits} from './canada-border-mesh.mjs';
import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {load,polygons,linesOf,lineIndex,landIndex,metres} from './geo-index.mjs';
import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {selectFrontierArc} from './frontier-arcs.mjs';
import {replaceOutlineArc} from './replace-outline-arc.mjs';
import {countryContext} from './country-context.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';

export async function buildSharedUSCanada(){
 const us='dist/data/europe/united-states/',ca='dist/data/europe/canada/',reportFile='dist/data/us-canada-frontier-sources.json',retained='scripts/boundary-sources/us-canada/land-arcs.json';
 const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const fingerprintFiles=[...['first','context','catalogue','international'].map(n=>us+n+'.bin'),...['first','context','catalogue'].map(n=>ca+n+'.bin'),retained,'scripts/boundary-sources/us-canada/canada-original-outline.bin','scripts/boundary-sources/us-canada/ibc-v1.3.geojson.gz'];
 const oldReport=fs.existsSync(reportFile)?load(reportFile):{};
 if(oldReport.version===4&&fingerprintFiles.every(f=>oldReport.fingerprints?.[f]===hash(f))){console.log('Shared US–Canada border already current.');return;}
 const changed=[],shapes=new Map();
 function save(file,data){if(file.startsWith(ca)&&data.regions)data=preserveCanadianLakeEdits(data);const text=JSON.stringify(data);if(fs.existsSync(file)&&gunzipSync(fs.readFileSync(file)).toString()===text)return;fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),{recursive:true});fs.writeFileSync(file,gzipSync(text,{level:9}));changed.push(file);const compact=file.replace('dist/data/','dist/data/compact/');if(fs.existsSync(compact))fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
 async function catalogue(base,cat){const records=new Map(cat.records.map(r=>[r.id,r]));for(const [id,f]of shapes){const r=records.get(id);if(!r)continue;r.bounds=geographicBounds(f.geometry);if(!landIndex(polygons(f.geometry).flat())(r.center))r.center=(await command(fc([f]),'-points inner')).features[0].geometry.coordinates;}
 for(const chunk of [...Object.values(cat.chunks||{}),...Object.values(cat.thirdChunks||{})])if(changed.includes(base+chunk.file)){chunk.bytes=fs.statSync(base+chunk.file).size;chunk.decodedBytes=gunzipSync(fs.readFileSync(base+chunk.file)).length;}save(base+'catalogue.bin',cat);}
 const arcs=load(retained),cat=load(ca+'catalogue.bin'),records=new Map(cat.records.map(r=>[r.id,r])),provinces=new Set(['CA-NB','CA-QB','CA-MB','CA-SK','CA-AB','CA-BC']);
 const chunks=Object.entries(cat.chunks).filter(([id,c])=>c.level===3&&provinces.has(records.get(id).parent)).map(([,c])=>c);
 const parts=new Map(chunks.map(c=>[c.file,load(ca+c.file)]));let leaves=fc([...parts.values()].flatMap(p=>p.regions.features));
 for(const arc of arcs){
  const outline=await command(leaves,'-dissolve2'),own=selectFrontierArc(outline,arc.path,{maximumScoreMetres:4000}).path;
  if(arc.path.every(p=>lineIndex([own])(p)<.1)&&own.every(p=>lineIndex([arc.path])(p)<.1))continue;
  const aligned=await replaceOutlineArc(leaves,own,arc.path,4000,{coastalTrimMetres:500,maxDeviationMetres:3});const touched=new Set(aligned.runs.map(r=>r.id)),byId=new Map(aligned.regions.features.map(f=>[f.properties.id,f]));leaves=fc(leaves.features.map(f=>touched.has(f.properties.id)?byId.get(f.properties.id):f));console.log('Aligned Canadian leaves:',arc.name,aligned.runs.length,'units');
 }
 const corrected=new Map(leaves.features.map(f=>[f.properties.id,f])),affectedParents=new Set();
 for(const [file,part]of parts){const regions=fc(part.regions.features.map(f=>corrected.get(f.properties.id)||f));if(JSON.stringify(regions)===JSON.stringify(part.regions))continue;for(const f of regions.features){shapes.set(f.properties.id,f);affectedParents.add(records.get(f.properties.id).parent);}save(ca+file,{...part,regions,boundaries:preserveCanadianBorderMesh(part.boundaries)});}
 const parents=affectedParents.size?await command(fc(leaves.features.filter(f=>affectedParents.has(records.get(f.properties.id).parent)).map(f=>({...f,properties:{id:records.get(f.properties.id).parent}}))),'-dissolve2 id'):fc([]);
 const replacements=new Map(parents.features.map(f=>[f.properties.id,f]));for(const f of parents.features)shapes.set(f.properties.id,f);
 for(const province of provinces){const c=cat.chunks[province],part=load(ca+c.file),regions=fc(part.regions.features.map(f=>replacements.get(f.properties.id)||f));if(JSON.stringify(part.regions)===JSON.stringify(regions))continue;save(ca+c.file,{...part,regions,boundaries:preserveCanadianBorderMesh(part.boundaries)});const dissolved=await command(fc(regions.features.map(f=>({...f,properties:{id:province}}))),'-dissolve2 id');for(const f of dissolved.features){replacements.set(f.properties.id,f);shapes.set(f.properties.id,f);}}
 const first=load(ca+'first.bin'),caRegions=fc(first.regions.features.map(f=>replacements.get(f.properties.id)||f));save(ca+'first.bin',{...first,regions:caRegions,boundaries:preserveCanadianBorderMesh(first.boundaries)});await catalogue(ca,cat);save(ca+'context.bin',{...load(ca+'context.bin'),...await countryContext('canada',caRegions,records,command)});
 // A few independent source coastlines overlap. Remove only Canadian land from
 // continental US fills, so neither shoreline stroke can lie inside the other fill.
 const canada=fc(caRegions.features.filter(f=>['CA-NB','CA-QB','CA-ON','CA-MB','CA-SK','CA-AB','CA-BC'].includes(f.properties.id)));
 const usCat=load(us+'catalogue.bin'),states=new Set(['US-ME','US-NH','US-VT','US-NY','US-MI','US-MN','US-ND','US-MT','US-ID','US-WA']);
 const usFiles=['first.bin',...[...states].flatMap(id=>[usCat.chunks[id]?.file,usCat.thirdChunks[id]?.file]).filter(Boolean)];
 for(const file of usFiles){const data=load(us+file),candidates=file==='first.bin'?data.regions.features.filter(f=>states.has(f.properties.id)):data.regions.features;
  const masked=await command({'land.json':fc(candidates),'canada.json':canada},'-erase canada.json',{precision:.0000001});assert.equal(masked.features.length,candidates.length,'Border correction retains every US unit in '+file);const byId=new Map(masked.features.map(f=>[f.properties.id,f]));const regions=fc(data.regions.features.map(f=>byId.get(f.properties.id)||f));if(JSON.stringify(regions)===JSON.stringify(data.regions))continue;for(const f of masked.features)shapes.set(f.properties.id,f);save(us+file,{...data,regions,boundaries:await command({'lines.json':data.boundaries,'canada.json':canada},'-erase canada.json',{precision:.0000001})});console.log('Aligned US overlap:',file);
 }
 await catalogue(us,usCat);const usFirst=load(us+'first.bin');save(us+'context.bin',await countryContext('united-states',usFirst.regions,new Map(usCat.records.map(r=>[r.id,r])),command));
 const usLand=load(us+'context.bin'),caLand=load(ca+'context.bin'),caNear=lineIndex(caLand.features.flatMap(f=>polygons(f.geometry).flat()));
 const refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),reference=fc(refs.features.filter(f=>['USA','CAN'].every(c=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(c))&&linesOf(fc([f])).some(p=>p.some(q=>q[0]>-125)))),nearRef=lineIndex(linesOf(reference));
 const lakes=landIndex(load('scripts/boundary-sources/nordics/ne-lakes.json.gz').features.flatMap(f=>polygons(f.geometry).flat()));
 const landRuns=[];
 for(const f of usLand.features)for(const poly of polygons(f.geometry)){
  const ring=poly[0];let run;
  for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],mid=a.map((v,j)=>(v+b[j])/2),selected=mid[0]>-122.8&&mid[0]<-66.8&&nearRef(mid)<6000&&caNear(mid)<1500&&!lakes(mid);if(!selected){run=null;continue;}if(!run)landRuns.push(run=[a]);run.push(b);}
 }
 const landFeatures=landRuns.map(coordinates=>({type:'Feature',properties:{countries:['united-states'],pair:'CAN-USA',resolvedFrontier:'USA-CAN-SHARED-LAND'},geometry:{type:'LineString',coordinates}}));
 // Clip water paths against both displayed countries; never connect the ends of
 // separate runs. The old per-reference-vertex stitching created the triangles.
 const both=await command(fc([...usLand.features,...caLand.features]),'-dissolve2');
 const wet=await command({'line.json':reference,'land.json':both},'-erase land.json',{precision:.0000001});
 const nearLand=lineIndex(landRuns),waterRuns=[];
 for(const p of linesOf(wet)){let run;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],mid=a.map((v,j)=>(v+b[j])/2);if(nearLand(mid)<750){run=null;continue;}if(!run)waterRuns.push(run=[a]);run.push(b);}}
 const previous=load(us+'international.bin'),other=previous.features.filter(f=>f.properties.pair!=='CAN-USA'||f.properties.resolvedFrontier==='USA-CAN-ALASKA');
 save(us+'international.bin',lineData(fc([...other,...landFeatures,...waterRuns.map(coordinates=>({type:'Feature',properties:{countries:['united-states'],pair:'CAN-USA',resolvedFrontier:'USA-CAN-SHARED-WATER'},geometry:{type:'LineString',coordinates}}))])));
 // The western international line comes directly from the IBC survey, including
 // open water. A Natural Earth water fallback was over a kilometre too far south.
 const cut=-95.2909317;
 const crop=(path,west)=>{const output=[];let run;for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],ia=west?a[0]<=cut:a[0]>=cut,ib=west?b[0]<=cut:b[0]>=cut;if(!ia&&!ib){run=null;continue;}if(ia!==ib){const t=(cut-a[0])/(b[0]-a[0]),q=[cut,a[1]+(b[1]-a[1])*t];if(!ia)a=q;else b=q;}if(!run)output.push(run=[a]);run.push(b);if(!ib)run=null;}return output;};
 const surveyed=load('scripts/boundary-sources/us-canada/ibc-v1.3.geojson.gz'),western=surveyed.features.filter(f=>f.properties.SectionNum>=19&&f.properties.SectionNum<=26).flatMap(f=>linesOf(fc([f])).flatMap(p=>crop(p,true)).map(coordinates=>({type:'Feature',properties:{countries:['united-states'],pair:'CAN-USA',resolvedFrontier:'USA-CAN-SURVEYED',ibcSection:f.properties.SectionNum},geometry:{type:'LineString',coordinates}})));
 const currentLines=load(us+'international.bin'),east=currentLines.features.flatMap(f=>f.properties.pair!=='CAN-USA'||f.properties.resolvedFrontier==='USA-CAN-ALASKA'?[f]:linesOf(fc([f])).flatMap(p=>crop(p,false)).map(coordinates=>({...f,geometry:{type:'LineString',coordinates}})));
 save(us+'international.bin',lineData(fc([...east,...western])));
 // Use the same land in the resident fallback as in the country previews.
 const world=load('dist/data/world-land.bin');save('dist/data/world-land.bin',{...world,features:[...world.features.filter(f=>!['canada','united-states'].includes(f.properties.country)),...caLand.features,...usLand.features]});
 fs.writeFileSync(reportFile,JSON.stringify({version:4,surveySource:'scripts/boundary-sources/us-canada/ibc-source.json',method:'The western land and water border follows the retained IBC v1.3 survey. Complete shared land arcs align both national hierarchies. Continuous exterior runs draw the land frontier, with no joins between unrelated fragments. Water paths are clipped against both country fills. Existing Alaska and Mexico lines and Minnesota lake cutouts are retained.',landRuns:landRuns.length,waterRuns:waterRuns.length,arcs:arcs.map(a=>({name:a.name,path:a.path})),fingerprints:Object.fromEntries(fingerprintFiles.map(f=>[f,hash(f)])),changed},null,2)+'\n');
 console.log('Shared US–Canada frontier:',landRuns.length,'land runs,',waterRuns.length,'water runs;',changed.length,'updated assets.');
}
