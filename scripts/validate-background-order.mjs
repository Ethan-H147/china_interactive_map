import assert from 'node:assert/strict';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {createMapScene,provinceOpacity} from '../dist/map-scene.mjs';
import {testMap} from './test-map.mjs';
function* permutations(values){if(!values.length){yield [];return;}for(let i=0;i<values.length;i++)for(const rest of permutations(values.filter((_,j)=>i!==j)))yield [values[i],...rest];}
const definitions=[
 {id:'opaque-land-from-an-unknown-country',type:'fill',metadata:{atlas:{role:'land'}},paint:{'fill-color':'#ddd'}},
 {id:'imagery',type:'raster',source:'raster'},
 {id:'unknown-country-outline',type:'fill',metadata:{atlas:{role:'context'}},paint:{'fill-color':'#ddd'}},
 {id:'unknown-country-regions',type:'fill',paint:{'fill-color':'#abc'}},
 {id:'unknown-country-borders',type:'line',paint:{'line-color':'#987343'}},
 {id:'unknown-country-capitals',type:'circle'}
];
let cases=0;
for(const order of permutations(definitions)){
 const map=testMap(),scene=createMapScene(map);scene.setSatellite(true,1);
 for(const def of order){map.addLayer({...def,source:def.source||'data'});scene.assertOrder();}
 for(const def of order){map.moveLayer(def.id);scene.assertOrder();}
 assert.equal(map.getPaintProperty('unknown-country-outline','fill-opacity'),0);
 assert.equal(map.getPaintProperty('unknown-country-regions','fill-opacity')[1][2],0);
 assert.equal(map.getPaintProperty('unknown-country-borders','line-color'),'#fff0bb');
 scene.setSatellite(false);
 assert.equal(map.getPaintProperty('unknown-country-regions','fill-opacity'),1);
 assert.equal(map.getPaintProperty('unknown-country-borders','line-color'),'#987343');
 cases++;
}
const map=testMap(),scene=createMapScene(map);
map.addSource('data',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
map.addSource('raster',{type:'raster',tiles:['https://example.org/{z}/{x}/{y}.png']});
const zoomOpacity=['interpolate',['linear'],['zoom'],2,.05,8,.6];
for(const layer of [
 {id:'zoom-fill',type:'fill',paint:{'fill-opacity':zoomOpacity}},
 {id:'zoom-line',type:'line',paint:{'line-color':['interpolate',['linear'],['zoom'],2,'#abc',8,'#def']}},
 {id:'invisible-hit-target',type:'fill',paint:{'fill-opacity':0}},
 {id:'province',type:'fill',metadata:{atlas:{satellite:{fill:'province'}}},paint:{'fill-opacity':provinceOpacity(false)}}
])map.addLayer({...layer,source:'data'});
for(const opacity of [0,.4,1]){
 scene.setSatellite(true,opacity);
 assert.deepEqual(validateStyleMin(map.getStyle()).map(e=>e.message),[],'Zoom and feature-state paint remains valid');
 assert.equal(map.getPaintProperty('invisible-hit-target','fill-opacity'),0);
}
assert.throws(()=>map.addLayer({id:'zoom-fill',type:'fill',source:'data'}),/already exists/);
scene.setSatellite(true,.4);
map.setPaintProperty('zoom-fill','fill-opacity',.75);
assert.equal(scene.basePaint('zoom-fill','fill-opacity'),.75);
const motion=scene.baseLayer(map.getStyle().layers.find(l=>l.id==='zoom-fill'));
map.addLayer({...motion,id:'motion-copy'});
assert.deepEqual(map.getPaintProperty('motion-copy','fill-opacity'),map.getPaintProperty('zoom-fill','fill-opacity'),'Motion copies transform normal paint exactly once');
map.removeLayer('zoom-fill');map.addLayer({id:'zoom-fill',type:'fill',source:'data',paint:{'fill-opacity':.2}});
scene.setSatellite(false);assert.equal(map.getPaintProperty('zoom-fill','fill-opacity'),.2,'Recreated IDs retain their new normal paint');
assert.equal(scene.basePaint('unknown','fill-opacity'),undefined);
console.log('Unified scene: '+cases+' arrival orders, late additions, moves, imagery restoration, zoom expressions, hit targets, paint updates, motion copies and recreated IDs passed.');
