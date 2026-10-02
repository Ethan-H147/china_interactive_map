import fs from 'node:fs';
import assert from 'node:assert/strict';
import mapshaper from 'mapshaper';
import proj from 'mproj';
import {createHash} from 'node:crypto';
const dir='scripts/additional-sources/';
const read=name=>JSON.parse(fs.readFileSync(dir+name));
const collection=features=>({type:'FeatureCollection',features});
const old=JSON.parse(fs.readFileSync('dist/data/810000.json'));
const traditional=['中西區','灣仔區','東區','南區','油尖旺區','深水埗區','九龍城區','黃大仙區','觀塘區','荃灣區','屯門區','元朗區','北區','大埔區','西貢區','沙田區','葵青區','離島區'];
const districts=collection(read('hk-districts-official.json').features.map(f=>{
 const index=traditional.indexOf(f.properties['地區']);assert(index>=0);
 return {...f,properties:{...old.features[index].properties,name:traditional[index],searchAliases:old.features[index].properties.name,englishName:f.properties.District,provinceCode:810000,geometrySource:'Hong Kong Home Affairs Department and Lands Department'}};
}));
// District jurisdictions include sea. Remove the Lands Department's sea polygons
// to retain the actual islands and channels, without generalizing the coastline.
const clipped=await mapshaper.applyCommands('-i districts.json -erase sea.json -clean gap-width=0 -o output.json format=geojson',{'districts.json':districts,'sea.json':read('hk-sea.json')});
const hk=JSON.parse(clipped['output.json']);assert.equal(hk.features.length,18);
const definition='+proj=tmerc +lat_0=22.212397222222 +lon_0=113.536469444444 +k=1 +x_0=20000 +y_0=20000 +ellps=GRS80 +units=m';
const projection=proj.pj_init(definition);
// Official six-parameter 2D transformation, Macau Grid -> ITRF2005/WGS84.
// DSCC geodetic datum description, Annex I. Preserve all source vertices.
export function macauToWgs84([e,n]){
 const angle=(60+29.586)*Math.PI/(180*3600),scale=1+6.513e-6;
 const x=e-21688.365,y=n-14963.270;
 const east=21688.365+307.377+scale*(Math.cos(angle)*x+Math.sin(angle)*y);
 const north=14963.270-133.374+scale*(-Math.sin(angle)*x+Math.cos(angle)*y);
 const ll=proj.pj_inv_deg({x:east,y:north},projection);return [ll.lam,ll.phi];
}
const examples=[[[20800.08,18145.04],[113+32/60+50/3600,22+11/60+40/3600]],[[20802.10,14146.39],[113+32/60+50/3600,22+9/60+30/3600]],[[24243.21,10149.87],[113+34/60+50/3600,22+7/60+20/3600]]];
for(const [xy,expected] of examples){const got=macauToWgs84(xy);assert(Math.hypot(got[0]-expected[0],got[1]-expected[1])<1e-7,'Macau datum conversion disagrees with official example');}
const codes={'花地瑪堂區':820001,'花王堂區':820002,'望德堂區':820003,'大堂區':820004,'風順堂區':820005,'嘉模堂區':820006,'路氹填海區':820007,'聖方濟各堂區':820008,'新城A區':820009,'澳門大學':820010,'港珠澳大橋珠澳口岸人工島澳門口岸管理區':820011};
const english={820001:'Nossa Senhora de Fátima',820002:'Santo António',820003:'São Lázaro',820004:'Sé',820005:'São Lourenço',820006:'Nossa Senhora do Carmo',820007:'Cotai',820008:'São Francisco Xavier',820009:'New Urban Zone A',820010:'University of Macau',820011:'Macau Port Administration Area'};
const native=read('mo-parish-native.json');assert.equal(native.features.length,11);
// Mapshaper's GeoJSON import identifies shells and holes from Esri ring winding.
const moInput=collection(native.features.map(f=>({type:'Feature',properties:{adcode:codes[f.attributes.CNAME],name:f.attributes.CNAME,searchAliases:f.attributes.SNAME,englishName:english[codes[f.attributes.CNAME]],level:'district',provinceCode:820000,adminType:f.attributes.CNAME.endsWith('堂區')?'Parish':'Area',geometrySource:'Macao government online map'},geometry:{type:'Polygon',coordinates:f.geometry.rings.map(r=>r.map(macauToWgs84))}})));
const converted=await mapshaper.applyCommands('-i input.json -clean gap-width=0 -o output.json format=geojson',{'input.json':moInput});
const mo=JSON.parse(converted['output.json']);assert.equal(mo.features.length,11);
for(const [code,data] of [[810000,hk],[820000,mo]]){
 const centers=await mapshaper.applyCommands('-i input.json -points inner -o centers.json format=geojson',{'input.json':data});
 const points=new Map(JSON.parse(centers['centers.json']).features.map(f=>[f.properties.adcode,f.geometry.coordinates]));
 for(const f of data.features)f.properties.center=points.get(f.properties.adcode);
 fs.writeFileSync('dist/data/sar-'+code+'.json',JSON.stringify(data));
}
const checksum=name=>createHash('sha256').update(fs.readFileSync(dir+name)).digest('hex');
const provenance=JSON.parse(fs.readFileSync('dist/data/additional-sources.json'));
provenance.sources=provenance.sources.filter(s=>!['Hong Kong Home Affairs Department','Hong Kong Lands Department','Macao government online map'].includes(s.provider));
provenance.sources.push(
 {provider:'Hong Kong Home Affairs Department',url:'https://data.gov.hk/en-data/dataset/hk-had-json1-hong-kong-administrative-boundaries',download:'https://www.had.gov.hk/psi/hong-kong-administrative-boundaries/hksar_18_district_boundary.json',sourceFile:'hk-districts-official.json',sha256:checksum('hk-districts-official.json'),features:18,coordinateSystem:'WGS84',licenseURL:'https://data.gov.hk/en/terms-and-conditions'},
 {provider:'Hong Kong Lands Department',url:'https://portal.csdi.gov.hk/csdi-webpage/metadata/landsd_rcd_1637221775627_85634/html',download:'https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637221775627_85634/MapServer/7/query?where=TYPE%3D%27SEF%27&outFields=CLASS%2CTYPE&outSR=4326&f=geojson',sourceFile:'hk-sea.json',sha256:checksum('hk-sea.json'),coordinateSystem:'WGS84',scale:'1:50,000',processing:'Sea polygons erased from official district jurisdictions; all coastline vertices retained.',licenseURL:'https://data.gov.hk/en/terms-and-conditions'},
 {provider:'Macao government online map',url:'https://webmap.gis.gov.mo/MapGIS/index.html',download:'https://webmap.gis.gov.mo/arcgis/rest/services/ThematicMap/Freg_stats/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=json',sourceFile:'mo-parish-native.json',sha256:checksum('mo-parish-native.json'),features:11,coordinateSystem:'Macau Grid converted to WGS84 using official Annex I six-parameter transformation',coordinateReference:'https://www.dscc.gov.mo/files/geographical_level_point/PORT/Macaucoord_2009_web_PT_v201702.pdf',processing:'Seven parish polygons and four other areas, retaining all source vertices.'}
);
fs.writeFileSync('dist/data/additional-sources.json',JSON.stringify(provenance,null,2));
console.log(JSON.stringify({hongKong:hk.features.length,macau:mo.features.length,projectionExamplesVerified:3}));
