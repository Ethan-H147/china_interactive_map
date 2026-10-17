import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
export const directory='artifacts/expansion-source';
export const sources={
 "us-minor-islands-coastline.json":{"url":"https://overpass.private.coffee/api/interpreter?data=%5Bout%3Ajson%5D%5Btimeout%3A90%5D%3B(way%5B%22natural%22%3D%22coastline%22%5D(0%2C-176.6%2C0.4%2C-176.3)%3Bway%5B%22natural%22%3D%22coastline%22%5D(0.6%2C-176.8%2C1%2C-176.5)%3Bway%5B%22natural%22%3D%22coastline%22%5D(-0.5%2C-160.2%2C-0.2%2C-159.8)%3Bway%5B%22natural%22%3D%22coastline%22%5D(16.5%2C-169.7%2C16.9%2C-169.3)%3Bway%5B%22natural%22%3D%22coastline%22%5D(6.2%2C-162.6%2C6.6%2C-162.2)%3Bway%5B%22natural%22%3D%22coastline%22%5D(28%2C-177.6%2C28.4%2C-177.1)%3Bway%5B%22natural%22%3D%22coastline%22%5D(18.2%2C-75.2%2C18.6%2C-74.8)%3Bway%5B%22natural%22%3D%22coastline%22%5D(5.7%2C-162.3%2C6.1%2C-161.9)%3Bway%5B%22natural%22%3D%22coastline%22%5D(19.1%2C166.4%2C19.5%2C166.8)%3B)%3Bout%20geom%3B","provider":"OpenStreetMap · directed coastline ways for all nine US Minor Outlying Islands","license":"ODbL 1.0 · © OpenStreetMap contributors","licenseUrl":"https://www.openstreetmap.org/copyright"},
 'ne-10m-land-boundaries.geojson':{url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_boundary_lines_land.geojson',provider:'Natural Earth v5.1.2 · international boundary reference topology',license:'Public domain'},
 'lau2024.geojson':{url:'https://gisco-services.ec.europa.eu/distribution/v2/lau/geojson/LAU_RG_01M_2024_4326.geojson',provider:'Eurostat GISCO · LAU 2024',license:'Eurostat GISCO non-commercial use; © EuroGeographics for the administrative boundaries',licenseUrl:'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units'},
 'nuts2024.geojson':{url:'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326.geojson',provider:'Eurostat GISCO · NUTS 2024',license:'Eurostat GISCO non-commercial use; © EuroGeographics for the administrative boundaries',licenseUrl:'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units'},
 'swiss2026.zip':{url:'https://data.geo.admin.ch/ch.swisstopo.swissboundaries3d/swissboundaries3d_2026-01/swissboundaries3d_2026-01_2056_5728.shp.zip',provider:'swisstopo · swissBOUNDARIES3D, 1 January 2026',license:'Open government data, attribution: © swisstopo',licenseUrl:'https://www.swisstopo.admin.ch/en/conditions-for-the-use-of-free-geodata-and-geoservices'},
 'us-states-2025.zip':{url:'https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip',provider:'US Census Bureau · 2025 cartographic state boundaries, 1:500,000',license:'Public domain'},
 'canada-provinces.geojson':{url:'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/41af8f1/releaseData/gbOpen/CAN/ADM1/geoBoundaries-CAN-ADM1_simplified.geojson',provider:'Statistics Canada · 2023 boundaries, geoBoundaries pinned release',license:'Statistics Canada Open Licence',licenseUrl:'https://www.statcan.gc.ca/en/reference/licence'},
 'mexico-inegi-states.geojson':{url:'https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee',provider:'INEGI · Marco Geoestadístico, December 2025; water-inclusive state envelopes',license:'INEGI free use with attribution',licenseUrl:'https://www.inegi.org.mx/inegi/terminos.html'},
 'mexico-states.geojson':{url:'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/90a1d52/releaseData/gbOpen/MEX/ADM1/geoBoundaries-MEX-ADM1.geojson',provider:'INEGI · 2020 state boundaries, geoBoundaries pinned release',license:'CC BY 3.0 IGO'},
 'us-population.csv':{url:'https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/totals/NST-EST2025-ALLDATA.csv',provider:'US Census Bureau · July 2025 state population estimates',license:'Public domain'},
 'canada-population.zip':{url:'https://www150.statcan.gc.ca/n1/tbl/csv/17100009-eng.zip',provider:'Statistics Canada · Table 17-10-0009-01, quarterly population estimates',license:'Statistics Canada Open Licence'},
 'mexico-population.zip':{url:'https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_00_cpv2020_csv.zip',provider:'INEGI · 2020 Population and Housing Census, ITER national extract',license:'INEGI free use with attribution'}
};
export async function fetchExpansion(){
 fs.mkdirSync(directory,{recursive:true});
 const pinFile='scripts/country-expansion-sources.json',pins=fs.existsSync(pinFile)?JSON.parse(fs.readFileSync(pinFile)):{retrieved:new Date().toISOString().slice(0,10),files:{}};
 for(const [file,source] of Object.entries(sources)){
  const target=path.join(directory,file);
  if(file==='us-minor-islands-coastline.json'&&!fs.existsSync(target)){const retained='scripts/boundary-sources/us-territories/coastline.json.gz';if(fs.existsSync(retained))fs.writeFileSync(target,gunzipSync(fs.readFileSync(retained)));}
  if(!fs.existsSync(target)){const location=new URL(source.url),coast=file==='us-minor-islands-coastline.json';const r=await fetch(coast?location.origin+location.pathname:source.url,{...(coast?{method:'POST',body:new URLSearchParams({data:location.searchParams.get('data')})}:{}),signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(source.url+' '+r.status);fs.writeFileSync(target,Buffer.from(await r.arrayBuffer()));}
  const sha256=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  if(pins.files[file]?.sha256&&pins.files[file].sha256!==sha256)throw Error(file+' differs from its pinned source. Review the source release before updating the pin.');
  pins.files[file]={...source,sha256,bytes:fs.statSync(target).size};
 }
 fs.writeFileSync(pinFile,JSON.stringify(pins,null,2)+'\n');return pins;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchExpansion();
