import assert from 'node:assert/strict';
import {load} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';

// These cities are administered outside the elderships listed by INSPIRE.
// Subtract the official elderships from their own municipality, never a neighbour.
export const lithuanianCityAreas=[
 {code:'29',name:'Šiauliai',local:'Šiauliai',partial:true,source:'https://www.siauliai.lt/page/view/711'},
 {code:'12',name:'Birštonas',local:'Birštonas',source:'https://birstonas.lt/wp-content/uploads/2017/02/Birstono-savivaldyb%C4%97s-BP-keitimas-SPAV-ataskaita.pdf'},
 {code:'15',name:'Druskininkai',local:'Druskininkai',source:'https://druskininkusavivaldybe.lt/'},
 {code:'57',name:'Kupiškis',local:'Kupiškis',source:'https://www.kupiskis.lt/informacija-apie-pradedama-rengti-kupiskio-miesto-bendrojo-plano-keitima/852'},
 {code:'62',name:'Molėtai',local:'Molėtai',source:'https://www.e-tar.lt/rs/legalact/dd0b80b0545611e9975f9c35aedfe438/'},
];

export async function completeLithuanianCities(bottom,units){
 const municipal=load('scripts/boundary-sources/baltics/lt-level3.json.gz');
 const wards=load('scripts/boundary-sources/baltics/lt-level4.json.gz');
 const added=[];
 const population=load('scripts/boundary-sources/baltics/lt-pop-admin.json.gz');
 const cityCodes={12:'12016',15:'13783',57:'18758',62:'21316'};
 for(const city of lithuanianCityAreas){
  const parent='LT-M-'+city.code,id='LT-CITY-'+city.code;
  const m=municipal.features.find(f=>f.properties.nationalcode===city.code);
  const children=wards.features.filter(f=>f.properties.upperlevelunit_href==='#municipality_'+city.code);
  assert(m&&children.length,'Official municipal and eldership coverage '+parent);
  const gap=await command({'municipal.json':fc([m]),'wards.json':fc(children)},'-erase wards.json -dissolve -clean gap-fill-area=0');
  assert.equal(gap.features.length,1);
  let cityPopulation;
  if(cityCodes[city.code]){
   const index=population.structure.dimensions.observation[1].values.findIndex(v=>v.id===cityCodes[city.code]&&v.name===city.local+', m.');
   const value=population.dataSets[0].observations['0:'+index+':0:0']?.[0];
   assert(index>=0&&Number.isFinite(value),'Official city population '+city.name);
   cityPopulation={value,year:2026,date:'2026-01-01',method:'estimate',periodLabel:'1 January 2026 population',source:'population'};
  }
  units.set(id,{id,code:'CITY-'+city.code,level:3,parent,en:city.partial?'Šiauliai (outside elderships)':city.name,shortMapLabel:city.name,local:city.partial?'Šiauliai (ne seniūnijose)':city.local,localLang:'lt',names:{lt:city.local},kind:city.partial?'City area':'City',kindLocal:city.partial?'Miesto teritorija':'Miestas',aliases:[city.name,city.local+' miestas'],areaYear:2026,...(cityPopulation?{population:cityPopulation}:{}),...(city.partial?{quizEligible:false}:{})});
  added.push({...gap.features[0],properties:{id}});
 }
 return fc([...bottom.features.filter(f=>!added.some(a=>a.properties.id===f.properties.id)),...added]);
}
