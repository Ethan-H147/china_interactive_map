import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
const places=[['ecuador',[-78.5,-.2]],['colombia',[-74.1,4.7]],['venezuela',[-66.9,10.5]]];
export default [1280,390].map(width=>({name:'obsolete gray neighbour fills stay removed through country changes and zooms '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 assert.equal(load('dist/data/europe/peru/neighbours.bin').features.length,0,'Peru no longer ships the superseded gray country shapes');
 await p.open(base,'#ecuador');await p.waitFor('!!map.getSource("peru-neighbours")');
 // Simulate a stale neighbour dataset, as could happen when another country
 // adds a portal before an older neighbour cache has been rebuilt.
 const stale={type:'FeatureCollection',features:places.map(([country,[x,y]])=>({type:'Feature',properties:{country},geometry:{type:'Polygon',coordinates:[[[x-.3,y-.3],[x+.3,y-.3],[x+.3,y+.3],[x-.3,y+.3],[x-.3,y-.3]]]}}))};
 await p.evaluate('map.getSource("peru-neighbours").setData('+JSON.stringify(stale)+')');
 for(const[country,point]of places){if(country!=='ecuador'){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}assert.equal(await p.evaluate('AtlasEntry.current'),country);
  for(const zoom of [4.5,6,8]){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+'})');await p.settle();assert.equal(await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(point)+'),{layers:["peru-neighbours"]}).filter(f=>f.properties.country==='+JSON.stringify(country)+').length'),0,'No stale gray fill while '+country+' is selected at zoom '+zoom);}
  assert(await p.evaluate('mapScene.assertOrder()'));await p.screenshot('gray-fill-fixed-'+country+'-'+width);
 }
}}));
