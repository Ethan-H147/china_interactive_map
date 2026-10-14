// Builds China's MapLibre sources from the packed boundaries. Runs inside
// MapLibre's workers, so the full geometry never reaches the page.
import {lineData,omitBorderSegments} from './adaptive-lines.mjs';
import {isPrefectureLevel} from './china-levels.mjs';

const featureCollection=features=>({type:'FeatureCollection',features});
export function chinaSourceBuilders({display,districts,fragments}){
 const provinces=display.provinces.features;
 const prefectures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties));
 const others=display.subdivisions.features.filter(f=>!isPrefectureLevel(f.properties));
 // The two repaired fills use unsimplified triangles. Other regions use
 // subpixel tile simplification, retaining every original source coordinate.
 const regularFills=features=>featureCollection(features.filter(f=>!fragments[f.properties.adcode]));
 const triangleFills=features=>featureCollection(features.filter(f=>fragments[f.properties.adcode]).flatMap(f=>fragments[f.properties.adcode].coordinates.map(coordinates=>({type:'Feature',properties:{adcode:f.properties.adcode},geometry:{type:'Polygon',coordinates}}))));
 return {
  provinces:()=>regularFills(provinces),
  prefectures:()=>regularFills(prefectures),
  others:()=>featureCollection(others),
  'provinces-fragments':()=>triangleFills(provinces),
  'prefectures-fragments':()=>triangleFills(prefectures),
  // Province outlines omit segments drawn by the international border layer.
  ...Object.fromEntries(Object.entries(display.boundaries).map(([name,geometry])=>[name+'-boundaries',({excluded}={})=>{
   if(name!=='province')return lineData(geometry);
   if(!excluded)throw Error('Province outlines need the international border segments');
   return lineData(omitBorderSegments(geometry,excluded));
  }])),
  'provinces-selection-edges':()=>lineData(display.provinces),
  'prefectures-selection-edges':()=>lineData(featureCollection(prefectures)),
  'others-selection-edges':()=>lineData(featureCollection(others)),
  'city-districts':()=>districts.regions,
  'city-district-boundaries':()=>lineData(districts.boundaries),
  'city-districts-selection-edges':()=>lineData(districts.regions)
 };
}

// The page needs properties, bounds and part counts, not coordinates.
export function describeRegion(feature){
 const g=feature.geometry,p=feature.properties;
 if(!g)return {properties:p,geometry:null};
 const all=[Infinity,Infinity,-Infinity,-Infinity],north=[Infinity,Infinity,-Infinity,-Infinity];
 const taiwan=p.adcode===710000||p.provinceCode===710000;
 const add=(box,[x,y])=>{if(x<box[0])box[0]=x;if(y<box[1])box[1]=y;if(x>box[2])box[2]=x;if(y>box[3])box[3]=y;};
 const walk=c=>{if(typeof c[0]==='number'){add(all,c);if(taiwan&&c[1]>20)add(north,c);}else c.forEach(walk);};
 walk(g.coordinates);
 // Taiwan views focus on its nearby islands; the geometry itself stays complete.
 return {properties:p,geometry:{type:g.type,parts:g.type==='MultiPolygon'?g.coordinates.length:1},bounds:all,...(taiwan&&north[0]!==Infinity?{focus:north}:{})};
}
export const describeChina=({display,districts})=>({boundaries:Object.keys(display.boundaries),provinces:display.provinces.features.map(describeRegion),subdivisions:display.subdivisions.features.map(describeRegion),districts:districts.regions.features.map(describeRegion)});
