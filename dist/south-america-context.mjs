// Separate the overlapping IGN island context so the active UK territory has one backdrop.
export function splitSouthAmericaContext(context){
 const islands=polygon=>polygon[0].every(([lon,lat])=>lon>=-61.6&&lon<=-57.5&&lat>=-53.1&&lat<=-50.9);
 return {...context,features:context.features.flatMap(feature=>{
  if(feature.properties.country!=='argentina')return[feature];
  const parts=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  const shared=parts.filter(islands),mainland=parts.filter(part=>!islands(part));if(!shared.length)return[feature];
  return[{...feature,geometry:{type:'MultiPolygon',coordinates:mainland}},{...feature,properties:{...feature.properties,contextHiddenFor:'united-kingdom'},geometry:{type:'MultiPolygon',coordinates:shared}}];
 })};
}