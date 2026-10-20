import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,linesOf,polygons,lineIndex,metres} from './geo-index.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';

// A narrow lake's opposite bank is foreign land, but that does not make its shore a border.
// The full official Baltic international lines are drawn by their dedicated country layers.
export function removeBalticShoreFrontiers(){
 const waterFile='dist/data/russia/baltic-water.bin',referenceFile='dist/data/russia/baltic-frontier-reference.bin';
 if(!fs.existsSync(waterFile)||!fs.existsSync(referenceFile))return;
 const shore=lineIndex(load(waterFile).features.flatMap(f=>polygons(f.geometry).flat()));
 const international=lineIndex(linesOf(load(referenceFile)));
 const file='dist/data/atlas-frontiers.bin',data=load(file),features=[];
 let removed=0,removedMetres=0;
 for(const feature of data.features){
  if(!String(feature.properties.countries).split(' ').includes('russia')){features.push(feature);continue;}
  for(const path of linesOf({features:[feature]})){
   let run;
   for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const falseBorder=international(mid)>5&&[a,mid,b].every(p=>shore(p)<2);
    if(falseBorder){removed++;removedMetres+=metres(a,b);run=null;continue;}
    if(!run){run=[a];features.push({...feature,geometry:{type:'LineString',coordinates:run}});}
    run.push(b);
   }
  }
 }
 const result=lineData({type:'FeatureCollection',features});
 fs.writeFileSync(file,gzipSync(JSON.stringify(result),{level:9}));
 const metadataFile='dist/data/atlas-frontiers-sources.json',metadata=load(metadataFile);
 metadata.balticShorelines={source:'russia/baltic-water.bin; russia/baltic-frontier-reference.bin',method:'Mapped lake/lagoon shore segments are excluded from Russia’s generic frontier layer unless they coincide with the official international boundary. Inland administrative meshes are untouched.'};
 metadata.pieces=result.features.length;
 metadata.frontierKm=Math.round(linesOf(result).reduce((sum,path)=>sum+path.slice(1).reduce((n,b,i)=>n+metres(path[i],b),0),0)/1000);
 fs.writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+'\n');
 console.log('Removed',removed,'misclassified shoreline edges ('+(removedMetres/1000).toFixed(2)+' km); international and district lines retained.');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/baltic-frontier-shores.mjs'))removeBalticShoreFrontiers();
