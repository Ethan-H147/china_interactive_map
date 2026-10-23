import assert from 'node:assert/strict';
import sharp from 'sharp';
import {load,polygons,landIndex,lineIndex} from '../geo-index.mjs';
const cases=[{country:'canada',parent:'CA-QB',codes:['367','418','581'],center:[-62.9,50.4],zooms:[7.2,9.2],color:[228,187,184]},{country:'united-states',parent:'US-DC',codes:['202','771'],center:[-77.04,38.9],zooms:[10,11],color:[188,205,231]}];
export default [1280,390].map(width=>({name:'Overlapping Canadian and US codes keep a smooth complete selected fill '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 for(const c of cases){const root='dist/data/europe/'+c.country+'/',cat=load(root+'area-codes/catalogue.bin'),shape=load(root+cat.chunks[c.parent].file).regions.features.find(f=>f.properties.id.endsWith(c.codes[0])),rings=polygons(shape.geometry).flat(),inside=landIndex(rings),near=lineIndex(rings);
  await p.open(base,'#'+c.country);
  for(const code of c.codes){const id=(c.country==='canada'?'CA':'US')+'-NPA-'+code;await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+',"area-codes").then(()=>true)');
   for(const zoom of c.zooms){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(c.center)+',zoom:'+zoom+',padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();
    const sample=await p.evaluate('(()=>{const canvas=map.getCanvas(),r=canvas.getBoundingClientRect(),points=[];for(let x=15;x<r.width-65;x+=17)for(let y=100;y<r.height*'+(width===390?.45:.9)+';y+=17){if(document.elementFromPoint(r.x+x,r.y+y)!==canvas)continue;const ll=map.unproject([x,y]);points.push({pixel:[r.x+x,r.y+y],ll:[ll.lng,ll.lat]});}return {points,screenWidth:innerWidth,screenHeight:innerHeight};})()');
    const file=await p.screenshot('smooth-area-fill-'+c.country+'-'+code+'-'+zoom+'-'+width),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let tested=0,matched=0,outside=0,leaked=0;
    const metresPerPixel=40075017*Math.cos(c.center[1]*Math.PI/180)/(512*2**zoom);
    for(const point of sample.points){if(near(point.ll)<metresPerPixel*5)continue;const x=Math.round(point.pixel[0]*info.width/sample.screenWidth),y=Math.round(point.pixel[1]*info.height/sample.screenHeight),offset=(y*info.width+x)*4,selected=c.color.every((v,i)=>Math.abs(v-data[offset+i])<6);if(inside(point.ll)){tested++;if(selected)matched++;}else{outside++;if(selected)leaked++;}}
    assert(tested>15,'Enough independent interior pixels for '+id+' '+zoom);assert(matched/tested>.97,JSON.stringify({id,zoom,tested,matched}));assert.equal(leaked,0,JSON.stringify({id,zoom,outside,leaked}));
   }
  }
  await p.evaluate('currentAtlas().home().then(()=>true)');await p.settle();assert.equal(await p.evaluate('!!map.getLayer('+JSON.stringify(c.country+'-area-codes-selection-fill')+')'),false,'Returning home removes the lazy selected-fill layer');
 }
}}));
