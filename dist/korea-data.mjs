import {compactUrl,decodeData} from './geo-pack.mjs';

// A data file as JSON: gzip JSON, plain JSON, or its compact copy (geo-pack.mjs) when one is published.
export async function loadCompressed(url,{signal}={}){
 const response=await fetch(compactUrl(url),{signal});if(!response.ok)throw Error(`${url}: ${response.status}`);
 return decodeData(await response.arrayBuffer());
}
