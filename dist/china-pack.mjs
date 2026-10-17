// Packed form of China's display boundaries, city districts and fill fragments, in the
// compact geometry container (geo-pack.mjs): every path coordinate rounded to 1e-7
// degrees (at most 5.6 mm) and stored once; every ring and line refers to its points by
// index, so shared province, subdivision, line and district points stay identical.
import {geoEncoder,decodeGeoStructure,isGeoPack} from './geo-pack.mjs';

// options.scale: a coarser step for the overview pack drawn first (china-overview.pack.bin).
export function encodePack(input,options){
 const encoder=geoEncoder(options);
 // Subdivisions first: their rings contain every shared province and line point,
 // so later geometry mostly becomes runs over existing indices.
 const order=['subdivisions','provinces','boundaries','annotations'];
 const display=Object.fromEntries(order.filter(key=>key in input.display).map(key=>[key,encoder.encode(input.display[key])]));
 for(const key of Object.keys(input.display))if(!(key in display))display[key]=encoder.encode(input.display[key]);
 return encoder.finish({display:Object.fromEntries(Object.keys(input.display).map(key=>[key,display[key]])),districts:encoder.encode(input.districts),fragments:encoder.encode(input.fragments),lineOmissions:input.lineOmissions,sources:input.sources});
}

export function decodePack(bytes){
 bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(!isGeoPack(bytes))throw Error('Not a packed boundary file');
 const s=decodeGeoStructure(bytes);
 return {display:s.display,districts:s.districts,fragments:s.fragments,lineOmissions:s.lineOmissions||{},sources:s.sources};
}
