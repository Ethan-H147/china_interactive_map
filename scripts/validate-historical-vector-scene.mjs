import assert from 'node:assert/strict';
import {testMap} from './test-map.mjs';
import {createMapScene} from '../dist/map-scene.mjs';
const map=testMap(),scene=createMapScene(map);
for(const [id,type,atlas]of [
 ['uk-land','fill',{role:'context',contextCountry:'united-kingdom'}],
 ['us-land','fill',{role:'context',contextCountry:'united-states'}],
 ['france-border','line',{role:'border',contextCountry:'france'}],
 ['french-lake','fill',{role:'water',contextCountry:'france'}],
 ['user-hidden-border','line',{role:'border'}]
])map.addLayer({id,type,metadata:{atlas},layout:{visibility:id==='user-hidden-border'?'none':'visible'}});
scene.setSnapshot('united-kingdom',{replaceContexts:['united-kingdom','united-states'],keepWater:true,preserveContextFeatures:true});
for(const id of ['uk-land','us-land'])assert.equal(map.getLayoutProperty(id,'visibility'),'none');
for(const id of ['france-border','french-lake'])assert.equal(map.getLayoutProperty(id,'visibility'),'visible');
map.addLayer({id:'late-world-border',type:'line',metadata:{atlas:{role:'border'}}});assert.equal(map.getLayoutProperty('late-world-border','visibility'),'visible');
scene.setSnapshot('russia',{replaceContexts:['russia']});
for(const id of ['france-border','french-lake','late-world-border'])assert.equal(map.getLayoutProperty(id,'visibility'),'none','Existing Russia snapshot policy stays intact');
scene.setSnapshot(null);for(const id of ['uk-land','us-land','france-border','french-lake','late-world-border'])assert.equal(map.getLayoutProperty(id,'visibility'),'visible');
assert.equal(map.getLayoutProperty('user-hidden-border','visibility'),'none');scene.assertOrder();
console.log('Historical scenes replace owned contexts, retain unrelated borders/water, preserve Russia policy and restore modern visibility.');
