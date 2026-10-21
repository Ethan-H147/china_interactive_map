import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {coverage} from '../dist/context-coverage.mjs';
import {overlaps,outsideView,paddedView} from '../dist/context-visibility.mjs';
import {contextFiles,geometryBoxes} from './build-context-coverage.mjs';
import {decodeData} from '../dist/geo-pack.mjs';
assert(overlaps([170,-10,190,10],[-185,-5,-175,5]));
assert(overlaps([-175,-10,-170,10],[180,-5,195,5]));
assert(!overlaps([10,20,20,30],[100,20,110,30]));
assert(!overlaps([10,20,20,30],[-180,-30,180,-10]));
assert(overlaps([-180,-90,180,90],[125,50,135,60]));
assert(!outsideView('unknown.bin',[0,0,1,1]));
assert.deepEqual(paddedView([170,80,190,90]),[165,75,195,90]);
assert.deepEqual(Object.keys(coverage),contextFiles(),'All displayed context files have coverage');
for(const [file,row]of Object.entries(coverage)){
 const bytes=fs.readFileSync('dist/data/'+file);
 assert.equal(row.sha256,createHash('sha256').update(bytes).digest('hex'),'Rebuild coverage after changing '+file);
 assert.deepEqual(row.boxes,geometryBoxes(await decodeData(bytes)),file+' bounds cover its complete display geometry');
}
console.log('Context coverage hashes, geometry extents, unknown sources, polar margins and longitude wrapping passed.');

import {testMap} from './test-map.mjs';
import {createMapScene} from '../dist/map-scene.mjs';
const map=testMap();let camera=[[100,20],[110,40]];
map.getBounds=()=>({toArray:()=>camera});
map.addSource('canada',{serialize:()=>({data:'atlas-data://canada?file=europe%2Fcanada%2Fcontext.bin'})});
const scene=createMapScene(map);
map.addLayer({id:'canada-land',source:'canada',type:'fill',metadata:{atlas:{role:'context',contextCountry:'canada'}}});
assert.equal(map.getLayoutProperty('canada-land','visibility'),'none');
assert.equal(scene.baseLayer(map.getLayer('canada-land')).layout.visibility,'visible','Culling never overwrites intended visibility');
map.setLayoutProperty('canada-land','visibility','none');
camera=[[-140,45],[-60,80]];map.emit('move');
assert.equal(map.getLayoutProperty('canada-land','visibility'),'none','User-hidden layers stay hidden on re-entry');
map.setLayoutProperty('canada-land','visibility','visible');
assert.equal(map.getLayoutProperty('canada-land','visibility'),'visible');
scene.setSnapshot('historical',{replaceContexts:['canada']});
scene.setCulling(false);
assert.equal(map.getLayoutProperty('canada-land','visibility'),'none','Disabling culling cannot bypass a historical snapshot');
scene.setSnapshot(null);
assert.equal(map.getLayoutProperty('canada-land','visibility'),'visible');
console.log('Context culling preserves intended visibility, country re-entry and historical snapshots.');

scene.setCulling(true);map.style={_loaded:false};camera=[[100,20],[110,40]];map.emit('resize');assert.equal(map.getLayoutProperty('canada-land','visibility'),'visible','A restoring style cannot receive layout mutations');
map.style=null;map.emit('move');assert.equal(map.getLayoutProperty('canada-land','visibility'),'visible','Context loss cannot initialize another empty style');
map.style={_loaded:true};map.emit('style.load');assert.equal(map.getLayoutProperty('canada-land','visibility'),'none','Culling resumes after the restored style has loaded');
console.log('Context loss and asynchronous style restoration defer culling mutations and resynchronize after style.load.');
