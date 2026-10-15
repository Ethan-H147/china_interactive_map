import {loadCompressed} from './korea-data.mjs';
import {prepareKorea} from './korea-preparation.mjs';
try{
 // Channel borders (build-channel-borders.mjs) sit in their own file; the boundary data stays exact.
 const [data,channels]=await Promise.all(['korea-boundaries.bin','korea-channels.bin'].map(file=>loadCompressed(new URL('data/'+file,import.meta.url))));data.channels=channels;
 // Blobs are shared without cloning the coordinate arrays onto the UI thread.
 postMessage({result:prepareKorea(data)});
}catch(error){postMessage({error:error.message});}
