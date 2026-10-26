function inRing(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [x,y]=ring[i],[a,b]=ring[j];
  if((y>point[1])!==(b>point[1])&&point[0]<(a-x)*(point[1]-y)/(b-y)+x)inside=!inside;
 }
 return inside;
}
function contains(geometry,point){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
 return polygons.some(rings=>inRing(point,rings[0])&&!rings.slice(1).some(ring=>inRing(point,ring)));
}
export function labelFitsBoundary(map,item,point,width,height){
 if(item.bounds){
  const [[west,south],[east,north]]=item.bounds;
  const corners=[[west,south],[west,north],[east,south],[east,north]].map(p=>map.project(p));
  if(Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x))<width+16||Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y))<height+10)return false;
 }
 const layer=item.labelBoundaryLayer;if(!layer||!map.getLayer(layer))return false;
 const left=point.x-width/2-8,right=point.x+width/2+8,top=point.y-height/2-5,bottom=point.y+height/2+5;
 const features=map.queryRenderedFeatures([[left,top],[right,bottom]],{layers:[layer]});
 if(!features.length||features.some(f=>String(f.properties?.id)!==String(item.id)))return false;
 // Check the padded label against rendered polygon parts, including holes and coastlines.
 for(const x of [left,point.x,right])for(const y of [top,point.y,bottom]){
  const p=map.unproject([x,y]);
  if(!features.some(f=>contains(f.geometry,[p.lng,p.lat])))return false;
 }
 return true;
}
