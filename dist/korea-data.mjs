import {compactUrl,decodeData,fetchBytes} from './geo-pack.mjs';

// A data file as JSON: gzip JSON, plain JSON, or its compact copy (geo-pack.mjs) when one is published.
export async function loadCompressed(url,{signal}={}){
 return decodeData(await fetchBytes(compactUrl(url),{signal}));
}
