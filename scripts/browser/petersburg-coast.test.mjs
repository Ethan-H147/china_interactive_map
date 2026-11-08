import assert from'node:assert/strict';
export default [false,true].map(mobile=>({name:'Saint Petersburg coastal district lines '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.open(base,'#russia');await p.settle();await p.evaluate('currentAtlas().restore("RU-OSM-1114252").then(()=>true)');await p.settle();
 for(const projection of['mercator','globe'])for(const zoom of[6.8,11,13]){
  await p.evaluate('map.setProjection({type:'+JSON.stringify(projection)+'});void map.jumpTo({center:[30.225,59.961],zoom:'+zoom+',padding:{top:0,bottom:0,left:0,right:0},bearing:0,pitch:0})');await p.settle();
  const data=await p.evaluate('(async()=>{const s=map.getSource("russia-second-edges").serialize().data;const d=typeof s==="string"?await(await fetch(s)).json():s;return {features:d.features.length,channels:d.features.some(f=>f.properties.channel),lines:map.queryRenderedFeatures(undefined,{layers:["russia-second-lines"]}).length};})()');assert(!data.channels);assert(data.features>0&&data.lines>0);
  if(zoom===13)await p.screenshot('petersburg-coast-'+projection+'-'+(mobile?'phone':'desktop'));
 }
}}));
