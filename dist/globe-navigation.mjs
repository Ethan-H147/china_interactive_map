// A globe camera can cross a pole even though its Mercator source tiles cannot.
export const mercatorLatitudeLimit=85.051129,globeLatitudeLimit=89.999999;
export const freeGlobePan=()=>!!globalThis.AtlasCountries?.countries[globalThis.AtlasEntry?.current]?.freeGlobePan;
export function latitudeScale(latitude,free=freeGlobePan()){
 // Keep the zoom convention finite at the pole without restricting orientation.
 const lat=free?Math.max(-mercatorLatitudeLimit,Math.min(mercatorLatitudeLimit,latitude)):latitude;
 return Math.cos(lat*Math.PI/180);
}
// Shared links round zoom to four decimals; include the rounded-out floor.
export const minimumGlobeViewZoom=Math.floor((.5+Math.log2(latitudeScale(90,true)))*1e4)/1e4;
export function constrainCamera(center,zoom,{free=false,minZoom=.5,maxZoom=16}={}){
 const limit=free?globeLatitudeLimit:mercatorLatitudeLimit,lat=Math.max(-limit,Math.min(limit,center.lat));
 return {center:{lng:center.lng,lat},zoom:Math.max(free ? .5+Math.log2(latitudeScale(lat,true)):minZoom,Math.min(maxZoom,zoom))};
}
