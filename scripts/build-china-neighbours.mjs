// China's land neighbours that are not atlas countries, at the precision of China's own outline,
// for the world map's background land (build-world-land.mjs), whichever country is open. The
// world map's 1:110m silhouettes cannot meet China's outline, leaving gaps and uneven edges.
// India's de facto territory (without the land China's outline holds or the Kashmir Pakistan
// administers), Nepal, Bhutan, Pakistan, Afghanistan, Bangladesh and Myanmar come from India's
// reconciliation with China (build-europe.mjs), so they meet China exactly. Kazakhstan,
// Kyrgyzstan, Tajikistan, Laos, Vietnam and the rest of Myanmar come from geoBoundaries, cut by
// China's outline and the shapes already drawn; land enclosed between them and China goes to the
// nearest of them. Mongolia, Russia and Korea draw their own detailed shapes.
// Usage: node scripts/build-china-neighbours.mjs (after build-europe.mjs)
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {polygons} from './geo-index.mjs';

const mapshaper=createRequire(import.meta.url)('mapshaper');
const source='artifacts/europe-source',fc=features=>({type:'FeatureCollection',features});
const load=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
async function command(data,commands,files={}){const out=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o result.json format=geojson precision=.000001',{'input.json':JSON.stringify(data),...Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))}))['result.json']);return (out.features||(out.geometries||[]).map(g=>({type:'Feature',properties:{},geometry:g}))).filter(f=>f.geometry&&polygons(f.geometry)[0]?.[0]?.length);}
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
const shape=(country,geometry)=>({type:'Feature',properties:{country},geometry});
const outline=file=>load(file).features.map(f=>shape('',f.geometry));

// China's displayed provinces, which its map fills (china-context.bin, its simplified portal, sits
// up to 300 m off them).
const china=(await import('./read-data.mjs')).readData('display-boundaries.json').provinces.features.map(f=>shape('',f.geometry)),others=[...outline('dist/data/mongolia-context.bin'),...outline('dist/data/russia/context.bin')];
const india=load('dist/data/europe/india/context.bin').features[0],indiaNeighbours=load('dist/data/europe/india/neighbours.bin').features;
const drawn=[shape('india',india.geometry),...indiaNeighbours];
const key=p=>p[0].toFixed(5)+','+p[1].toFixed(5);
for(const [edge,isos] of [[[66,34,92,50],[['kaz','kazakhstan'],['kgz','kyrgyzstan'],['tjk','tajikistan']]],[[92,8,110,30],[['mmr','myanmar'],['lao','laos'],['vnm','vietnam']]]]){
 const box=shape('',{type:'Polygon',coordinates:[[[edge[0],edge[1]],[edge[2],edge[1]],[edge[2],edge[3]],[edge[0],edge[3]],[edge[0],edge[1]]]]});
 const onEdge=g=>polygons(g).flat(2).some(p=>[0,2].some(i=>Math.abs(p[0]-edge[i])<1e-6)||[1,3].some(i=>Math.abs(p[1]-edge[i])<1e-6));
 const added=[];
 for(const [iso,name] of isos){
  const raw=JSON.parse(fs.readFileSync(path.join(source,'neighbour-'+iso+'-adm0.geojson'))).features.map(f=>shape(name,f.geometry));
  added.push(...await command(fc(raw),'-clip box.json -erase cut.json -dissolve country -clean',{'box.json':fc([box]),'cut.json':fc([...china,...others,...drawn,...added])}));
 }
 // Land enclosed between these neighbours and China goes to the nearest neighbour touching it.
 const vertices=new Map();for(const f of added)for(const p of polygons(f.geometry).flat(2))vertices.set(key(p),f.properties.country);
 const loose=(await command(fc([box]),'-erase land.json -explode',{'land.json':fc([...china,...others,...drawn,...added])})).filter(f=>!onEdge(f.geometry));
 const points=added.map(f=>({country:f.properties.country,points:polygons(f.geometry).flat(2).filter((p,i)=>i%4===0)}));
 const nearest=p=>{let best=null,d=Infinity;for(const v of points)for(const q of v.points){const m=metres(p,q);if(m<d){d=m;best=v.country;}}return best;};
 const gaps=loose.filter(f=>polygons(f.geometry).flat(2).some(p=>vertices.has(key(p))));
 for(const f of gaps)added.push(shape(nearest(polygons(f.geometry)[0][0][0]),f.geometry));
 const merged=await command(fc(added),'-dissolve2 country -clean');
 drawn.push(...merged);
 console.log('China neighbours',isos.map(([,n])=>n).join(', ')+':',merged.length,'shapes; filled',gaps.length,'gaps');
}
// Only a band about 80 km wide along China's outline needs this precision; beyond it the world
// map's silhouettes, in the same grey, take over without a visible seam.
const cell=.25,cells=new Set();
for(const f of china)for(const p of polygons(f.geometry).flat(2)){if(p[0]<60||p[0]>112||p[1]<5||p[1]>52)continue;const x=Math.floor(p[0]/cell),y=Math.floor(p[1]/cell);for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++)cells.add((x+dx)+','+(y+dy));}
const band=await command(fc([...cells].map(k=>{const [x,y]=k.split(',').map(Number);return shape('',{type:'Polygon',coordinates:[[[x*cell,y*cell],[(x+1)*cell,y*cell],[(x+1)*cell,(y+1)*cell],[x*cell,(y+1)*cell],[x*cell,y*cell]]]});})),'-dissolve2');
// China's own displayed land is in the band too, in its portal grey: while another country is open
// China shows its simplified portal (china-context.bin), which sits up to 300 m off the edge the
// neighbours were matched to.
const chinaLand=await command(fc(china.map(f=>shape('china',f.geometry))),'-dissolve2 country');
const clipped=await command(fc([...chinaLand,...drawn.map(f=>shape(f.properties.country||'',f.geometry))]),'-clip band.json',{'band.json':fc(band)});
const features=clipped.map(f=>({type:'Feature',properties:{country:f.properties.country||''},geometry:f.geometry}));
fs.writeFileSync('dist/data/china-neighbours.bin',gzipSync(JSON.stringify(fc(features)),{level:9}));
console.log('China neighbours:',features.map(f=>f.properties.country).join(', '),';',(fs.statSync('dist/data/china-neighbours.bin').size/1048576).toFixed(2),'MB');
