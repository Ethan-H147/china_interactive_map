import {argentinaFlags} from './argentina-flags.mjs';
import {brazilFlags} from './brazil-flags.mjs';

export function cityDescription(record){
 if(record.cityRank===1)return 'Autonomous city';
 if(!record.boundaryAvailable)return 'City · Municipal boundary pending';
 return record.en!==record.boundaryName?'City · Municipality: '+record.boundaryName:'City · Municipal boundary';
}
export function argentinaMapLabel(record){
 return record.id==='AR-02'||record.cityRank===1?{...record,en:'Buenos Aires (CABA)',local:'Buenos Aires (CABA)'}:record;
}
export function stateStatisticsKey(country,record,scope='states'){
 return record?.level===1&&(country==='argentina'||country==='uruguay'||country==='brazil'&&scope==='states')?country+':'+record.id:'';
}

export const southAmericanFlags={brazil:{firstFlags:brazilFlags},argentina:{firstFlags:argentinaFlags},uruguay:{}};

// Country-specific names and cards; all geometry, camera and selection work is
// owned by regional-country.mjs, the same renderer used by the United States.
export function configureSouthAmericanCountry(country,config){
 if(!(country in southAmericanFlags))return;
 config.deferChildren=true;
 if(country==='argentina')config.selectedOnlyLevel=3;
 config.hasStatistics=record=>!!stateStatisticsKey(country,record,record.thematic||'states')||(country==='brazil'&&record.level===2&&/^BR-\d{7}$/.test(record.id)&&(!record.thematic||record.thematic==='states'));
 config.names=record=>({...record,...record.id==='AR-02'?{en:'Buenos Aires City'}:{},...(record.cityRank?{kind:record.boundaryAvailable?'City / municipality':'City (municipal boundary pending)'}:{})});
 if(country==='brazil'){
  config.hideInheritedDetailFlag=true;
  for(const view of config.thematicViews||[])if(view.available===false)view.hintAlways=true;
  config.renderDetails=(element,record)=>{
   if(record.thematic!=='ddd')return;
   element.replaceChildren();element.hidden=false;
   const title=document.createElement('p');title.textContent='+55 '+record.code+' — '+record.states.join(' / ');
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=record.municipalityCount+' municipalities';details.append(summary);
   details.ontoggle=()=>{if(!details.open||details.children.length>1)return;const list=document.createElement('ul');for(const place of record.municipalities){const item=document.createElement('li');item.textContent=place.name+' ('+place.state+')';list.append(item);}details.append(list);};
   element.append(title,details);
  };
 }
 if(country==='argentina')config.profileMarkup='<details class="country-source-options"><summary>City coverage &amp; sources</summary><p>The 80 city markers follow the existing population ranking. Outlines show municipal jurisdictions; some cities share one municipality. Santiago del Estero and La Banda have no municipal polygon in this dataset.</p><a href="data/south-america/argentina-cities/sources.json" target="_blank" rel="noopener">City boundary sources</a></details>';
}
