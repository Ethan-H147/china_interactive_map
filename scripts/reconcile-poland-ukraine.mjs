import fs from 'node:fs';
import {load,polygons,landIndex,metres} from './geo-index.mjs';import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';import {selectFrontierArc} from './frontier-arcs.mjs';
import {alignArc,save} from './korean-frontiers.mjs';
const base='dist/data/europe/ukraine/',root='scripts/boundary-sources/poland-ukraine/';
export async function reconcilePolandUkraine(){
 const reference=load('scripts/boundary-sources/poland/frontiers.bin').features.find(f=>f.properties.pair==='POL-UKR'),canonical=selectFrontierArc(await command(load('dist/data/europe/poland/first.bin').regions,'-dissolve'),reference.geometry.coordinates).path;
 fs.mkdirSync(root,{recursive:true});const cat=load(base+'catalogue.bin'),first=load(base+'first.bin'),changed=new Map();
 for(const name of ['first.bin','catalogue.bin','context.bin','international.bin'])if(!fs.existsSync(root+name))fs.copyFileSync(base+name,root+name);
 const oldArc=selectFrontierArc(await command(load(root+'first.bin').regions,'-dissolve'),reference.geometry.coordinates).path;
 const position=p=>{let best;for(let i=1;i<canonical.length;i++){const a=canonical[i-1],b=canonical[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])].map(v=>+v.toFixed(6)),d=metres(p,q);if(!best||d<best.d)best={q,index:i-1+t,d};}return best;};
 let a=position(oldArc[0]),b=position(oldArc.at(-1));if(a.index>b.index)[a,b]=[b,a];const trimmed=[a.q,...canonical.slice(Math.floor(a.index)+1,Math.ceil(b.index)),b.q];canonical.splice(0,canonical.length,...trimmed);
 for(const level of [1,2]){
  const entries=Object.entries(cat.chunks).filter(([,ch])=>ch.level===level),source=level===1?first.regions:fc(entries.flatMap(([,ch])=>load(base+ch.file).regions.features));
  if(!source.features.length)continue;
  const result=await alignArc(source,canonical,{maxDistance:20000,maxDeviationMetres:5});for(const f of result.regions.features)changed.set(f.properties.id,f);
  if(level===1){first.regions=result.regions;first.boundaries=sharedBorders(first.regions);save(base+'first.bin',first);}
  else for(const [parent,ch]of entries){const d=load(base+ch.file),regions=fc(d.regions.features.map(f=>changed.get(f.properties.id)||f));if(JSON.stringify(regions)===JSON.stringify(d.regions))continue;if(!fs.existsSync(root+ch.file)){fs.mkdirSync((root+ch.file).slice(0,(root+ch.file).lastIndexOf('/')),{recursive:true});fs.copyFileSync(base+ch.file,root+ch.file);}d.regions=regions;d.boundaries=sharedBorders(regions);save(base+ch.file,d);ch.bytes=fs.statSync(base+ch.file).size;ch.decodedBytes=Buffer.byteLength(JSON.stringify(d));}
  console.log('Ukraine level',level,result.runs.length,'border runs aligned to Poland');
 }
 for(const r of cat.records){const f=changed.get(r.id);if(!f)continue;r.bounds=geographicBounds(f.geometry);if(!landIndex(polygons(f.geometry).flat())(r.center))r.center=(await command(fc([f]),'-points inner')).features[0].geometry.coordinates;}
 save(base+'catalogue.bin',cat);
 const context=load(base+'context.bin'),home=fc(context.features.filter(f=>!f.properties.region)),result=await alignArc(home,canonical,{maxDistance:20000,maxDeviationMetres:5});save(base+'context.bin',fc([...result.regions.features,...context.features.filter(f=>f.properties.region)]));
 const lines=load(base+'international.bin');lines.features=lines.features.filter(f=>!['POL-UKR','UKR-POL'].includes(f.properties.pair));save(base+'international.bin',lines);
 if(fs.existsSync(base+'all.bin')){const all=load(base+'all.bin');for(const l of all.levels||[])if(l.regions){l.regions=fc(l.regions.features.map(f=>changed.get(f.properties.id)||f));l.boundaries=sharedBorders(l.regions);}save(base+'all.bin',all);}
 save(root+'resolved.bin',fc([{...reference,geometry:{type:'LineString',coordinates:canonical}}]));
 const report={source:'../poland/frontiers.bin',boundary:'GUGiK PRG national boundary, 20 October 2026',method:'The complete Polish administrative frontier is shared with Ukrainian regions, districts and overview; one continuous international stroke is rendered by Poland.',endpoints:[canonical[0],canonical.at(-1)],vertices:canonical.length};fs.writeFileSync(root+'sources.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync('dist/data/poland-ukraine-frontier-sources.json',JSON.stringify(report,null,2)+'\n');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/reconcile-poland-ukraine.mjs'))await reconcilePolandUkraine();

