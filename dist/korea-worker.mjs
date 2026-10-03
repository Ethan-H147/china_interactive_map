import {loadCompressed} from './korea-data.mjs';
import {prepareKorea} from './korea-preparation.mjs';
try{
 const data=await loadCompressed(new URL('data/korea-boundaries.bin',import.meta.url));
 // Blobs are shared without cloning the coordinate arrays onto the UI thread.
 postMessage({result:prepareKorea(data)});
}catch(error){postMessage({error:error.message});}
