import assert from 'node:assert/strict';

export default [
 {name:'phone historical control lives at the top of settings and returns to the desktop header',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#china');
  assert(await page.evaluate("document.getElementById('layers-panel').firstElementChild.id==='historical-snapshot'"));
  assert(!await page.evaluate("document.getElementById('historical-snapshot').closest('.site-header')!==null"));
  await page.tap('#tab-layers');await page.settle();await page.screenshot('mobile-historical-settings');
  await page.viewport(1280,820);await page.settle();
  assert(await page.evaluate("document.getElementById('historical-snapshot').parentElement.classList.contains('site-header')"));
  await page.viewport(390,844);await page.settle();
  assert(await page.evaluate("document.getElementById('layers-panel').firstElementChild.id==='historical-snapshot'"));
 }},
 ...[[390,844,false],[320,740,false],[740,390,false],[390,844,true]].map(([width,height,globe])=>({name:'every country uses the available mobile map at '+width+'x'+height+(globe?' globe':''),options:{width,height,mobile:true},async run(page,base){
  await page.open(base,'#china');
  if(globe){await page.tap('#globe-view');await page.settle();}
  const ids=await page.evaluate("['china',...AtlasCountries.ids.filter(id=>id!=='china'&&AtlasDev.allows(id))]");
  for(const id of ids){
   await page.evaluate(`changeAtlas(${JSON.stringify(id)},false)`);await page.settle();
   const view=await page.evaluate(`(()=>{
    const selected=!!currentAtlas()?.getSelection(),padding=AtlasSheet.navigationPadding({selection:selected}),bounds=currentAtlas()?.bounds||AtlasCountries.countries[atlasMode].home.bounds||homeBounds;
    const b=maplibregl.LngLatBounds.convert(bounds).adjustAntiMeridian(),points=[];
    for(let i=0;i<=16;i++){const t=i/16,x=b.getWest()+(b.getEast()-b.getWest())*t,y=b.getSouth()+(b.getNorth()-b.getSouth())*t;points.push([x,b.getSouth()],[x,b.getNorth()],[b.getWest(),y],[b.getEast(),y]);}
    const projected=points.map(p=>map.project(p));
    return {padding,width:map.getContainer().clientWidth,height:map.getContainer().clientHeight,x0:Math.min(...projected.map(p=>p.x)),x1:Math.max(...projected.map(p=>p.x)),y0:Math.min(...projected.map(p=>p.y)),y1:Math.max(...projected.map(p=>p.y)),sheet:document.documentElement.dataset.sheet,selected};
   })()`);
   assert.equal(view.sheet,view.selected?'half':'peek',id+' home uses the appropriate panel height');
   assert(view.x0>=view.padding.left-3&&view.x1<=view.width-view.padding.right+3,id+' fits horizontally: '+JSON.stringify(view));
   assert(view.y0>=view.padding.top-3&&view.y1<=view.height-view.padding.bottom+3,id+' clears the header and panel: '+JSON.stringify(view));
   const expected=(view.padding.top+view.height-view.padding.bottom)/2,actual=(view.y0+view.y1)/2;
   assert(Math.abs(expected-actual)<(globe?Math.max(6,(view.height-view.padding.top-view.padding.bottom)*.04):6),id+' is centered in the available map: '+JSON.stringify(view));
   console.log('Verified mobile frame:',id,width+'x'+height);
   if(['china','russia','chile','united-states','france','korea'].includes(id))await page.screenshot('mobile-home-'+id+'-'+width+'x'+height);
  }
 }}))
];
