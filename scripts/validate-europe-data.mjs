import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {configurations} from '../dist/europe.mjs';

// Outline-only countries: one level-1 region per country, drawn land frontiers, no coastlines.
const root='dist/data/europe',read=(c,n)=>JSON.parse(gunzipSync(fs.readFileSync(root+'/'+c+'/'+n)));
const countries=['united-kingdom','spain','france','italy'];
assert.deepEqual(Object.keys(configurations),countries);
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
function inRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(a[1]>p[1]!==b[1]>p[1]&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const contains=(g,p)=>polygons(g).some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(hole=>inRing(p,hole)));
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
const outline={},lines={};
// Land frontier lengths, excluding the France–Spain and France–Italy seams France holds.
const frontierKm={'united-kingdom':[480,530],spain:[1300,1400],france:[2850,3000],italy:[1380,1450]};
// Pieces: Ireland; Portugal, Andorra, Ceuta, Melilla, Gibraltar; Pyrenees, Monaco, Alps, Geneva to the North Sea, Llívia; Slovenia to Mont Dolent, San Marino, Vatican, Campione.
const pieces={'united-kingdom':1,spain:5,france:5,italy:4};
for(const country of countries){
 const catalogue=read(country,'catalogue.bin'),first=read(country,'first.bin'),context=read(country,'context.bin');
 assert.deepEqual(catalogue.levels,['Country']);assert.equal(catalogue.records.length,1);assert.deepEqual(catalogue.counts,{1:1});
 const [record]=catalogue.records;assert.equal(record.level,1);assert.equal(record.parent,null);assert.deepEqual(record.bounds,configurations[country].bounds,country+' selection frames the configured bounds');
 assert.equal(first.regions.features.length,1);assert.equal(first.regions.features[0].properties.id,record.id);assert.equal(first.boundaries.features.length,0);
 assert.equal(context.features.length,1);assert.equal(context.features[0].properties.country,country);
 outline[country]=context.features[0].geometry;
 assert.deepEqual(JSON.stringify(first.regions.features[0].geometry),JSON.stringify(outline[country]),country+' region and silhouette are the same outline');
 lines[country]=read(country,'international.bin').features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates);
 const km=lines[country].reduce((s,p)=>s+p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0),0)/1000;
 assert(km>=frontierKm[country][0]&&km<=frontierKm[country][1],country+' land frontier '+km.toFixed(0)+' km');
 const joined=[];for(const p of lines[country]){const last=joined.at(-1);if(last&&metres(last.at(-1),p[0])<1)last.push(...p.slice(1));else joined.push([...p]);}
 assert.equal(joined.length,pieces[country],country+' frontier is continuous: '+joined.length+' pieces');
 const sources=JSON.parse(fs.readFileSync(root+'/'+country+'/sources.json'));assert(sources.sources.every(s=>s.sha256&&s.license),country+' sources are pinned and licensed');
}
// Enclaves, microstates and exclaves.
assert(contains(outline.spain,[1.985,42.462])&&!contains(outline.france,[1.985,42.462]),'Llívia is Spanish inside France');
for(const [name,p] of [['San Marino',[12.45,43.94]],['Vatican City',[12.453,41.904]]])assert(!contains(outline.italy,p),name+' is not Italian');
assert(!contains(outline.france,[7.42,43.737]),'Monaco is not French');
for(const country of ['france','spain'])assert(!contains(outline[country],[1.52,42.55]),'Andorra is outside '+country);
for(const [country,p] of [['united-kingdom',[-1.5,52.5]],['united-kingdom',[-6.6,54.6]],['spain',[-3.7,40.4]],['spain',[-15.6,28.1]],['france',[2.35,48.85]],['france',[9.1,42.1]],['italy',[12.5,41.85]],['italy',[14,37.5]]])assert(contains(outline[country],p),country+' contains '+p);
// France holds its seams with Spain and Italy, which therefore touch exactly.
const near=(paths,p,limit)=>paths.some(path=>path.some((q,i)=>i&&(()=>{const a=path[i-1],c=Math.cos(p[1]*Math.PI/180),dx=(q[0]-a[0])*c,dy=q[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return metres(p,[a[0]+u*(q[0]-a[0]),a[1]+u*(q[1]-a[1])])<limit;})()));
for(const [p,label] of [[[-0.7,42.8],'Pyrenees'],[[7.0,45.9],'Mont Blanc'],[[7.6,44.15],'Maritime Alps']])assert(near(lines.france,p,8000),'France draws the '+label+' frontier');
for(const country of ['spain','italy']){let shared=0;for(const path of lines[country])for(const p of path)if(near(lines.france,p,1))shared++;assert(shared<=4,country+' does not redraw France\'s frontier ('+shared+' points)');}
// Coastlines carry no stroke.
for(const [country,p,place] of [['united-kingdom',[1.33,51.13],'Dover'],['france',[-1.56,43.48],'Biarritz'],['spain',[-1.78,43.39],'Hondarribia'],['italy',[7.53,43.79],'Ventimiglia'],['spain',[-5.35,36.14],'La Línea'],['italy',[13.755,45.607],'Muggia bay'],['italy',[13.715,45.602],'Punta Sottile'],['france',[7.40,43.722],'Cap d’Ail'],['france',[7.447,43.751],'Roquebrune'],['spain',[-5.416,35.913],'Perejil'],['united-kingdom',[-6.2,54.05],'Carlingford Lough mouth']])assert(!near(lines[country],p,250),place+' shore is not outlined');
// Frontiers reach the coast where OpenStreetMap's land border ways do.
for(const [country,p,place] of [['italy',[13.7228,45.5947],'Lazzaretto'],['france',[7.4185,43.7248],'Fontvieille'],['france',[7.4392,43.749],'Larvotto'],['spain',[-5.382,35.9125],'Benzú'],['spain',[-5.3431,35.8709],'Tarajal'],['spain',[-2.952,35.3201],'Melilla north'],['spain',[-2.9294,35.2719],'Melilla south'],['spain',[-5.345,36.1532],'Gibraltar'],['united-kingdom',[-7.26,55.065],'Lough Foyle']])assert(near(lines[country],p,150),country+' frontier reaches '+place);
console.log('Europe outlines: one country region each, enclaves and microstates, shared France seams drawn once, land frontiers without coastline.');
