import assert from 'node:assert/strict';
import {createMapScene} from '../dist/map-scene.mjs';
import {createQuizMapSession} from '../dist/map-quiz.mjs';
import {testMap} from './test-map.mjs';

const map=testMap(),order=[];let reads=0,paused=0;
map.style={_order:order};
const add=map.addLayer;map.addLayer=(l,before)=>{add(l,before);const index=order.indexOf(before);order.splice(index<0?order.length:index,0,l.id);};
createMapScene(map,{version:'6.11.2'});
for(const [id,type]of [['fixture-fill','fill'],['fixture-lines','line'],['fixture-dots','circle'],['other-lines','line']])map.addLayer({id,type,source:id.startsWith('fixture-')?'fixture-first':'other-first'});
map.getStyle=()=>{reads++;throw Error('Unnecessary full source serialization');};
const previousDocument=globalThis.document,shell={dataset:{}};
globalThis.document={getElementById:()=>shell};
try{
 const native={fillLayers:()=>['fixture-fill'],lineLayers:()=>['fixture-lines'],capture:()=>({}),begin:async()=>{}};
 const session=createQuizMapSession(map,{quizMap:native,pauseLabels:()=>paused++},'fixture');
 for(let i=0;i<4;i++){
  session.setActive(true);
  assert.equal(map.getLayoutProperty('fixture-fill','visibility'),'visible');
  assert.equal(map.getLayoutProperty('fixture-lines','visibility'),'visible');
  assert.equal(map.getLayoutProperty('fixture-dots','visibility'),'none');
  assert.equal(map.getLayoutProperty('other-lines','visibility'),'visible');
  session.setActive(false);
  assert.equal(map.getLayoutProperty('fixture-dots','visibility'),'visible');
 }
 assert.equal(reads,0);assert.equal(paused,4);
}finally{globalThis.document=previousDocument;}
console.log('Repeated quiz enforcement inspects layer metadata without serializing geometry and restores intended visibility.');
