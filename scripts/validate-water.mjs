import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createWaterDisplay} from '../dist/water.mjs';

const bytes=fs.readFileSync(new URL('../dist/data/major-water.bin',import.meta.url));
const data=JSON.parse(gunzipSync(bytes));
assert(bytes.length<250000,'Keep the optional overlay small');
const rivers=data.features.filter(f=>f.properties.kind==='river');
const lakes=data.features.filter(f=>f.properties.kind==='lake');
for(const name of ['Yangtze','Huang','Xi','Songhua','Tarim','Yarlung','Lancang','Nu'])assert(rivers.some(f=>f.properties.name===name),`Missing ${name}`);
for(const name of ['Qinghai','Poyang','Dongting','Tai','Namtso','Siling'])assert(lakes.some(f=>f.properties.name===name),`Missing ${name}`);
assert.equal(lakes.length,20);
const points=c=>typeof c[0]==='number'?[c]:c.flatMap(points);
for(const f of data.features){
  assert(f.geometry&&f.properties.sourceId);
  assert(['LineString','MultiLineString','Polygon','MultiPolygon'].includes(f.geometry.type));
  for(const [x,y] of points(f.geometry.coordinates))assert(Number.isFinite(x)&&Number.isFinite(y)&&x>=73&&x<=136&&y>=18&&y<=54);
}
// The source's 1:10M centerline ends in Jiangsu. Keep the sourced continuation
// through Shanghai and both estuary channels even beyond the land clip mask.
const yangtze=rivers.filter(f=>f.properties.name==='Yangtze');
const lower=yangtze.find(f=>f.properties.sourceId==='osm-relation-9392345');
assert(lower,'Missing the mapped lower Yangtze');
assert.equal(lower.geometry.coordinates.length,5,'Retain the main river and four mapped downstream branches');
const lowerPoints=points(lower.geometry.coordinates);
assert(Math.max(...lowerPoints.map(p=>p[0]))>122.3,'Yangtze must reach the sea beyond Shanghai');
assert(lowerPoints.some(([x,y])=>x>121.8&&y>31.6),'Missing the northern Chongming estuary branch');
assert(lowerPoints.some(([x,y])=>x>122.1&&y<31.5),'Missing the southern estuary channel');
const joined=lower.geometry.coordinates[0][0];
assert(yangtze.some(f=>f!==lower&&points(f.geometry.coordinates).some(p=>p[0]===joined[0]&&p[1]===joined[1])),'Yangtze continuation must meet its upstream geometry exactly');
assert(yangtze.some(f=>points(f.geometry.coordinates).some(([x,y])=>x<114.5&&y>30)),'Do not remove the upstream Yangtze when repairing its mouth');

function setup(load){
  const elements={'water-layer':{checked:false,addEventListener(_,fn){this.change=fn;}},'water-status':{hidden:true}};
  globalThis.document={getElementById:id=>elements[id]};
  const layers=new Map();let sources=0;
  const map={addSource(){sources++;},addLayer(layer){assert(!layers.has(layer.id));layers.set(layer.id,layer);},setLayoutProperty(id,key,value){layers.get(id).layout[key]=value;}};
  const state={mode:'china',quiz:false};
  const display=createWaterDisplay(map,{mode:()=>state.mode,quiz:()=>state.quiz,load});
  return{state,display,elements,layers,get sources(){return sources;},toggle(value){elements['water-layer'].checked=value;return elements['water-layer'].change();}};
}
let resolve,loads=0;
const app=setup(()=>{loads++;return new Promise(r=>resolve=r);});
assert.equal(loads,0,'Do not load water data before it is requested');
const first=app.toggle(true);await app.toggle(false);const second=app.toggle(true);
assert.equal(loads,1,'Rapid toggles share one request');
app.state.mode='korea';app.display.sync();resolve(data);await Promise.all([first,second]);
const visibility=expected=>{for(const layer of app.layers.values())assert.equal(layer.layout.visibility,expected);};
visibility('none');app.state.mode='china';app.display.sync();visibility('visible');
app.state.quiz=true;app.display.sync();visibility('none');
app.state.quiz=false;app.display.sync();visibility('visible');
await app.toggle(false);visibility('none');await app.toggle(true);visibility('visible');
assert.equal(app.sources,1);assert.equal(loads,1);
let attempts=0;
const retry=setup(async()=>{if(++attempts===1)throw Error('Expected failed request');return data;});
await retry.toggle(true);assert.equal(retry.elements['water-layer'].checked,false);
assert.equal(retry.elements['water-status'].hidden,false);
await retry.toggle(true);assert.equal(retry.sources,1);assert.equal(retry.elements['water-status'].hidden,true);
console.log(`Water layer validated: ${rivers.length} river sections, ${lakes.length} lakes; lazy loading, rapid toggles, mode changes, quiz and retry.`);
