import {placePronunciations} from './place-pronunciations.mjs';
const byPlace=new Map(),byId=new Map(),countries=new Set();
for(const entry of Object.values(placePronunciations)){
 const key=entry.country+':'+entry.id;
 if(!byPlace.has(key))byPlace.set(key,[]);byPlace.get(key).push(entry);
 if(!byId.has(entry.id))byId.set(entry.id,[]);byId.get(entry.id).push(entry.text);
 countries.add(entry.country);
}
export const getPlacePronunciations=(country,id)=>byPlace.get(country+':'+id)||[];
export const hasPlacePronunciations=country=>countries.has(country);
export const pronunciationNameAliases=record=>byId.get(String(record.id||record.code))||[];
