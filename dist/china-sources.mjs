// Builds China's MapLibre sources from the packed boundaries. Runs inside
// MapLibre's workers, so the full geometry never reaches the page.
import {lineData,withoutSegments} from './adaptive-lines.mjs';
import {isPrefectureLevel} from './china-levels.mjs';

// China's first view draws from an overview pack rounded to 1e-4 degrees (at most 5.6 m),
// then switches to the full pack. At zoom 10 and below that is under a quarter of a
// device pixel on a 2x screen; a first view closer than that waits for the full pack.
export const OVERVIEW_SCALE=1e4,OVERVIEW_MAX_ZOOM=10;

const featureCollection=features=>({type:'FeatureCollection',features});
export function chinaSourceBuilders({display,districts,fragments,lineOmissions={}}){
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
  // Hidden segments (on an international line, or already drawn) are found when
  // the pack is built; see hiddenSegments in adaptive-lines.mjs.
  ...Object.fromEntries(Object.entries(display.boundaries).map(([name,geometry])=>[name+'-boundaries',()=>lineData(withoutSegments(geometry,lineOmissions[name]||[]))])),
  'provinces-selection-edges':()=>lineData(display.provinces),
  'prefectures-selection-edges':()=>lineData(featureCollection(prefectures)),
  'others-selection-edges':()=>lineData(featureCollection(others)),
  'city-districts':()=>districts.regions,
  'city-district-boundaries':()=>lineData(withoutSegments(districts.boundaries,lineOmissions.districts||[])),
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
