import assert from 'node:assert/strict';
import {beginPixels,endPixels} from './russia-render-helpers.mjs';
export default [{name:'shared historical cell edges leave no white slivers in the Tsardom interior',options:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true')"});await p.open(base,'#russia/history=1648');await p.evaluate('AtlasComfort.set({appearance:"light"})');await p.settle();
 const before=await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()');
 // These exact pixels were pale gaps before shared arc simplification. Test
 // their centers strictly; a neighborhood majority can conceal narrow seams.
 const probes=[[53.23944260345232,53.681463133927764],[59.23600157242572,60.12543006205823],[39.31243595551834,55.88383266806741],[41.70386047163754,57.71643090355815],[37.39866068899434,57.163408988777576],[36.693243383306736,57.52763422784511],[44.4753620371624,61.825079323837855],[43.29725189699445,61.58707870219655]].map(([lng,lat])=>({lng,lat,color:[117,153,198],strict:true}));
 for(const projection of ['globe','mercator'])for(const year of [1648,1689,1914]){
  await p.evaluate(`void currentAtlas().setHistoryYear(${year})`);await p.settle();await p.evaluate(`map.setProjection({type:'${projection}'});void map.jumpTo({center:${projection==='globe'?'[85,60]':'[60,59]'},zoom:2.9,bearing:0,padding:{top:0,bottom:0,left:0,right:0}})`);await p.settle();
  await beginPixels(p,probes);await p.evaluate('map.triggerRepaint()');await p.settle();const result=await endPixels(p);assert(result.points>=5);assert.equal(result.bad,0,projection+' '+year+' '+JSON.stringify(result));
  await p.screenshot('russia-shared-edges-'+projection+'-'+year);
 }
 assert.deepEqual(await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()'),before);
}}];
