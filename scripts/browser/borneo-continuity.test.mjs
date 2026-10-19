
import assert from 'node:assert/strict';
const points=[[112.1622995,1.21422],[115.1534025,2.875632],[115.649965,4.002693]];
export default [{name:'Borneo missing border sections render from Malaysia and Indonesia through zoom',options:{width:1280,height:900},async run(p,base){
 for(const country of ['malaysia','indonesia']){await p.open(base,'#'+country);for(const zoom of [8,12,14])for(const point of points){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+',padding:{top:0,bottom:0,left:0,right:0},bearing:0,pitch:0})');await p.settle();assert(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return map.queryRenderedFeatures([[q.x-2,q.y-2],[q.x+2,q.y+2]],{layers:map.getStyle().layers.filter(l=>l.type==="line"&&l.id.startsWith('+JSON.stringify(country+'-')+')&&l.id.endsWith("first-lines")).map(l=>l.id)}).length>0})()'),'Actual unselected outline '+country+' '+zoom+' '+point);if(zoom===12&&point===points[2])await p.screenshot('borneo-continuous-'+country);}}
}}];
