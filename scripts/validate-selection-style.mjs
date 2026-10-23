import assert from 'node:assert/strict';
import {createMapScene} from '../dist/map-scene.mjs';
import {regionalLineWidth} from '../dist/adaptive-lines.mjs';
import {testMap} from './test-map.mjs';
const map=testMap(),scene=createMapScene(map),profile=regionalLineWidth(1,true);
for(const [id,width,satellite]of [['legacy-state',2,undefined],['local-municipality',1.8,undefined],['quiz',1.7,undefined],['special',3,false]]){
 const original={id,type:'line',source:'edges',metadata:{atlas:{role:'selection',satellite}},paint:{'line-width':width,'line-color':'#123456','line-opacity':.7}};
 map.addLayer(original);assert.deepEqual(map.getPaintProperty(id,'line-width'),profile);assert.equal(original.paint['line-width'],width,'Caller definitions stay immutable');
 map.setPaintProperty(id,'line-width',9);assert.deepEqual(scene.basePaint(id,'line-width'),profile,'Later country updates cannot diverge');
 map.setPaintProperty(id,'line-width',null);assert.deepEqual(map.getPaintProperty(id,'line-width'),profile,'Clearing paint cannot bypass the shared rule');
 assert.equal(map.getPaintProperty(id,'line-color'),'#123456');assert.equal(map.getPaintProperty(id,'line-opacity'),.7);
}
map.addLayer({...scene.baseLayer(map.getLayer('legacy-state')),id:'legacy-state-motion'});assert.deepEqual(map.getPaintProperty('legacy-state-motion','line-width'),profile,'Motion copies keep the same stroke');
scene.setSatellite(true,.6);for(const layer of map.getStyle().layers)assert.deepEqual(map.getPaintProperty(layer.id,'line-width'),profile,'Satellite mode keeps shared widths');
scene.setSatellite(false);map.addLayer({id:'ordinary-border',type:'line',paint:{'line-width':.45}});assert.equal(map.getPaintProperty('ordinary-border','line-width'),.45,'Other border roles keep their own hierarchy');
map.removeLayer('legacy-state');map.addLayer({id:'legacy-state',type:'line',metadata:{atlas:{role:'selection'}},paint:{'line-width':2}});assert.deepEqual(map.getPaintProperty('legacy-state','line-width'),profile,'Country re-entry uses the shared profile');
console.log('Shared selection strokes: legacy adapters, municipalities, quiz highlights, updates, motion copies, satellite, country re-entry and ordinary-border hierarchy passed.');
