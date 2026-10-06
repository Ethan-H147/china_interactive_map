// Mahakam Delta islands are too dense to read at province/regency scale.
// Split whole land components; never alter mainland or administrative edges.
export const coastalDetailZoom=12;
export const coastalDetailBounds=[[117.2,-1],[117.75,-.2]];
export const coastalDetailIds=new Set(['ID64','ID6403']);
export const coastalPartId=id=>id+'~mahakam';
const inside=([x,y])=>x>=coastalDetailBounds[0][0]&&x<=coastalDetailBounds[1][0]&&y>=coastalDetailBounds[0][1]&&y<=coastalDetailBounds[1][1];
export function splitCoastalDetail(collection,{context=false}={}){
 return {...collection,features:collection.features.flatMap(feature=>{
  const p=feature.properties;if(!coastalDetailIds.has(p.id))return [feature];
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  const main=[],detail=[];for(const polygon of polygons)(polygon[0].every(inside)?detail:main).push(polygon);
  if(!detail.length)return [feature];
  const geometry=coordinates=>({type:'MultiPolygon',coordinates});
  const result=main.length?[{...feature,geometry:geometry(main)}]:[];
  if(!context)result.push({...feature,properties:{...p,id:coastalPartId(p.id),regionId:p.id,coastalDetail:true},geometry:geometry(detail)});
  return result;
 })};
}
