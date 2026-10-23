import assert from 'node:assert/strict';
import sharp from 'sharp';
import {load,polygons,landIndex,lineIndex} from '../geo-index.mjs';

const views=[
 {name:'eastern-quebec',parent:'CA-QB',code:'418',center:[-59.3,50.95],zooms:[7.2,8.3]},
 {name:'orleans-island',parent:'CA-QB',code:'418',center:[-70.97,46.93],zooms:[10.3,11.2]},
 {name:'ontario-james-bay',parent:'CA-ON',code:'705',center:[-80.5,51.3],zooms:[8.2]},
 {name:'vancouver-coast',parent:'CA-BC',code:'604',center:[-123.1,49.24],zooms:[10.2]}
];
export default [1280,390].map(width=>({name:'Canadian phone highlights follow independent provincial coastlines '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#canada');
 const provinces=load('dist/data/europe/canada/first.bin').regions.features;
 for(const view of views){const rings=polygons(provinces.find(f=>f.properties.id===view.parent).geometry).flat(),inside=landIndex(rings),near=lineIndex(rings);
  await p.evaluate('currentAtlas().restore("CA-NPA-'+view.code+'","area-codes").then(()=>true)');
  for(const zoom of view.zooms){
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(view.center)+',zoom:'+zoom+',padding:{top:0,bottom:'+(width===390?350:0)+',left:0,right:0}})');await p.settle();
   const samples=await p.evaluate('(()=>{const canvas=map.getCanvas(),r=canvas.getBoundingClientRect(),points=[];for(let x=25;x<r.width-75;x+=9)for(let y=160;y<r.height*'+(width===390?.44:.98)+';y+=9){if(document.elementFromPoint(r.x+x,r.y+y)!==canvas)continue;const ll=map.unproject([x,y]);points.push({pixel:[r.x+x,r.y+y],ll:[ll.lng,ll.lat]});}return {points,width:innerWidth,height:innerHeight};})()');
   const file=await p.screenshot('canadian-coast-'+view.name+'-'+zoom+'-'+width),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),metresPerPixel=40075017*Math.cos(view.center[1]*Math.PI/180)/(512*2**zoom);let checked=0,missing=0,leaked=0;
   const missed=[];for(const point of samples.points){const distance=near(point.ll)/metresPerPixel;if(distance<3||distance>100)continue;const x=Math.round(point.pixel[0]*info.width/samples.width),y=Math.round(point.pixel[1]*info.height/samples.height),offset=(y*info.width+x)*4,selected=[228,187,184].every((v,i)=>Math.abs(v-data[offset+i])<7);if(inside(point.ll)){checked++;if(!selected){missing++;if(missed.length<8)missed.push({...point,rgb:[...data.slice(offset,offset+3)]});}}else if(selected)leaked++;}
   assert(checked>10,'Sample the actual coast at '+view.name+' '+zoom);assert(missing/checked<.02,JSON.stringify({view:view.name,zoom,checked,missing,missed}));assert.equal(leaked,0,'No highlight beyond provincial land at '+view.name);
  }
 }
}}));
