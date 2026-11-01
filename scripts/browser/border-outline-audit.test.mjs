import assert from 'node:assert/strict';
import {load,metres,linesOf,lineIndex} from '../geo-index.mjs';
import {fixtureImagery} from './atlas-audit-helpers.mjs';

const arcs=load('dist/data/shanxi-province-seams.json').arcs;
const landmarks=[
 ['Yuncheng–Sanmenxia',410000,[111.64,34.94],140800],
 ['Jincheng–Jiyuan',410000,[112.28,35.22],140500],
 ['Jincheng–Jiaozuo',410000,[112.65,35.24],140500],
 ['Yuncheng–Weinan',610000,[110.45,35.3],140800],
 ['Lüliang–Yulin',610000,[110.8,37.7],141100],
].map(([name,code,near,parent])=>{
 const path=arcs.find(a=>a.alignedProvince===code).canonical;
 const candidates=path.slice(1).map((b,i)=>path[i].map((v,j)=>(v+b[j])/2));
 const point=candidates.sort((a,b)=>metres(a,near)-metres(b,near))[0];
 return {name,point,parent};
});

export default [1280,390].map(width=>({
 name:'Repaired China and neighboring world outlines '+width,
 options:{width,height:960,mobile:width===390},
 async run(p,base){
  await fixtureImagery(p);await p.open(base,'#china');
  await p.evaluate('AtlasSettings.setSettings({motion:"reduce"});zoomLock.set(false)');
  for(const sample of landmarks){
   for(const zoom of [8,12,15]){
    await p.evaluate('void map.jumpTo({center:'+JSON.stringify(sample.point)+',zoom:'+zoom+'})');await p.settle();
    const result=await p.evaluate('(()=>{const p=map.project('+JSON.stringify(sample.point)+');return {hits:map.queryRenderedFeatures([[p.x-3,p.y-3],[p.x+3,p.y+3]],{layers:["province-lines"]}).length,visible:map.getLayoutProperty("province-lines","visibility"),order:mapScene.assertOrder()}})()');
    assert(result.hits>0&&result.visible!=='none',sample.name+' visible province stroke at zoom '+zoom);assert(result.order);
   }
   await p.evaluate('selectRegion(regionByCode.get('+sample.parent+'),140000,false)');
   await p.waitFor('chinaCountyScope.loaded==='+sample.parent);await p.settle();
   assert((await p.evaluate('map.querySourceFeatures("city-districts").length'))>0,sample.name+' county data');
   await p.evaluate('selectRegion(provinceLayers.get(140000),140000,false)');await p.settle();
  }
  await p.screenshot('shanxi-repaired-outlines-'+width);
  for(const [countries,pair,owner,near] of [
   [['ethiopia','kenya'],'ETH-KEN','ethiopia',[35.837708,5.332703]],
   [['jordan','syria'],'JOR-SYR','jordan',[35.755713,32.735399]],
  ]){
   const retained=load('scripts/boundary-sources/world-completion/preserved-existing-frontiers.bin').features.filter(f=>f.properties.pair===pair&&f.properties.owner===owner);
   const candidates=retained.flatMap(f=>f.geometry.coordinates.slice(1).map((b,i)=>f.geometry.coordinates[i].map((v,j)=>(v+b[j])/2)));
   const other=lineIndex(linesOf(load('dist/data/europe/'+countries.find(c=>c!==owner)+'/international.bin')));
   const point=candidates.filter(p=>other(p)>20).sort((a,b)=>metres(a,near)-metres(b,near))[0];
   assert(point,'Restored source segment has one owner '+pair);
   for(const country of countries){
    await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();
    for(const zoom of [8,11]){
     await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+'})');await p.settle();
     const layers=await p.evaluate('(()=>{const p=map.project('+JSON.stringify(point)+'),coarse=AtlasGlobeOverviewController.snapshot().borders.coarse;return [...new Set(map.queryRenderedFeatures([[p.x-3,p.y-3],[p.x+3,p.y+3]]).filter(f=>f.layer.type==="line"&&(f.layer.id.includes("international")||f.layer.id==="globe-overview-borders")&&map.getPaintProperty(f.layer.id,"line-opacity")!==0&&(f.layer.id==="globe-overview-borders"?coarse:!coarse)).map(f=>f.layer.id))]})()');
     assert(layers.includes(owner+'-international'),country+' restored source owner visible at zoom '+zoom+' '+JSON.stringify(layers));
    }
   }
  }
  await p.screenshot('world-restored-outlines-'+width);
 }
}));
