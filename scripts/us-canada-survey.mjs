import fs from 'node:fs';import {gzipSync,gunzipSync} from 'node:zlib';
import {load,polygons,lineIndex,landIndex,metres,linesOf} from './geo-index.mjs';
import {fc,command,geographicBounds} from './build-regional-dataset.mjs';import {countryContext} from './country-context.mjs';
const key=p=>p.map(x=>Math.round(x*1e7)).join(',');
// Deform complete exterior runs and their shared junctions. Geometric matching
// also handles county/municipality vertices inserted along a national segment.
function surveyTransform(regions,arc,{tolerance=.3}={}){
 const ownNear=lineIndex([arc.own]),moved=new Map();let changed=0;
 const project=p=>{const k=key(p);if(moved.has(k))return moved.get(k);let best;for(let i=1;i<arc.path.length;i++){const a=arc.path[i-1],b=arc.path[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=a.map((v,j)=>v+(b[j]-v)*u),d=metres(p,q);if(!best||d<best.d)best={q:q.map(x=>+x.toFixed(7)),position:i-1+u,d};}if(best.d>250)throw Error('Survey correction exceeds 250m');moved.set(k,best);return best;};
 const selected=(a,b)=>[0,.25,.5,.75,1].every(t=>ownNear(a.map((v,j)=>v+(b[j]-v)*t))<tolerance);
 const staged=regions.features.map(f=>({f,parts:polygons(f.geometry).map(poly=>poly.map(ring=>{
  const n=ring.length-1,flags=ring.slice(1).map((b,i)=>selected(ring[i],b));if(!flags.some(Boolean))return [{path:ring,selected:false}];
  let start=flags.indexOf(false);if(start<0)return [{path:ring,selected:false}];const groups=[];
  for(let k=1;k<=n;k++){const i=(start+k)%n,a=ring[i],b=ring[(i+1)%n],yes=flags[i];if(!groups.length||groups.at(-1).selected!==yes)groups.push({path:[a],selected:yes});groups.at(-1).path.push(b);}
  for(const g of groups)if(g.selected){let a=project(g.path[0]),b=project(g.path.at(-1)),reverse=a.position>b.position;if(reverse)[a,b]=[b,a];g.replacement=[a.q,...arc.path.slice(Math.floor(a.position)+1,Math.ceil(b.position)),b.q];if(reverse)g.replacement.reverse();changed++;}return groups;
 }))}));
 const result=fc(staged.map(({f,parts})=>{const coordinates=parts.map(poly=>poly.map(groups=>{const out=[];for(const g of groups){const path=g.replacement||g.path.map(p=>moved.get(key(p))?.q||p);if(!out.length)out.push(path[0]);out.push(...path.slice(1));}return out.filter((p,i)=>!i||key(p)!==key(out[i-1]));}));return {...f,geometry:{type:f.geometry.type,coordinates:f.geometry.type==='Polygon'?coordinates[0]:coordinates}};}));
 return {regions:result,changed,move:p=>moved.get(key(p))?.q||(ownNear(p)<tolerance?project(p).q:p)};
}
export async function prepareSurveyedUSBorder(){
 const root='scripts/boundary-sources/us-canada/',arcs=load(root+'surveyed-land-arcs.json'),base='dist/data/europe/united-states/',cat=load(base+'catalogue.bin'),current=load(base+'context.bin'),near=lineIndex(current.features.flatMap(f=>polygons(f.geometry).flat()));
 if(cat.usCanadaSurvey==='IBC-v1.3'&&arcs.every(a=>a.path.every(p=>near(p)<3))){console.log('US land already follows the IBC survey.');return;}
 const states=['US-WA','US-ID','US-MT','US-ND','US-MN'],files=['first.bin',...states.flatMap(id=>[cat.chunks[id]?.file,cat.thirdChunks[id]?.file,cat.thirdChunks[id]?.censusFile]).filter(Boolean)],changed=[],shapes=new Map();
 const save=(file,data)=>{const text=JSON.stringify(data);if(gunzipSync(fs.readFileSync(file)).toString()===text)return;fs.writeFileSync(file,gzipSync(text,{level:9}));changed.push(file);};
 for(const file of files){const data=load(base+file);let regions=data.regions,boundaries=data.boundaries,touched=false;
  for(const arc of arcs){const result=surveyTransform(regions,arc,{tolerance:file.startsWith('municipalities/')?80:.3});if(!result.changed)continue;regions=result.regions;touched=true;boundaries={...boundaries,features:boundaries.features.map(f=>{const paths=linesOf(fc([f])).map(p=>p.map(result.move));return {...f,geometry:{type:f.geometry.type,coordinates:f.geometry.type==='LineString'?paths[0]:paths}};})};}
  if(!touched)continue;for(const f of regions.features)shapes.set(f.properties.id,f);save(base+file,{...data,regions,boundaries});console.log('Surveyed US edge:',file);
 }
 for(const c of [...Object.values(cat.chunks),...Object.values(cat.thirdChunks||{})])if(changed.includes(base+c.file)){c.bytes=fs.statSync(base+c.file).size;c.decodedBytes=gunzipSync(fs.readFileSync(base+c.file)).length;}
 for(const c of Object.values(cat.thirdChunks||{}))if(c.censusFile&&changed.includes(base+c.censusFile)){c.censusBytes=fs.statSync(base+c.censusFile).size;c.censusDecodedBytes=gunzipSync(fs.readFileSync(base+c.censusFile)).length;}cat.usCanadaSurvey='IBC-v1.3';
 const records=new Map(cat.records.map(r=>[r.id,r]));for(const [id,f]of shapes){const r=records.get(id);r.bounds=geographicBounds(f.geometry);if(!landIndex(polygons(f.geometry).flat())(r.center))r.center=(await command(fc([f]),'-points inner')).features[0].geometry.coordinates;}
 save(base+'catalogue.bin',cat);save(base+'context.bin',await countryContext('united-states',load(base+'first.bin').regions,records,command));
}
