import assert from 'node:assert/strict';
import {load,linesOf} from '../geo-index.mjs';
const lakes=[{name:'leman',center:[6.54,46.4],points:[[6.5,46.45],[6.7,46.45]]},{name:'constance',center:[9.2,47.65],points:[[9.3,47.62],[9,47.68]]}];
async function lake(p,l,zoom){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(l.center)+',zoom:'+zoom+',padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();for(const pt of l.points){const hits=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(pt)+');if(q.x<0||q.y<0||q.x>map.getContainer().clientWidth||q.y>map.getContainer().clientHeight)return [];const layers=map.getStyle().layers.filter(l=>l.type==="fill"&&map.getLayoutProperty(l.id,"visibility")!=="none"&&l.metadata?.atlas?.role!=="water").map(l=>l.id);return map.queryRenderedFeatures(q,{layers}).map(f=>f.layer.id)})()');assert.deepEqual(hits,[],'Permanent lake surface has no land fill: '+pt);}}
export default [1280,390].flatMap(width=>[
 {name:'Shared alpine lakes remain water without shore outlines '+width,options:{width,height:960,mobile:width===390},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');"});
  for(const country of ['switzerland','france','germany','finland']){await p.open(base,'#'+country);for(const l of lakes)await lake(p,l,8.3);await p.screenshot('alpine-lakes-'+country+'-'+width);}
  await p.open(base,'#switzerland');await p.evaluate('currentAtlas().restore("CH-K-22")');await p.settle();await lake(p,lakes[0],8.5);
  // A selected canton must not introduce a perimeter around the lake hole.
  const data=load('dist/data/europe/switzerland/first.bin'),edges=data.selectionOutlines.features.filter(f=>f.properties.id==='CH-K-22');assert(edges.length>0);assert.equal(await p.evaluate('currentAtlas().getSelection()'),'CH-K-22');
  await p.screenshot('alpine-lakes-selected-vaud-'+width);
  for(const l of lakes)await lake(p,l,4.6);assert.equal(await p.evaluate('AtlasGlobeOverviewController.snapshot().ready'),true);await p.screenshot('alpine-lakes-overview-'+width);
 }},
 {name:'Swiss German border includes Busingen and every visible surveyed segment '+width,options:{width,height:960,mobile:width===390},async run(p,base){
  const features=load('dist/data/europe/germany/international.bin').features.filter(f=>f.properties.pair==='CHE-DEU'),points=linesOf({features}).flatMap(path=>path.filter((_,i)=>i%3===0));
  for(const country of ['switzerland','germany','finland']){await p.open(base,'#'+country);await p.evaluate('europe.ensure("germany")');await p.settle();for(const center of [[8.69,47.7],[8.6,47.64],[8.42,47.68]]){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:11.5,padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();const counts=await p.evaluate('(()=>{let tested=0,missing=0;for(const point of '+JSON.stringify(points)+'){const q=map.project(point);if(q.x<10||q.y<60||q.x>map.getContainer().clientWidth-10||q.y>map.getContainer().clientHeight*.45)continue;tested++;if(!map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers:["germany-international"]}).some(f=>f.properties.pair==="CHE-DEU"))missing++;}return {tested,missing}})()');assert(counts.tested>2,'Several survey segments are visible');assert.equal(counts.missing,0,JSON.stringify({country,center,...counts}));}await p.screenshot('alpine-border-'+country+'-'+width);}
 }}
]);
