import assert from 'node:assert/strict';
const point=[5.9561735,46.1320795];
export default [1280,390].map(width=>({name:'Swiss fill meets the retained French border through zoom and country switching '+width,options:{width,height:820,mobile:width===390},async run(p,base){
 await p.open(base,'#switzerland');await p.evaluate('europe.ensure("france")');await p.settle();
 for(const country of ['switzerland','morocco']){if(country==='morocco'){await p.evaluate('changeAtlas("morocco",true)');await p.settle();}
  for(const projection of ['mercator','globe'])for(const zoom of [11,13,15]){
   await p.evaluate('map.setProjection({type:'+JSON.stringify(projection)+'});void map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+',padding:{top:0,bottom:0,left:0,right:0},bearing:0,pitch:0})');await p.settle();
   const rendered=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+'),fill=p=>map.queryRenderedFeatures(p,{layers:['+JSON.stringify(country==='switzerland'?'switzerland-first-fill':'switzerland-portal-fill')+']}).length>0;return {inside:fill([q.x+3*.826,q.y-3*.563]),outside:fill([q.x-3*.826,q.y+3*.563]),border:map.queryRenderedFeatures([[q.x-2,q.y-2],[q.x+2,q.y+2]],{layers:["france-international"]}).length>0}})()');
   assert(rendered.border,'Canonical border is actually rendered: '+country+' '+projection+' '+zoom);assert(rendered.inside&&!rendered.outside,'Fill meets border within three screen pixels: '+JSON.stringify({country,projection,zoom,...rendered}));
   if(zoom===15)await p.screenshot('swiss-alignment-'+country+'-'+projection+'-'+width);
  }
 }
}}));
