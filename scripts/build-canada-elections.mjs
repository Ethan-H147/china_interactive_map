import fs from 'node:fs';
import assert from 'node:assert/strict';
import {input,read,write} from './canada-map-geometry.mjs';

function table(file,delimiter='\t',encoding='utf-8'){
 const raw=new TextDecoder(encoding).decode(fs.readFileSync(input+file));
 const out=[];let line=[],field='',quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===delimiter||c==='\n')){line.push(field.replace(/\r$/,''));field='';if(c==='\n'){out.push(line);line=[];}}
  else field+=c;
 }
 if(line.length||field)out.push([...line,field.replace(/\r$/,'')]);
 const keys=out.shift();return out.filter(r=>r.length===keys.length).map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i].trim()])));
}
const norm=(s='')=>s.normalize('NFD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const province={10:'Newfoundland and Labrador',11:'Prince Edward Island',12:'Nova Scotia',13:'New Brunswick',24:'Quebec',35:'Ontario',46:'Manitoba',47:'Saskatchewan',48:'Alberta',59:'British Columbia',60:'Yukon',61:'Northwest Territories',62:'Nunavut'};
const provinceKey=s=>norm(s)==='NEWFOUNDLAND'?'10':Object.keys(province).find(k=>norm(province[k])===norm(s));
const orders=new Map([[1867,1867],[1872,1872],[1874,1872],[1878,1872],[1882,1882],[1887,1882],[1891,1882],[1896,1892],[1900,1892],[1904,1903],[1908,1905],[1911,1905],[1917,1914],[1921,1914],[1925,1924],[1926,1924],[1930,1924],[1935,1933],[1940,1933],[1945,1933],[1949,1947],[1953,1952],[1957,1952],[1958,1952],[1962,1952],[1963,1952],[1965,1952],[1968,1966],[1972,1966],[1974,1966],[1979,1976],[1980,1976],[1984,1976],[1988,1987],[1993,1987],[1997,1996],[2000,1999],[2004,2003],[2006,2003],[2008,2003],[2011,2003],[2015,2013],[2019,2013],[2021,2013],[2025,2025]]);
const officialSeats=[181,200,206,206,211,215,215,213,213,214,221,221,235,235,245,245,245,245,245,245,262,265,265,265,265,265,265,264,264,264,282,282,282,295,295,301,301,308,308,308,308,338,338,338,343];
const cross=Map.groupBy(table('correspondence.tsv'),f=>norm(f.matcher)),roster=Map.groupBy(table('fed.tsv'),r=>+r.time);
const shapes=new Map([...new Set(orders.values())].map(y=>[y,read(input+'riding-'+y+'.json').features.map(f=>f.properties)]));
shapes.get(1905).push(...shapes.get(1903).filter(f=>['190335024','190335025','190335040'].includes(f.fedid)).map(f=>({...f,fedid:'1905'+f.fedid.slice(4)})));
const idOf=(y,p,name,number)=>{
 const order=orders.get(y),rows=shapes.get(order),code=provinceKey(p);
 if(number){const found=rows.find(f=>String(f.id)===number);if(found)return found.fedid;}
 const aliases={STHYACINTHE:'SAINTHYACINTHE',STJAMES:'SAINTJACQUES',STORMONTDUNDASCHARLOTENBURGH:'STORMONTDUNDASCHARLOTTENBURGH'};
 const label=aliases[norm(name)]||norm(name);
 const all=[...new Set([
  ...(cross.get(norm(y+' '+name+' '+p))||[]).map(r=>r.fedid),
  ...(roster.get(order)||[]).filter(r=>r.prcode===code+'.0'&&(norm(r.geoname)===label||label==='MOUNTROYAL'&&norm(r.geoname).includes(label))).map(r=>r.geosid),
  ...rows.filter(r=>r.fedid.startsWith(order+code)&&norm(r.fedname)===label).map(r=>r.fedid)
 ].filter(id=>rows.some(r=>r.fedid===id)))];
 if(all.length===1)return all[0];
 const exact=(cross.get(norm(y+' '+name+' '+p))||[]).filter(r=>rows.some(s=>s.fedid===r.fedid));
 if(new Set(exact.map(r=>r.fedid)).size===1)return exact[0].fedid;
 console.warn('Unmatched riding',y,p,name,all);return null;
};
const tidyParty=s=>({'United Party of Canada (UP)':'United Party of Canada',UPC:'United Party of Canada',VCP:'Veterans Coalition Party',ML:'Marxist-Leninist',CAP:'Canadian Action Party',WBP:'Western Block',ATN:'Alliance of the North',Pirate:'Pirate Party','Forces et Démocratie - Allier les forces de nos régions':'Forces et Démocratie','People’s Party - PPC':"People's Party","People's Party - PPC":"People's Party",'Liberal Party of Canada':'Liberal','Conservative Party of Canada':'Conservative','NDP-New Democratic Party':'New Democratic Party','NDP':'New Democratic Party','Green Party of Canada':'Green Party','No Affiliation':'Independent','No affiliation':'Independent','':'Independent'})[s]||s;
const results=new Map(),record=(year,date,province,name,id,candidate)=>{
 if(!results.has(year))results.set(year,[]);results.get(year).push({date,province,riding:name,id,...candidate});
};
const parseVotes=s=>s&&Number.isFinite(+s.replace(/,/g,''))?+s.replace(/,/g,''):null;
for(const r of table('results.csv',',','windows-1252')){
 let date=r['Election Date']?.replaceAll('/','-'),year=+date?.slice(0,4);
 // The parliamentary CSV dates Victoria (Alberta) a year later than its
 // general election. The riding returns are for the 11th Parliament.
 if(year===1909&&r.Parliament==='11'&&r.Province==='Alberta'&&r.Riding==='VICTORIA'){year=1908;date='1908-10-26';}
 if(year===1949&&r.Province==='Yukon'&&r.Riding==='YUKON--MACKENZIE RIVER')continue;
 
 if(r['Election Type']!=='Gen'||!orders.has(year))continue;
 const {Province:p,Riding:name}=r,elected=['1','2'].includes(r.Elected),votes=parseVotes(r.Votes);
 record(year,date,year===1949&&name==='YUKON--MACKENZIE RIVER'?'Yukon and Northwest Territories':p,name,idOf(year,p,name),{name:[r['First Name'],r['Last Name']].filter(Boolean).join(' '),party:tidyParty(r.Party),votes,elected,acclaimed:elected&&votes==null});
}
const parties=['Animal Protection Party','Animal Alliance Environment Voters Party of Canada','Canadian Future Party','Canadian Action Party','Christian Heritage Party','CHP Canada','Communist Party of Canada','United Party of Canada (UP)','United Party of Canada','NDP-New Democratic Party','Green Party of Canada','Green Party','People’s Party - PPC',"People's Party - PPC","People's Party",'Marxist-Leninist','Parti Rhinocéros Party','Parti Rhinocéros','Rhinoceros Party','Marijuana Party','No Affiliation','No affiliation','Libertarian','Conservative','Communist','Independent','Centrist','Bloc Québécois','Liberal','Forces et Démocratie','National Citizens Alliance','Progressive Canadian Party','PC Party','Pirate Party','United Party','Western Block','Veterans Coalition Party','Free Party Canada','Maverick Party','Alliance of the North','Canada Party','Bridge Party of Canada','Stop Climate Change','Nationalist Party of Canada','Nationalist','Rhinoceros','CAP','Animal Alliance/Environment Voters','Radical Marijuana','FPNP','WBP','Forces et Démocratie - Allier les forces de nos régions','ATN','ML','VCP',"Pour l'Indépendance du Québec","CFF - Canada's Fourth Front",'UPC','Parti Patriote','Pirate','PACT','Seniors Party','The Bridge','Democratic Advancement'];
const recent={2011:['2003','2011-05-02'],2015:['2013','2015-10-19'],2019:['2013','2019-10-21'],2021:['2013','2021-09-20'],2025:['','2025-04-28']};
for(const [year,[prefix,date]] of Object.entries(recent))for(const r of table(year+'.csv',',',year==='2011'?'windows-1252':'utf-8')){
 const number=r['Electoral District Number/Numéro de circonscription'],name=r['Electoral District Name/Nom de circonscription'],text=r['Candidate/Candidat'];if(!/^\d{5}$/.test(number)||!text)continue;
 const party=parties.find(p=>text.includes(' '+p+'/'));
 assert(party,year+' unknown party: '+text);
 record(+year,date,province[number.slice(0,2)],name.replace(/\//g,' / '),prefix+number,{name:text.slice(0,text.lastIndexOf(' '+party+'/')).replace(/\s*\*+\s*$/,'').trim(),party:tidyParty(party),votes:parseVotes(r['Votes Obtained/Votes obtenus']),elected:!!r['Majority/Majorité'],acclaimed:false});
}
const elections=[],configs={},dated={};
for(const [i,[year,order]] of [...orders].entries()){
 const rows=results.get(year),states={},parties=new Map(),provinces={};
 assert(rows?.length,year+' results missing');
 const assigned=Map.groupBy(rows,r=>r.id||r.province+'|'+r.riding);
 for(const [id,rr] of assigned){
  const first=rr[0],candidates=rr.map(({name,party,votes,elected,acclaimed})=>({name,party,votes,elected,acclaimed}));
  // Source riding names (rather than candidate names) are supplied below.
  const winners=candidates.filter(c=>c.elected),total=candidates.reduce((s,c)=>s+(c.votes||0),0),winningParties=[...new Set(winners.map(c=>c.party))];
  const top=[...candidates].sort((a,b)=>(b.votes||0)-(a.votes||0));
  const winner=winningParties.length>1?'Mixed result':winningParties[0]||'';
  const p=first.province,ps=provinces[p]??={seats:0,parties:{}};
  for(const c of candidates){
   if(!parties.has(c.party))parties.set(c.party,{name:c.party,popular:0,seats:0});
   const party=parties.get(c.party),local=ps.parties[c.party]??={seats:0,votes:0};
   party.popular+=c.votes||0;local.votes+=c.votes||0;
   if(c.elected){party.seats++;local.seats++;ps.seats++;}
  }
  const ro=(roster.get(order)||[]).find(r=>r.geosid===id);
  const actualName=first.riding,placeName=ro?.geoname&&!ro.geoname.includes('�')?ro.geoname:actualName===actualName?.toUpperCase()?actualName.toLocaleLowerCase().replace(/(^|[ -])\p{L}/gu,c=>c.toLocaleUpperCase()):actualName||first.province;
  // Sources write the em dash of compound riding names as a double hyphen.
  if(first.id)states[id]={name:placeName.replace(/--/g,'—'),province:p,candidates,winner,total,...(total&&winners.length===1&&top[0]===winners[0]?{margin:((top[0].votes||0)-(top[1]?.votes||0))/total*100}:{})};
 }

 const seats=[...parties.values()].reduce((s,p)=>s+p.seats,0),vote=[...parties.values()].reduce((s,p)=>s+p.popular,0);
 assert.equal(seats,officialSeats[i]-(year===1867?1:0),year+' returned seats');
 assert.equal(Object.values(states).reduce((s,r)=>s+r.candidates.filter(c=>c.elected).length,0),seats,year+' mapped seats');
 for(const p of parties.values())p.percent=vote?p.popular/vote*100:null;
 if(Object.values(states).some(s=>s.winner==='Mixed result'))parties.set('Mixed result',{name:'Mixed result',color:'#77707f',legendOnly:true,seats:0,popular:0});
 const source=recent[year]?'https://www.elections.ca/content.aspx?dir=rep/off/'+(i+1)+'gedata&document=summary&lang=e&section=res':'https://open.canada.ca/data/en/dataset/ea8f2c37-90b6-4fee-857e-984d3060184e';
 const sourceName=recent[year]?'Elections Canada':'Library of Parliament';
 const dates=[...new Set(rows.map(r=>r.date))].sort(),format=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 if(year===1867)states['186724023']={name:'Kamouraska',province:'Quebec',candidates:[],winner:'',note:'No election was held here in 1867. The seat was filled in a by-election in February 1869.'};
 const period=year===1867?'August 7 – September 20, 1867':year===1872?'July 20 – October 12, 1872':null;
 elections.push({year,date:period||(dates.length>1?format(dates[0])+' – '+format(dates.at(-1)):format(dates[0])),title:year+' federal election',source,sourceName,seats:officialSeats[i],needed:Math.floor(officialSeats[i]/2)+1,...(year===1867?{note:'180 of 181 seats returned a member. Kamouraska did not hold an election.'}:{}),states,candidates:[...parties.values()],provinces});
 configs[order]={file:'elections/ridings-'+order+'.bin'};
 dated[year]={config:order};
}
assert.equal(elections.length,45);
assert.equal(Object.values(elections.at(-1).states).flatMap(r=>r.candidates).length,1959);
assert.deepEqual(Object.fromEntries(elections.at(-1).candidates.filter(p=>p.seats).map(p=>[p.name,p.seats])),{Liberal:169,Conservative:144,'Bloc Québécois':22,'New Democratic Party':7,'Green Party':1});
write('elections/federal.bin',{elections});
write('elections/boundaries.bin',{configs,elections:dated});

