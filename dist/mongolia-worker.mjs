import {loadCompressed} from './korea-data.mjs';
import {prepareMongolia} from './mongolia-preparation.mjs';
try{const [data,channels]=await Promise.all(['mongolia-boundaries.bin','mongolia-channels.bin'].map(file=>loadCompressed(new URL('data/'+file,import.meta.url))));data.channels=channels;postMessage({result:prepareMongolia(data)});}
catch(error){postMessage({error:error.message});}
