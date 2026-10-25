import {prepareScopedCountry} from './scoped-country.mjs';
try{postMessage({result:await prepareScopedCountry('korea')});}
catch(error){postMessage({error:error.message});}
