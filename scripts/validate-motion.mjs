import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {GeoJSONVT} from '@maplibre/geojson-vt';
import earcut,{flatten,deviation} from 'earcut';
import {createMotionRenderer,setFeatureState,queryRegions} from '../dist/motion.mjs';

const manifest=JSON.parse(fs.readFileSync('dist/data/motion-boundaries.parts.json'));
const parts=manifest.parts.map(name=>fs.readFileSync('dist/data/'+name));
assert(parts.every(part=>part.length<=3_000_000));
const data=JSON.parse(gunzipSync(Buffer.concat(parts)));
const report=JSON.parse(fs.readFileSync('dist/data/motion-boundaries-report.json'));
assert(report.reductionPercent>80);
for(const [id,expected] of [['provinces',34],['prefectures',355],['korea-first',29],['korea-second',428],['mongolia-first',22],['mongolia-second',339]]){
 const ids=new Set([...data[id].features,...data[id+'-fragments']?.features||[]].map(f=>f.properties.adcode??f.properties.id));assert.equal(ids.size,expected,`${id} retains every selectable region`);
}
assert.equal(data['fill-outlines'].features.length,2);
for(const [id,code] of [['provinces',220000],['prefectures',222400]]){
 const triangles=data[id+'-fragments'].features.filter(f=>f.properties.adcode===code);
 const vt=new GeoJSONVT({type:'FeatureCollection',features:triangles},{maxZoom:18,extent:8192,buffer:2048,tolerance:0});
 for(const [z,x,y] of [[5,27,11],[6,54,23],[7,109,47],[8,219,94]])for(const f of vt.getTile(z,x,y)?.features||[]){
  const flat=flatten(f.geometry),error=deviation(flat.vertices,flat.holes,2,earcut(flat.vertices,flat.holes,2));assert(error<1e-8,'Motion fills must not reopen the Jilin overdraw');
 }
}

const feature=id=>({type:'Feature',properties:{adcode:id,parentCity:330100},geometry:{type:'Polygon',coordinates:[[[120,30],[121,30],[120,31],[120,30]]]}});
const blob=items=>new Blob([JSON.stringify({type:'FeatureCollection',features:items})]);
let prepared={
 provinces:{data:blob([feature(1),feature(2)]),ids:[1,2]},
 prefectures:{data:null,ids:[11,12],features:{11:new Blob([JSON.stringify(feature(11))]),12:new Blob([JSON.stringify(feature(12))])}},
 'prefectures-selection-edges':{data:null,ids:[11,12],features:{11:new Blob([JSON.stringify(feature(11))]),12:new Blob([JSON.stringify(feature(12))])}}
};
globalThis.window={addEventListener(){}};
const frames=[];
globalThis.document={createElement(){const frame={style:{},setAttribute(){},getContext:()=>({drawImage(){}})};frames.push(frame);return frame;}};
globalThis.Worker=class{constructor(){queueMicrotask(()=>this.onmessage({data:{sources:prepared}}));}terminate(){}};
function fakeMap(){
 const layers=[{id:'province-fill',type:'fill',source:'provinces',paint:{'fill-opacity':1}},{id:'prefecture-fill',type:'fill',source:'prefectures',filter:['==',['get','parentCity'],330100],paint:{'fill-opacity':['case',['boolean',['feature-state','selected'],false],.3,.025]}},{id:'prefecture-selection',type:'line',source:'prefectures-selection-edges',layout:{visibility:'none'},paint:{'line-opacity':0}}];
 const sources=new Map(layers.map(l=>[l.source,{type:'geojson',promoteId:'adcode'}])),states=new Map(),listeners=new Map();
 const map={layers,sources,sourceLoaded:true,fullyLoaded:false,getCanvas:()=>({width:800,height:600,after(){}}),
  getStyle:()=>({layers:structuredClone(layers),sources:Object.fromEntries(sources)}),
  getLayer:id=>layers.find(l=>l.id===id),getSource:id=>sources.get(id),
  addSource(id,options){sources.set(id,{...options,setData:async data=>{sources.get(id).data=data;}});},
  addLayer:layer=>layers.push(layer),moveLayer(){},
  getLayoutProperty:(id,key)=>map.getLayer(id)?.layout?.[key],setLayoutProperty(id,key,value){const layer=map.getLayer(id);layer.layout??={};layer.layout[key]=value;},
  getPaintProperty:(id,key)=>map.getLayer(id).paint[key],setPaintProperty:(id,key,value)=>map.getLayer(id).paint[key]=value,
  getFilter:id=>map.getLayer(id).filter,setFilter:(id,value)=>map.getLayer(id).filter=value,
  getFeatureState:target=>states.get(`${target.source}:${target.id}`)||{},
  setFeatureState(target,state){const key=`${target.source}:${target.id}`;states.set(key,{...states.get(key),...state});},
  loaded:()=>map.fullyLoaded,isSourceLoaded:()=>map.sourceLoaded,
  on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);},off:(event,fn)=>listeners.get(event)?.delete(fn),
  once(event,fn){const listener=()=>{map.off(event,listener);fn();};map.on(event,listener);},
  emit:event=>[...listeners.get(event)||[]].forEach(fn=>fn()),triggerRepaint:()=>queueMicrotask(()=>map.emit('render'))
 };
 return map;
}
const map=fakeMap(),motion=createMotionRenderer(map);await motion.ready;
map.sources.set('provinces-fragments',{type:'geojson',promoteId:'adcode'});
setFeatureState(map,{source:'provinces',id:220000},{inactive:true});assert.equal(map.getFeatureState({source:'provinces-fragments',id:220000}).inactive,true);
setFeatureState(map,{source:'prefectures',id:11},{selected:true});
assert(await motion.begin());
assert.equal(map.getLayoutProperty('province-fill','visibility'),'none');
assert.equal(map.getLayoutProperty('province-fill-motion','visibility'),'visible');
assert.equal(map.getLayoutProperty('prefecture-selection-motion','visibility'),'none');
assert.deepEqual(map.getFilter('prefecture-fill-motion'),['==',['get','parentCity'],330100]);
assert.deepEqual(map.getFeatureState({source:'prefectures-motion',id:11}),{selected:true});
assert.deepEqual((await fetch(map.getSource('prefectures-motion').data).then(r=>r.json())).features.map(f=>f.properties.adcode),[11]);
map.sourceLoaded=false;motion.end();await new Promise(resolve=>setImmediate(resolve));
assert.equal(map.getLayoutProperty('province-fill','visibility'),'visible');
assert.equal(map.getPaintProperty('province-fill','fill-opacity'),1,'Do not invalidate paint bindings during refinement');
assert.equal(map.getLayoutProperty('province-fill-motion','visibility'),'none','Never stack two translucent fills');
assert.equal(frames[0].style.display,'block','Hold the rendered frame while detailed tiles load');
map.emit('render');assert.equal(frames[0].style.display,'block','Keep the held frame until precise tiles are loaded');
// A new move may start before precise tiles have finished loading.
setFeatureState(map,{source:'prefectures',id:11},{selected:false});setFeatureState(map,{source:'prefectures',id:12},{quizCorrect:true});
map.setPaintProperty('province-fill','fill-opacity',.2);
map.sourceLoaded=true;
assert(await motion.begin());assert.equal(map.getPaintProperty('province-fill-motion','fill-opacity'),.2);
assert.deepEqual((await fetch(map.getSource('prefectures-motion').data).then(r=>r.json())).features.map(f=>f.properties.adcode),[12]);
motion.end();await new Promise(resolve=>setImmediate(resolve));map.emit('render');assert.equal(map.getLayoutProperty('province-fill-motion','visibility'),'none');
assert.equal(frames[0].style.display,'none');
assert.equal(map.getPaintProperty('province-fill','fill-opacity'),.2);
assert.deepEqual(map.getPaintProperty('prefecture-fill','fill-opacity'),['case',['boolean',['feature-state','selected'],false],.3,.025],'Restore feature-state bindings after refinement');
let pickedLayers;
map.queryRenderedFeatures=(point,{layers})=>{pickedLayers=layers;return[{properties:{adcode:12},layer:{id:'prefecture-fill-motion'}}];};
assert.equal(queryRegions(map,[0,0],{layers:['prefecture-fill']})[0].layer.id,'prefecture-fill');
assert.deepEqual(pickedLayers,['prefecture-fill','prefecture-fill-motion']);
assert.equal(map.getLayoutProperty('prefecture-selection','visibility'),'none');
// Missing assets and a timed-out overlay fall back to the precise renderer.
prepared=undefined;const failed=createMotionRenderer(fakeMap());await failed.ready;assert.equal(await failed.begin(),false);
prepared={provinces:{data:blob([feature(1)]),ids:[1]}};const slow=fakeMap();slow.sourceLoaded=false;
const timeout=createMotionRenderer(slow);await timeout.ready;const loading=timeout.begin();
assert.equal(slow.getLayoutProperty('province-fill','visibility')||'visible','visible','Keep the real map visible while the preview loads');
assert.equal(slow.getPaintProperty('province-fill','fill-opacity'),1);
assert.equal(slow.getLayoutProperty('province-fill-motion','visibility'),'none','Capture the existing map before changing any layers');
await new Promise(resolve=>setImmediate(resolve));assert.equal(frames.at(-1).style.display,'block','Keep the captured map visible while the preview loads');
assert.equal(await loading,false);assert.equal(slow.getLayoutProperty('province-fill','visibility')||'visible','visible');
assert.equal(slow.getLayoutProperty('province-fill-motion','visibility'),'none');
assert.equal(frames.at(-1).style.display,'none','Release the captured map after bounded fallback finishes');
console.log('Motion renderer: seamless loading/refinement, bounded fallback, selection/quiz subsets, theme/filter/state preservation, interrupted refinement, source precision and Jilin fills passed.');
