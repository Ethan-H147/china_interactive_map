import assert from 'node:assert/strict';
import {readData} from '../read-data.mjs';
import {polygons} from '../geo-index.mjs';
import {searchAndSelect} from './countries.test.mjs';
const regions=readData('display-boundaries.json').subdivisions.features;
const cases=[['Penghu','Penghu County','TW-10016',[119.58,23.58],11.8],['Kinmen','Kinmen County','TW-09020',[118.24,24.43],12.5],['Lienchiang','Lienchiang County','TW-09007',[119.94,26.17],12]];
async function outlines(page,points,layers){
 return page.evaluate('(()=>{let tested=0,ink=0;for(const point of '+JSON.stringify(points)+'){const p=map.project(point),size=map.getContainer();if(p.x<20||p.y<20||p.x>size.clientWidth-20||p.y>size.clientHeight-20)continue;tested++;if(map.queryRenderedFeatures([[p.x-1,p.y-1],[p.x+1,p.y+1]],{layers:'+JSON.stringify(layers)+'}).some(f=>!f.layer.id.endsWith("-selection")||map.getFeatureState({source:f.source,id:f.id}).selected===true))ink++;}return {tested,ink}})()');
}
export default cases.map(([query,name,code,center,zoom])=>({name:name+' coasts show only when selected',options:{width:1280,height:820},async run(page,base){
 const region=regions.find(f=>f.properties.adcode===code),all=polygons(region.geometry).flat().flat(),step=Math.max(1,Math.floor(all.length/350)),points=all.filter((_,i)=>i%step===0);
 await page.open(base,'#china');await page.tap('#mode-prefecture');
 const frame=async()=>{await page.settle();await page.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'})');await page.settle();};
 await frame();
 const normal=['province-lines','prefecture-lines','other-lines','atlas-frontiers'];
 let result=await outlines(page,points,normal);assert(result.tested>10,'Exercise visible island coasts');assert.equal(result.ink,0,'Unselected coast has no brown or gray stroke');
 await page.screenshot('taiwan-'+query.toLowerCase()+'-unselected');
 await searchAndSelect(page,query,name);await frame();
 assert.equal(await page.evaluate('selected?.layer.feature.properties.adcode'),code);
 result=await outlines(page,points,['prefecture-selection']);assert(result.ink>10,'The selected county has a complete coastal outline');
 await page.screenshot('taiwan-'+query.toLowerCase()+'-selected');
 await page.tap('#home');await frame();
 result=await outlines(page,points,normal);assert.equal(result.ink,0,'Clearing selection restores an unstroked coast');
 assert.equal((await outlines(page,points,['prefecture-selection','province-selection'])).ink,0,'No selected coastline remains');
}}));
