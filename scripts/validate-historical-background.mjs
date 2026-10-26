import assert from 'node:assert/strict';
import {createMapScene} from '../dist/map-scene.mjs';
import {testMap} from './test-map.mjs';
for(const overviewFirst of [false,true]){
 const map=testMap(),scene=createMapScene(map);map.addSource('data',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
 for(const id of ['modern','history'])map.addLayer({id:id+'-portal-fill',type:'fill',source:'data',metadata:{atlas:{role:'context',contextCountry:id}},paint:{'fill-color':id==='history'?'#eadfd0':'#d7d7d3'}});
 map.addLayer({id:'history-international',type:'line',source:'data',metadata:{atlasInternationalBorder:true},paint:{'line-color':'#9b4237'}});
 if(overviewFirst)scene.setOverview(true);scene.setSnapshot('history',{replaceContexts:['modern']});scene.setOverview(true);
 assert.equal(map.getLayoutProperty('history-portal-fill','visibility'),'visible','Historical land remains above the modern overview');
 assert.equal(map.getLayoutProperty('history-international','visibility'),'visible','Historical frontiers remain visible when zoomed out');
 assert.equal(map.getLayoutProperty('modern-portal-fill','visibility'),'none');
 scene.setOverview(false);assert.equal(map.getLayoutProperty('history-portal-fill','visibility'),'visible');
 scene.setOverview(true);scene.setSnapshot(null);assert.equal(map.getLayoutProperty('history-portal-fill','visibility'),'none','Modern overview resumes after leaving history');
 scene.setOverview(false);assert.equal(map.getLayoutProperty('modern-portal-fill','visibility'),'visible');scene.assertOrder();
}
console.log('Historical land and borders remain visible across overview transitions, both arrival orders and modern return.');
