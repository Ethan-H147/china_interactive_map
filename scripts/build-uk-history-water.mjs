import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {decodeData,encodeGeo} from '../dist/geo-pack.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {linesOf,polygons} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
export async function writeUKCoastWater(output,coasts){
 const features=[],sources=new Set();
 for(const entry of coasts){if(entry.id!=='north-america')continue;const data=await decodeData(fs.readFileSync(output+'/'+entry.file));features.push(...data.water.features);for(const source of data.sources||[])if(/^europe\/[^/]+\/first.bin$/.test(source))sources.add(source);}
 const backgrounds=[];
 for(const file of ['world-land.bin','globe-overview-land.bin'])backgrounds.push(...(await decodeData(fs.readFileSync('dist/data/'+file))).features);
 for(const source of sources){
  const country=source.split('/')[1];
  if(country!=='canada')continue;
  const coarse=fc(backgrounds.filter(f=>f.properties.country===country));
  if(!coarse.features.length)continue;
  const data=await decodeData(fs.readFileSync('dist/data/'+source));
  // This extra mask corrects ocean overshoot; existing regional masks retain lakes and lagoons.
  const outerLand=fc(data.regions.features.flatMap(f=>polygons(f.geometry).map(p=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[p[0]]}}))));
  const land=await command(outerLand,'-dissolve2',{precision:.0000001});
  const sea=await command({'coarse.json':coarse,'land.json':land},'-explode -erase land.json',{precision:.0000001});
  // A coarse international border mismatch is land, not sea.
  const frontierFile='dist/data/'+source.replace('first.bin','international.bin');
  let safe=sea;
  if(fs.existsSync(frontierFile)){
   const paths=linesOf(await decodeData(fs.readFileSync(frontierFile)));
   if(paths.length){
    const frontier=fc(paths.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}})));
    const guard=await command(frontier,'-simplify dp interval=.005 planar -buffer radius=10km',{precision:.0000001});
    safe=await command({'sea.json':sea,'guard.json':guard},'-explode -erase guard.json',{precision:.0000001});
   }
  }
  features.push(...safe.features.filter(f=>f.geometry&&geographicAreaKm2(f.geometry)>=.001));console.log('Clearing coarse background overshoot for',country);
 }
 const water=await command(fc(features),'-dissolve2 -simplify dp interval=.001 planar keep-shapes',{precision:.0000001});
 const file='coasts/overview-water.bin';
 fs.writeFileSync(output+'/'+file,gzipSync(encodeGeo(water,{}, {scale:1e7}),{level:9}));
 console.log('Historical overview water:',water.features.length,'features,',fs.statSync(output+'/'+file).size,'bytes');
 return file;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=process.env.ATLAS_UK_HISTORY_OUTPUT||'dist/data/europe/united-kingdom/history';
 const data=await decodeData(fs.readFileSync(output+'/borders.bin'));
 data.coastWater=await writeUKCoastWater(output,data.coasts);
 fs.writeFileSync(output+'/borders.bin',gzipSync(encodeGeo(data,{source:data.source.url},{scale:1e7}),{level:9}));
}
