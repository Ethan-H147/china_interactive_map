import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const root='scripts/boundary-sources/canada-area-codes/';
export const definitions={
 'nanpa.csv':{url:'https://reports.nanpa.com/public/npa_report.csv',provider:'NANPA · area-code assignments and overlay complexes',license:'Public numbering assignments'},
 'area-codes.geojson':{url:'https://raw.githubusercontent.com/1ec5/nanp-boundaries/4f7e2bd24443160d71420b8885dc6af04a5fe0a8/area-codes.geojson',provider:'UCLA Geoportal · 2015 North American telephone area-code reference preserved by 1ec5',license:'Public domain',licenseUrl:'https://github.com/1ec5/nanp-boundaries/blob/4f7e2bd24443160d71420b8885dc6af04a5fe0a8/LICENSE.md'},
 'cna-maps.html':{url:'https://cnac.ca/area_code_maps/canadian_area_codes.htm',provider:'Canadian Numbering Administrator · current official area-code map index',license:'© Canadian Numbering Administration Consortium; retained for source verification'}
};
export async function fetchCanadaAreaCodes(){fs.mkdirSync(root,{recursive:true});const file=root+'manifest.json',pins=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{retrieved:'2026-10-23',files:{}};
 for(const [name,source]of Object.entries(definitions)){const target=root+name+'.gz';let bytes,upstreamSha256=pins.files[name]?.upstreamSha256;if(fs.existsSync(target))bytes=gunzipSync(fs.readFileSync(target));else{const r=await fetch(source.url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(source.url+' '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(name==='area-codes.geojson'){upstreamSha256=createHash('sha256').update(bytes).digest('hex');const d=JSON.parse(bytes);bytes=Buffer.from(JSON.stringify({...d,features:d.features.filter(f=>/CANADA/.test(f.properties.COUNTRY))}));}fs.writeFileSync(target,gzipSync(bytes,{level:9}));}const sha256=createHash('sha256').update(bytes).digest('hex');if(pins.files[name]?.sha256&&pins.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);pins.files[name]={...source,...(upstreamSha256?{upstreamSha256,extraction:'Only features whose COUNTRY contains CANADA, including the shared Nova Scotia/PEI feature; geometry and source properties unchanged.'}:{}),sha256,bytes:bytes.length};}
 fs.writeFileSync(file,JSON.stringify(pins,null,2)+'\n');return pins;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchCanadaAreaCodes();
