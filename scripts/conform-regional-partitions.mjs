import assert from 'node:assert/strict';
import polygonClipping from 'polygon-clipping';
import {polygons,lineIndex,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
export async function conformPartitions(children,parent,attempt=0){
 const mask=await command(fc([parent]),'-clean snap-interval=0 gap-fill-area=0');
 const clipped=await command({'children.json':children,'parent.json':mask},'-clip parent.json no-snap -clean snap-interval=0 gap-fill-area=0');
 const gaps=await command({'parent.json':mask,'children.json':clipped},'-erase children.json no-snap -explode -clean snap-interval=0 gap-fill-area=0');
 const edges=clipped.features.map(f=>lineIndex(polygons(f.geometry).flat())),pieces=[...clipped.features];
 for(const gap of gaps.features){if(!gap.geometry||geographicAreaKm2(gap.geometry)<1e-8)continue;
  const lengths=edges.map(()=>0);for(const ring of polygons(gap.geometry).flat())for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];edges.forEach((edge,j)=>{if(edge(mid)<.5)lengths[j]+=metres(a,b);});
  }
  let owner=lengths.indexOf(Math.max(...lengths));if(!lengths[owner]){const distances=edges.map(e=>e(polygons(gap.geometry)[0][0][0]));owner=distances.indexOf(Math.min(...distances));}
  pieces.push({...gap,properties:{...clipped.features[owner].properties}});
 }
 const merged=await command(fc(pieces),'-dissolve2 id,parent -clean snap-interval=0 gap-fill-area=0');
 const result=await command({'children.json':merged,'parent.json':mask},'-clip parent.json no-snap');
 const lattice=x=>typeof x==='number'?Math.round(x*1e6):x.map(lattice),degrees=x=>typeof x==='number'?x/1e6:x.map(degrees);
 const coverage=polygonClipping.union(...result.features.map(f=>lattice(polygons(f.geometry)))),missing=degrees(polygonClipping.difference(lattice(polygons(parent.geometry)),coverage));
 const gapArea=missing.reduce((sum,coordinates)=>sum+geographicAreaKm2({type:'Polygon',coordinates}),0);
 // Repair coastal slivers exposed by six-decimal clipping, then verify convergence.
 if(gapArea>.01&&attempt<2)return conformPartitions(result,parent,attempt+1);
 assert(gapArea<.02,'Child partition covers parent '+parent.properties.id);
 return result;
}
