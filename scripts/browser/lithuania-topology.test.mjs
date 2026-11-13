import assert from 'node:assert/strict';
export default [{name:'Lithuanian city outlines remain continuous across zooms and the county slit is filled',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#lithuania');
 await p.evaluate('AtlasComfort.set({appearance:"light"})');
 await p.evaluate('currentAtlas().restore("LT-C-6")');
 for(const projection of ['mercator','globe']){
 await p.evaluate('void map.setProjection({type:'+JSON.stringify(projection)+'})');
 for(const zoom of [9,10.5,12]){
  await p.evaluate('void map.jumpTo({center:[23.329,55.917],zoom:'+zoom+'})');await p.settle();
  const points=await p.evaluate('(()=>{const src=map.getSource("lithuania-second");return !!src})()');assert(points);
  const coverage=await p.evaluate('(async()=>{const data=await(await fetch("data/europe/lithuania/second/LT-C-6.bin")).arrayBuffer();const {decodeData}=await import("./geo-pack.mjs");const d=await decodeData(data);const f=d.regions.features.find(f=>f.properties.id==="LT-M-29"),polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates,canvas=map.getCanvas();let visible=0,missing=0;for(const poly of polys)for(const ring of poly)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],q=map.project([(a[0]+b[0])/2,(a[1]+b[1])/2]);if(q.x<15||q.y<70||q.x>canvas.clientWidth-70||q.y>canvas.clientHeight-15)continue;visible++;const hits=map.queryRenderedFeatures([[q.x-2,q.y-2],[q.x+2,q.y+2]],{layers:["lithuania-second-lines"]});if(!hits.length)missing++;}return {visible,missing}})()');
  assert(coverage.visible>5);assert.equal(coverage.missing,0,'Rendered city border at zoom '+zoom);
 }
 await p.screenshot('lithuania-siauliai-continuous-outline-'+projection);
 }
 await p.evaluate('currentAtlas().restore("LT-C-7")');
 await p.evaluate('void map.jumpTo({center:[22.747,55.067],zoom:13})');await p.settle();
 const hit=await p.evaluate('currentAtlas().hoverAt(map.project([22.75268,55.064568]))');assert(hit&&['LT-M-94','LT-C-7'].includes(hit.id),'Former slit has an owner');
 await p.screenshot('lithuania-jurbarkas-filled-slit');
}}];
