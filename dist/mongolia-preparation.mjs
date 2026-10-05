import {lineData} from './adaptive-lines.mjs';
export function prepareMongolia(data){
 const metadata={},sources={},blob=value=>new Blob([JSON.stringify(value)],{type:'application/json'});
 for(const level of ['first','second']){
  metadata[level]={type:'FeatureCollection',features:data[level].features.map(f=>({type:'Feature',properties:f.properties,geometry:null}))};
  sources['mongolia-'+level]=blob(data[level]);
  sources['mongolia-'+level+'-selection-edges']=blob(lineData(data[level]));
 }
 for(const [level,geometry] of Object.entries(data.boundaries))sources['mongolia-'+level+'-edges']=blob(lineData(geometry));
 return {metadata,sources};
}
