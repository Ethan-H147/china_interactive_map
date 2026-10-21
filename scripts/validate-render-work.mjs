import assert from 'node:assert/strict';
import {createMapScene,selectionStates} from '../dist/map-scene.mjs';
import {maximumFacing,behindGlobe} from '../dist/context-visibility.mjs';
import {testMap} from './test-map.mjs';
assert(behindGlobe('europe/peru/context.bin',[105,36]));
assert(!behindGlobe('unknown.bin',[105,36]));
assert(maximumFacing([170,-10,190,10],[-180,0])>.999);
assert(maximumFacing([-180,80,180,90],[0,90])>.999);
// A culling bound must never underestimate any sampled surface point.
let seed=37;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
for(let i=0;i<800;i++){
 const west=random()*720-360,south=random()*160-80,box=[west,south,west+random()*359,Math.min(90,south+random()*80)],center=[random()*720-360,random()*180-90],maximum=maximumFacing(box,center),r=Math.PI/180;
 for(let x=0;x<=8;x++)for(let y=0;y<=8;y++){const lon=box[0]+(box[2]-box[0])*x/8,lat=(box[1]+(box[3]-box[1])*y/8)*r,c=center[1]*r,dot=Math.sin(c)*Math.sin(lat)+Math.cos(c)*Math.cos(lat)*Math.cos((lon-center[0])*r);assert(maximum+1e-12>=dot,'Conservative globe rectangle bound');}
}
const map=testMap();map.setFeatureState=()=>map;map.removeFeatureState=()=>map;
const scene=createMapScene(map),layer=id=>({id,type:'line',source:'edges',metadata:{atlas:{role:'selection',visibleStates:selectionStates}}});
map.addSource('edges',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer(layer('selected'));
assert.equal(map.getLayoutProperty('selected','visibility'),'none');
assert.equal(scene.baseLayer(map.getLayer('selected')).layout.visibility,'visible');
map.setFeatureState({source:'edges',id:0},{hover:true});assert.equal(map.getLayoutProperty('selected','visibility'),'none');
assert.equal(map.setFeatureState({source:'edges',id:0},{selected:true}),map);assert.equal(map.getLayoutProperty('selected','visibility'),'visible');
map.setFeatureState({source:'edges',id:1},{quizCorrect:true});map.setFeatureState({source:'edges',id:0},{selected:false});assert.equal(map.getLayoutProperty('selected','visibility'),'visible');
map.removeFeatureState({source:'edges',id:1},'quizCorrect');assert.equal(map.getLayoutProperty('selected','visibility'),'none');
map.setFeatureState({source:'edges',id:2},{quizTarget:true});map.setLayoutProperty('selected','visibility','none');map.setFeatureState({source:'edges',id:3},{quizWrong:true});assert.equal(map.getLayoutProperty('selected','visibility'),'none','Caller-hidden layer remains hidden');
map.setLayoutProperty('selected','visibility','visible');assert.equal(map.getLayoutProperty('selected','visibility'),'visible');map.removeFeatureState({source:'edges'});assert.equal(map.getLayoutProperty('selected','visibility'),'none');
scene.setSelectionCulling(false);assert.equal(map.getLayoutProperty('selected','visibility'),'visible');scene.setSelectionCulling(true);assert.equal(map.getLayoutProperty('selected','visibility'),'none');
map.removeLayer('selected');map.removeSource('edges');map.addSource('edges',{});map.setFeatureState({source:'edges',id:4},{selected:true});map.addLayer(layer('late-motion-copy'));assert.equal(map.getLayoutProperty('late-motion-copy','visibility'),'visible','States transferred before a motion layer installs are retained');
map.removeLayer('late-motion-copy');map.removeSource('edges');map.addSource('edges',{});map.addLayer(layer('recreated'));assert.equal(map.getLayoutProperty('recreated','visibility'),'none','Evicted source states cannot leak into a recreated source');
console.log('Conservative horizon bounds, date-line/polar coverage, selection/quiz transitions, intended visibility, motion copies and source eviction passed.');
