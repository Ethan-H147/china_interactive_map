import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {landmarksFor} from '../dist/explore.mjs';
import {candidates} from '../dist/quiz-engine.mjs';
const sharp=createRequire(import.meta.url)(process.env.ATLAS_SHARP||'sharp');
const read=name=>JSON.parse(fs.readFileSync('dist/data/'+name));
const display=readData('display-boundaries.json'),articles=read('region-articles.json').regions;
const prefectures=display.subdivisions.features.filter(f=>f.properties.level==='city'&&String(f.properties.adcode).slice(2,4)!=='90');
assert.equal(prefectures.length,333);
for(const f of prefectures){const a=articles[f.properties.adcode];assert(a?.en||a?.zh,'Missing article '+f.properties.adcode);for(const lang of ['en','zh'])if(a[lang]){assert.equal(new URL(a[lang].url).hostname,lang+'.wikipedia.org');assert(!a[lang].url.includes('Special:Search'));}}
const data=JSON.parse(gunzipSync(fs.readFileSync('dist/data/city-districts.bin'))),names=read('city-district-names.json').regions;
assert.equal(data.regions.features.filter(f=>!f.properties.functionalArea).length,53);assert.equal(data.regions.features.length,54);assert.equal(new Set(data.regions.features.map(f=>f.properties.adcode)).size,54);
const expected={330100:13,320100:11,320500:10,440100:11,440300:9};
const fc=features=>({type:'FeatureCollection',features});
const parts=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const area=g=>parts(g).reduce((sum,p)=>sum+p.reduce((a,r,i)=>a+(i?-1:1)*Math.abs(r.slice(1).reduce((n,b,j)=>n+(r[j][0]-r[0][0])*(b[1]-r[0][1])-(b[0]-r[0][0])*(r[j][1]-r[0][1]),0)/2),0),0);
const total=collection=>collection.features.reduce((n,f)=>n+(f.geometry?area(f.geometry):0),0);
const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson geojson-type=FeatureCollection',files))['output.json']);
for(const [code,count] of Object.entries(expected)){
 const children=fc(data.regions.features.filter(f=>f.properties.parentCity===Number(code))),parent=display.subdivisions.features.find(f=>f.properties.adcode===Number(code));
 assert.equal(children.features.length,count);
 for(const {properties:p,geometry:g} of children.features){assert(names[p.adcode]?.en);assert(articles[p.adcode]?.en||articles[p.adcode]?.zh);assert.equal(p.level,'city-district');assert.equal(p.provinceCode,parent.properties.provinceCode);for(const poly of parts(g))for(const ring of poly){assert.deepEqual(ring[0],ring.at(-1));assert(ring.every(p=>p.every(Number.isFinite)));}}
 const union=await run('-i children.json -dissolve',{'children.json':children});
 assert(Math.abs(total(children)-total(union))<1e-8,'District overlap '+code);
 const outside=await run('-i children.json -erase parent.json',{'children.json':children,'parent.json':parent});assert(total(outside)<1e-9,'Outside parent '+code);
 const missing=await run('-i parent.json -erase children.json',{'parent.json':parent,'children.json':children});assert(total(missing)/area(parent.geometry)<.005,'Coverage gap '+code);
 const mesh=data.boundaries.features.find(f=>f.properties.parentCity===Number(code));assert(mesh.geometry.coordinates.length>0);
}
const all=[...display.provinces.features,...display.subdivisions.features,...data.regions.features].map(feature=>({feature}));
assert.equal(candidates(all,{scope:'',includeTaiwan:false}).length,333,'Districts must not enter prefecture quizzes');
const gallery=read('landmarks.json');assert.equal(gallery.landmarks.length,20);assert.equal(new Set(gallery.landmarks.map(s=>s.city)).size,10);
for(const s of gallery.landmarks){const p=s.photo,m=await sharp('dist/'+p.src).metadata();assert.equal(m.width,p.width);assert.equal(m.height,p.height);assert.equal(m.width,p.sourceWidth);assert.equal(m.height,p.sourceHeight);assert(Math.max(m.width,m.height)>=2560&&Math.min(m.width,m.height)>=1600);assert(p.author&&p.license&&p.licenseUrl&&p.source);assert.equal(new URL(p.source).hostname,'commons.wikimedia.org');assert(landmarksFor(gallery,s.city).includes(s));assert(landmarksFor(gallery,s.district).includes(s));}
assert.equal(landmarksFor(gallery,330000).length,0);assert.equal(landmarksFor(gallery,330108).length,0);assert.equal(landmarksFor(gallery,610300).length,0);assert.equal(landmarksFor(gallery,330106).length,2);
const app=fs.readFileSync('dist/app.js','utf8');let returned;
const regions=new Map(all.map(r=>[r.feature.properties.adcode,r]));
const context=vm.createContext({cameraBusy:false,allReady:true,quiz:{active:false},atlasMode:'china',selected:regions.get(330106),provinceLayers:regions,regionByCode:regions,activeCode:330000,selectRegion:r=>{returned=r.feature.properties.adcode;},reset:()=>{returned=null;}});
context.selected={layer:regions.get(330106)};
vm.runInContext(app.slice(app.indexOf('function viewParent('),app.indexOf("$('zoom-in').onclick")),context);
context.viewParent();assert.equal(returned,330100);context.selected={layer:regions.get(330100)};context.viewParent();assert.equal(returned,330000);context.selected={layer:regions.get(330000)};context.viewParent();assert.equal(returned,null);
const huqiu=data.regions.features.find(f=>f.properties.adcode===320505),park=data.regions.features.find(f=>f.properties.adcode==='suzhou-industrial-park');
assert.equal(parts(huqiu.geometry).length,1,'Huqiu must have no eastern detached part');
assert(parts(huqiu.geometry).every(p=>p[0].every(([x])=>x<120.63)));
assert.equal(park.properties.adminType,'Development Zone');assert.equal(park.properties.parentCity,320500);assert(park.properties.functionalArea);
const inRing=([x,y],r)=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [a,b]=r[i],[c,d]=r[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;};
for(const p of [[120.72,31.30],[120.75,31.37],[120.80,31.30]])assert(parts(park.geometry).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h))),'Industrial Park sample '+p);
console.log('Explore: 333 prefecture articles, 53 districts and Suzhou Industrial Park, 20 original-resolution photos; geometry, Huqiu separation, quiz exclusion, gallery scope and district → city → province navigation passed.');
