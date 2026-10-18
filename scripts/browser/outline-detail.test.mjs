import assert from 'node:assert/strict';
export default [
 {name:'Arctic and Great Lakes outlines gain detail on zoom without replacing sources',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#canada');await p.evaluate('currentAtlas().restore("CA-CD-6204")');await p.settle();
  for(const [id,center,zoom,name]of [['CA-CD-6204',[-96,76],5,'arctic'],['CA-ON',[-81.5,45.5],6,'great-lakes']]){
   if(id==='CA-ON'){await p.evaluate('currentAtlas().restore("CA-ON")');await p.settle();await p.evaluate('currentAtlas().setMode(1)');}
   const key=id==='CA-ON'?'canada-first-outlines':'canada-second-outlines';
   assert.equal(await p.evaluate('map.getSource('+JSON.stringify(key)+').serialize().tolerance'),.35);
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'})');await p.settle();
   const selectedLayer=key.replace('-outlines','-selected'),expression=await p.evaluate('map.getPaintProperty('+JSON.stringify(selectedLayer)+',"line-opacity")');assert.equal(expression[0],'interpolate');
   const identity=await p.evaluate('window.outlineBefore=map.getSource('+JSON.stringify(key)+');window.fillBefore=map.getSource('+JSON.stringify(key.replace('-outlines',''))+');true');assert(identity);
   const requests=p.requests.length;await p.screenshot('outline-detail-'+name+'-overview');
   await p.evaluate('void map.zoomTo(11,{duration:400})');await p.settle();
   assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);
   assert(await p.evaluate('outlineBefore===map.getSource('+JSON.stringify(key)+')&&fillBefore===map.getSource('+JSON.stringify(key.replace('-outlines',''))+')'),'Zoom reuses source geometry without any swapping or duplicate sources');
   assert(!p.requests.slice(requests).some(u=>u.includes('canada/')&&['first','second','third','context'].some(name=>u.includes('/'+name))&&u.endsWith('.bin')),'Zoom does not fetch another geometry bundle');
   await p.screenshot('outline-detail-'+name+'-close');
  }
 }}
];
