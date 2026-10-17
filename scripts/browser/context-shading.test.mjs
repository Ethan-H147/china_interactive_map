import assert from 'node:assert/strict';

async function colorAtSantiago(page){
 return page.evaluate("new Promise(resolve=>{map.once('render',()=>{const canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),point=map.project([-70.65,-33.45]),scale=canvas.width/canvas.clientWidth,pixel=new Uint8Array(4);gl.readPixels(Math.floor(point.x*scale),canvas.height-1-Math.floor(point.y*scale),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);resolve([...pixel]);});map.triggerRepaint();})");
}
export default [{
 name:'Chile has the same gray before and after its detailed outline loads',
 options:{width:1100,height:760},
 async run(page,base){
  await page.send('Network.setBypassServiceWorker',{bypass:true});
  await page.send('Fetch.enable',{patterns:[{urlPattern:'*europe/chile/context.bin*'}]});
  const held=[];let holding=true;
  page.on('Fetch.requestPaused',event=>{
   if(holding)held.push(event.requestId);
   else page.send('Fetch.continueRequest',{requestId:event.requestId}).catch(error=>page.problems.push(error.message));
  });
  await page.open(base,'#brazil');
  await page.send('Page.reload');await page.settle();
  assert(held.length,'The detailed outline really is delayed across reload');
  assert.equal(await page.evaluate("!!map.getLayer('chile-portal-fill')"),false);
  await page.evaluate("map.jumpTo({center:[-71,-31],zoom:4.2});0");await page.settle();
  assert(await page.evaluate("map.queryRenderedFeatures(map.project([-70.65,-33.45]),{layers:['world-land']}).some(f=>f.properties.country==='chile')"),'The first frame uses the coarse fallback');
  const before=await colorAtSantiago(page);
  assert.deepEqual(before,[215,215,211,255],'Chile starts in the country-preview gray');
  holding=false;
  for(const requestId of held)await page.send('Fetch.continueRequest',{requestId}).catch(error=>{if(!error.message.includes('Invalid InterceptionId'))throw error;});
  await page.waitFor("europe.status('chile')==='ready'&&map.isSourceLoaded('chile-portal')",{label:'detailed Chile outline'});await page.settle();
  assert(await page.evaluate("map.queryRenderedFeatures(map.project([-70.65,-33.45]),{layers:['chile-portal-fill']}).length>0"),'Detailed Chile replaces the fallback');
  assert.deepEqual(await colorAtSantiago(page),before,'The outline handoff cannot change the visible gray');
  assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
 }
}];
