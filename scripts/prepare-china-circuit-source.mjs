// Retain the two circuit outlines and prefecture seats from Zheng and Wu's CC BY 4.0
// dataset (https://doi.org/10.6084/m9.figshare.30518417). Pass the directory containing
// ResearchArea.shp and CountyPointsWithPopulation.shp, with their DBF/PRJ/CPG files.
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper');
const dir=process.argv[2];
if(!dir)throw Error('Pass the extracted shapefile directory.');
const read=async(name,commands)=>{
 const output=await mapshaper.applyCommands('-i '+JSON.stringify(path.join(dir,name+'.shp').replaceAll('\\','/'))+
  ' '+commands+' -o out.json format=geojson precision=0.002');
 return JSON.parse(Object.values(output)[0]).features;
};
const period="YEAR == '742AD' || YEAR == '1102AD'";
// Qinghai prefectures abandoned in 1100, or set up on the later reconquest. See Song shi 87.
const later=['Xining Zhou','Huang Zhou','Kuo Zhou','Jishi Jun'];
const prefectures=await read('ResearchArea',`-filter "${period}" -proj wgs84 -each "circuit=YEAR+':'+(YEAR=='1102AD' && PrefNAM=='He Zhou' && ProvNAM=='Guangnanxi Lu' ? 'Guangnan East Lu' : YEAR=='1102AD' && PrefNAM=='Jiang Zhou' ? 'Jiangnan West Lu' : ProvNAM)" -filter "YEAR != '1102AD' || ProvNAM != 'Qinfeng Lu' || !${JSON.stringify(later).replaceAll('"',"'")}.includes(PrefNAM)" -dissolve circuit allow-overlaps -simplify interval=1800 keep-shapes -filter-fields circuit`);
const points=(await read('CountyPointsWithPopulation',`-filter "(${period}) && TYPE == 'Prefecture Seat'" -proj wgs84 -filter-fields YEAR,CountyID,ProvNAM,PrefNAM,CountyNAM`)).filter(f=>(!f.properties.PrefNAM.includes(',')||['742AD:Lingnan Dao','1102AD:Guangnanxi Lu'].includes(f.properties.YEAR+':'+f.properties.ProvNAM))&&!(f.properties.YEAR==='1102AD'&&f.properties.ProvNAM==='Qinfeng Lu'&&later.includes(f.properties.PrefNAM)));
fs.writeFileSync('scripts/boundary-sources/china-history/tang-song-circuits.geojson.gz',gzipSync(JSON.stringify({prefectures,points}),{level:9}));
console.log(prefectures.length+' circuits and '+points.length+' prefectural seat records.');
