// Match each quiz city to its Census place in the US catalogue. A name can also be a township
// or county subdivision; the incorporated place is the city.
import {cityQuizCities} from './us-city-quiz-definitions.mjs';
export function cityQuizPlaces(catalogue){
 const places=catalogue.records.filter(r=>r.level===3),result=[];
 for(const [tier,list] of Object.entries(cityQuizCities))for(const [name,state,census] of list){
  const want=census||name,parent='US-'+state;
  let hits=places.filter(r=>r.parent===parent&&(r.en===want||r.en===want.replace(/^St\. /,'Saint ')));
  if(hits.length>1)hits=hits.filter(r=>r.sourceType==='place');
  if(hits.length!==1)throw Error(`City quiz: ${name}, ${state} matches ${hits.length} Census places`);
  result.push({tier,name,state,record:hits[0]});
 }
 return result;
}
