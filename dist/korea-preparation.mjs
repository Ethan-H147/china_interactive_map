import {lineData} from './adaptive-lines.mjs';
export function prepareKorea(data){
 const metadata={first:{type:'FeatureCollection',features:[]},second:{type:'FeatureCollection',features:[]}};
 const sources={};
 const blob=value=>new Blob([JSON.stringify(value)],{type:'application/json'});
 for(const level of ['first','second']){
  metadata[level].features=data[level].features.map(f=>({type:'Feature',properties:f.properties,geometry:null}));
  sources['korea-'+level]=blob(data[level]);
  sources['korea-'+level+'-selection-edges']=blob(lineData(data[level]));
 }
 for(const [name,geometry] of Object.entries(data.boundaries))sources['korea-'+name+'-edges']=blob(lineData(geometry));
 return{metadata,sources};
}
