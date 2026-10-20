import fs from 'node:fs';import assert from 'node:assert/strict';import osm from 'osmtogeojson';import {topology} from 'topojson-server';import {mesh} from 'topojson-client';
import {load,polygons,landIndex,linesOf} from './geo-index.mjs';import {command,fc} from './build-regional-dataset.mjs';import {readData} from './read-data.mjs';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {root,save,koreanFrontiers,preserveKoreanFrontiers} from './korean-frontiers.mjs';
let islandCache;
export async function koreanIslands(){
 if(islandCache)return islandCache;const k=load('dist/data/korea-boundaries.bin'),districts=k.second.features.filter(f=>f.properties.country==='KP');
 const originals=new Map(districts.map(f=>[f.properties.id,f]));for(const id of [8426165,13284720]){const shape=osm(load(root+'district-'+id+'.json.gz')).features.find(f=>f.id==='relation/'+id);assert(shape?.geometry&&!shape.properties.tainted);originals.set('KP-'+id,{...shape,properties:districts.find(f=>f.properties.id==='KP-'+id).properties});}
 const provinces=[3781418,6648083].map(id=>({id:'KP-'+id,geometry:osm(load(root+'province-'+id+'.json.gz')).features.find(f=>f.id==='relation/'+id).geometry}));
 const data=fc(koreanFrontiers().islands.map((coordinates,i)=>({type:'Feature',properties:{island:i},geometry:{type:'Polygon',coordinates:[coordinates]}}))),points=await command(data,'-points inner');
 for(let i=0;i<data.features.length;i++){
  const point=points.features[i].geometry.coordinates,hits=[...originals.values()].filter(f=>landIndex(polygons(f.geometry).flat())(point)),provinceHits=provinces.filter(f=>landIndex(polygons(f.geometry).flat())(point));
  assert(hits.length<=1&&provinceHits.length<=1,'No conflicting source owners for island '+i);
  // Country relations agree on all islands; some subdivision sources omit them.
  // Keep those as Korean land without guessing a district from proximity.
  Object.assign(data.features[i].properties,{district:hits[0]?.properties.id??null,province:hits[0]?.properties.parent??provinceHits[0]?.id??null,center:point});
 }
 islandCache=data;return data;
}
export async function islandLand(data,kind){
 const islands=await koreanIslands(),properties=new Map(data.features.map(f=>[String(f.properties.id??f.properties.adcode??f.properties.country),f.properties]));
 const erased=await command({'land.json':data,'islands.json':islands},'-erase islands.json -clean gap-fill-area=0');
 if(kind!=='china')return erased;
 // Display policy: suppress small river enclaves and fill the enclosing Chinese
 // subdivision. Retain the original source geometry separately for attribution.
 const extra=islands.features.map(f=>{const hits=data.features.filter(g=>polygons(g.geometry).some(poly=>landIndex([poly[0]])(f.properties.center)));assert.equal(hits.length,1,'One enclosing Chinese region for island '+f.properties.island);return {...f,properties:hits[0].properties};});
 const merged=await command(fc([...erased.features,...extra].map(f=>({...f,properties:{key:String(f.properties.id??f.properties.adcode??f.properties.country)}}))),'-dissolve2 key -clean gap-fill-area=0');for(const f of merged.features)f.properties=properties.get(f.properties.key);return merged;
}
export const saveDisplay=data=>{const b=Buffer.from(JSON.stringify(data)),z=gzipSync(b,{level:9}),parts=[];for(let i=0;i<z.length;i+=4*1024*1024){const f='display-boundaries.'+String(parts.length).padStart(2,'0')+'.bin';parts.push(f);fs.writeFileSync('dist/data/'+f,z.subarray(i,i+4*1024*1024));}fs.writeFileSync('dist/data/display-boundaries.parts.json',JSON.stringify({compression:'gzip',parts,compressedBytes:z.length,uncompressedBytes:b.length,sha256:createHash('sha256').update(b).digest('hex')},null,2)+'\n');};
const cropMesh=(g,inside)=>{const out=[];for(const path of linesOf(fc([{geometry:g}]))){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;if((x>123.5&&x<131.5&&y>39.7&&y<43.5)!==inside){run=null;continue;}if(!run)out.push(run=[a]);run.push(b);}}return out;};
export async function reconcileKoreanIslands(){
 const islands=await koreanIslands(),display=readData('display-boundaries.json');
 for(const key of ['provinces','subdivisions']){const hit=f=>(f.properties.provinceCode??f.properties.adcode)===220000,fixed=await islandLand(fc(display[key].features.filter(hit)),'china');display[key]=fc([...display[key].features.filter(f=>!hit(f)),...fixed.features]);}
 // National borders belong exclusively to the gray international layer. Rebuild
 // only the provincial interior mesh here, so old hole rings cannot reappear.
 const t=topology({regions:display.provinces}),internal=mesh(t,t.objects.regions,(a,b)=>a!==b);display.boundaries.province={type:'MultiLineString',coordinates:[...cropMesh(display.boundaries.province,false),...cropMesh(internal,true)]};saveDisplay(display);
 const countyFile='dist/data/china-counties.bin',county=load(countyFile),hit=f=>f.properties.provinceCode===220000,fixed=await islandLand(fc(county.regions.features.filter(hit)),'china');county.regions=fc([...county.regions.features.filter(f=>!hit(f)),...fixed.features]);save(countyFile,county);
 const k=load('dist/data/korea-boundaries.bin');for(const key of ['first','second']){const fixed=await islandLand(fc(k[key].features.filter(f=>f.properties.country==='KP')),key);k[key]=fc([...k[key].features.filter(f=>f.properties.country!=='KP'),...fixed.features]);}
 // Country silhouettes are dissolved independently, preserving the existing DMZ.
 k.countries=fc([...(await islandLand(await command(fc(k.first.features.filter(f=>f.properties.country==='KP')),'-dissolve country'),'portal')).features,...k.countries.features.filter(f=>f.properties.country!=='KP')]);save('dist/data/korea-boundaries.bin',k);save('dist/data/korea-outline.bin',k.countries);
 const resolvedFile=root+'resolved.bin',resolved=load(resolvedFile);resolved.features=resolved.features.filter(f=>!f.properties.island);save(resolvedFile,resolved);save('dist/data/korean-frontiers.bin',resolved);save('dist/data/korean-river-islands.bin',islands);preserveKoreanFrontiers();console.log('Suppressed',islands.features.length,'river island enclaves in all display levels; source shapes retained separately.');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/korean-river-islands.mjs'))await reconcileKoreanIslands();
