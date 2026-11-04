// Builds dist/data/korea/elections/{south,north}.bin for the shared election view (dist/elections.mjs)
// from the retained sources in scripts/boundary-sources/korea/elections/:
// nec-presidential.json, the National Election Commission's province tables for every direct
// presidential election since 1987, and north-korea-official.json, the officially reported
// national figures for North Korean elections.
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';

const root=new URL('../',import.meta.url),sources=new URL('scripts/boundary-sources/korea/elections/',root),out=new URL('dist/data/korea/elections/',root);
const read=name=>{const text=readFileSync(new URL(name,sources),'utf8');return {json:JSON.parse(text),sha256:createHash('sha256').update(text).digest('hex')};};
const nec=read('nec-presidential.json'),north=read('north-korea-official.json');

// NEC province names, in every spelling the tables use, and the present-day unit drawn for them.
// Gwangju (KR-29, its code before the merger) and South Jeolla voted separately in every election
// here; the map draws both as Jeonnam–Gwangju (KR-12), so Gwangju is outlined from its districts.
const PROVINCES={서울:'KR-11',부산:'KR-26',대구:'KR-27',인천:'KR-28',광주:'KR-29',대전:'KR-30',울산:'KR-31',세종:'KR-36',경기:'KR-41',강원:'KR-51',충북:'KR-43',충남:'KR-44',전북:'KR-52',전남:'KR-12',경북:'KR-47',경남:'KR-48',제주:'KR-50'};
const LONG={충청북:'충북',충청남:'충남',전라북:'전북',전라남:'전남',경상북:'경북',경상남:'경남'};
const provinceKey=name=>{const stem=name.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/,'');return LONG[stem]||stem;};
// Present-day units created after an election: their area voted within these divisions.
const PRECURSORS={'KR-30':{before:1989,unit:'KR-44',name:'South Chungcheong',text:'Daejeon was part of South Chungcheong until 1989'},'KR-31':{before:1997,unit:'KR-48',name:'South Gyeongsang',text:'Ulsan was part of South Gyeongsang until 1997'},'KR-36':{before:2012,unit:'KR-44',name:'South Chungcheong',text:'Sejong was formed in 2012, mostly from South Chungcheong (Yeongi County and part of Gongju) with a small part of North Chungcheong'}};

// Parties: English name, and the colour Korean media use today for the party or its lineage.
// The conservative party (now People Power, red) and the Democratic Party (blue) keep one colour
// across their predecessors so the timeline reads consistently. Others take the default palette.
const CONSERVATIVE='#e3242b',DEMOCRATIC='#1f5bb5';
const PARTIES={
 민주정의당:['Democratic Justice Party',CONSERVATIVE],통일민주당:['Reunification Democratic Party'],평화민주당:['Peace Democratic Party',DEMOCRATIC],신민주공화당:['New Democratic Republican Party'],
 민주자유당:['Democratic Liberal Party',CONSERVATIVE],'1992 민주당':['Democratic Party',DEMOCRATIC],통일국민당:['Unification National Party'],
 한나라당:['Grand National Party',CONSERVATIVE],새정치국민회의:['National Congress for New Politics',DEMOCRATIC],국민신당:['New Party by the People'],건설국민승리21:['People’s Victory 21'],
 새천년민주당:['Millennium Democratic Party',DEMOCRATIC],민주노동당:['Democratic Labor Party','#f58220'],사회당:['Socialist Party'],
 대통합민주신당:['United New Democratic Party',DEMOCRATIC],'2007 민주당':['Democratic Party'],창조한국당:['Creative Korea Party'],한국사회당:['Korea Socialist Party'],
 '2012 새누리당':['Saenuri Party',CONSERVATIVE],민주통합당:['Democratic United Party',DEMOCRATIC],
 더불어민주당:['Democratic Party of Korea',DEMOCRATIC],자유한국당:['Liberty Korea Party',CONSERVATIVE],국민의당:['People’s Party','#0b8f4f'],바른정당:['Bareun Party','#00a6d6'],정의당:['Justice Party','#f2c200'],
 국민의힘:['People Power Party',CONSERVATIVE],기본소득당:['Basic Income Party'],국가혁명당:['National Revolutionary Party'],노동당:['Labor Party'],우리공화당:['Our Republican Party'],진보당:['Progressive Party'],
 개혁신당:['Reform Party','#ff7210'],'2025 민주노동당':['Democratic Labor Party','#f2c200'],무소속:['Independent']
};
const NAMES={노태우:'Roh Tae-woo',김영삼:'Kim Young-sam',김대중:'Kim Dae-jung',김종필:'Kim Jong-pil',신정일:'Shin Jeong-il',정주영:'Chung Ju-yung',박찬종:'Park Chan-jong',이병호:'Lee Byung-ho',김옥선:'Kim Ok-sun',백기완:'Baek Ki-wan',
 이회창:'Lee Hoi-chang',이인제:'Rhee In-je',권영길:'Kwon Young-ghil',허경영:'Huh Kyung-young',김한식:'Kim Han-sik',노무현:'Roh Moo-hyun',이한동:'Lee Han-dong',김영규:'Kim Young-kyu',김길수:'Kim Gil-su',
 정동영:'Chung Dong-young',이명박:'Lee Myung-bak',문국현:'Moon Kook-hyun',정근모:'Chung Kun-mo',전관:'Jeon Gwan',금민:'Geum Min',박근혜:'Park Geun-hye',문재인:'Moon Jae-in',박종선:'Park Jong-sun',김소연:'Kim So-yeon',강지원:'Kang Ji-won',김순자:'Kim Soon-ja',
 홍준표:'Hong Joon-pyo',안철수:'Ahn Cheol-soo',유승민:'Yoo Seong-min',심상정:'Sim Sang-jung',조원진:'Cho Won-jin',오영국:'Oh Young-guk',장성민:'Chang Sung-min',이재오:'Lee Jae-oh',김선동:'Kim Seon-dong',이경희:'Lee Kyung-hee',윤홍식:'Yoon Hong-sik',김민찬:'Kim Min-chan',
 이재명:'Lee Jae-myung',윤석열:'Yoon Suk Yeol',오준호:'Oh Jun-ho',이백윤:'Lee Baek-yun',옥은호:'Ok Eun-ho',김경재:'Kim Kyung-jae',김재연:'Kim Jae-yeon',김문수:'Kim Moon-soo',이준석:'Lee Jun-seok',권영국:'Kwon Young-kook',송진호:'Song Jin-ho'};
const NOTES={1987:'The first direct presidential election since 1971, under the constitution of October 1987.',2017:'Held early, after the impeachment and removal of Park Geun-hye.',2025:'Held early, after the impeachment and removal of Yoon Suk Yeol.'};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const round=(n,d=2)=>Math.round(n*10**d)/10**d;
// The NEC truncates vote shares to two decimals.
const truncate=n=>Math.floor(n*100+1e-9)/100;

function candidate(label,year){
 const name=Object.keys(NAMES).sort((a,b)=>b.length-a.length).find(n=>label.endsWith(n)&&label.length>n.length);if(!name)throw Error(year+': unknown candidate '+label);
 const partyKo=label.slice(0,-name.length),party=PARTIES[year+' '+partyKo]||PARTIES[partyKo];
 // Party names the NEC table uses without a standard English form stay in Korean.
 return {name:NAMES[name],local:name,partyKo,party:party?.[0]||partyKo,...(party?.[1]?{color:party[1]}:{})};
}
function result(cells,names){
 const votes=Object.fromEntries(names.map((n,i)=>[n,cells[2+i]])),valid=cells[2+names.length];
 const ranked=Object.entries(votes).sort((a,b)=>b[1]-a[1]);
 return {registered:cells[0],ballots:cells[1],total:valid,invalid:cells[3+names.length],votes,winner:ranked[0][0],margin:round((ranked[0][1]-ranked[1][1])/valid*100),turnout:round(cells[1]/cells[0]*100)};
}

// Gwangju's five districts on the Korea map: their polygons fill Gwangju, and the edges no two of
// them share form its outline.
const GWANGJU=['KR-12210','KR-12240','KR-12270','KR-12300','KR-12330'];
function gwangjuUnit(){
 const boundaries=new URL('dist/data/korea-boundaries.bin',root),bytes=readFileSync(boundaries);
 const districts=JSON.parse(gunzipSync(bytes)).second.features.filter(f=>GWANGJU.includes(f.properties.id));
 if(districts.length!==GWANGJU.length)throw Error('Gwangju districts missing from korea-boundaries.bin');
 const polygons=districts.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates),edges=new Map();
 for(const ring of polygons.flat())for(let i=1;i<ring.length;i++){const a=String(ring[i-1]),b=String(ring[i]),key=a<b?a+'|'+b:b+'|'+a;edges.set(key,edges.has(key)?null:[ring[i-1],ring[i]]);}
 const outer=[...edges.values()].filter(Boolean),from=new Map();for(const s of outer){const k=String(s[0]);if(!from.has(k))from.set(k,[]);from.get(k).push(s);}
 const used=new Set(),lines=[];
 for(const s of outer){if(used.has(s))continue;used.add(s);const line=[...s];for(let next;(next=(from.get(String(line.at(-1)))||[]).find(t=>!used.has(t)));){used.add(next);line.push(next[1]);}lines.push(line);}
 return {sha256:createHash('sha256').update(bytes).digest('hex'),units:{type:'FeatureCollection',features:[
  {type:'Feature',properties:{id:'KR-29'},geometry:{type:'MultiPolygon',coordinates:polygons}},
  {type:'Feature',properties:{id:'KR-29',outline:true},geometry:{type:'MultiLineString',coordinates:lines}}]}};
}
const gwangju=gwangjuUnit();

const south=[];
for(const [code,table] of Object.entries(nec.json.elections)){
 const year=+code.slice(0,4),date=MONTHS[+code.slice(4,6)-1]+' '+(+code.slice(6))+', '+year;
 const labels=table.candidates.filter(c=>c!=='계'),candidates=labels.map(l=>candidate(l,year)),names=candidates.map(c=>c.name);
 for(const row of table.rows)if(row.length!==names.length+6)throw Error(year+': '+row[0]+' has '+row.length+' cells');
 const [national,...provinces]=table.rows.map(([name,...cells])=>({name,cells}));
 if(national.name!=='합계')throw Error(year+': first row is not the national total');
 const raw=new Map();
 for(const {name,cells} of provinces){const key=provinceKey(name),id=PROVINCES[key];if(!id)throw Error(year+': unknown province '+name);raw.set(key,result(cells,names));}
 const states={};
 for(const [key,r] of raw)states[PROVINCES[key]]=r;
 Object.assign(states['KR-12'],{name:'South Jeolla'});Object.assign(states['KR-29'],{name:'Gwangju',within:'KR-12'});
 for(const [id,{before,unit,name,text}] of Object.entries(PRECURSORS))if(year<before){
  if(states[id])throw Error(year+': '+id+' has its own result before '+before);
  states[id]={...states[unit],partOf:unit,note:text+'; the result of '+name+' is shown.'};
 }
 const totals=result(national.cells,names);
 south.push({year,date,title:year+' presidential election',...(NOTES[year]?{note:NOTES[year]}:{}),registered:totals.registered,turnout:round(totals.turnout,1),
  source:nec.json.url.replace('{statementId}',table.statementId).replace('{old}',table.old).replace('{election}',code),
  candidates:candidates.map(c=>({...c,popular:totals.votes[c.name],percent:truncate(totals.votes[c.name]/totals.total*100)})),states});
}

// Every North Korean province is given the national figure: no provincial breakdown is published.
const PROVINCES_NORTH=['KP-356443','KP-6648083','KP-5453650','KP-5455268','KP-356419','KP-356540','KP-356392','KP-356379','KP-356386','KP-3781418','KP-356533','KP-356442','KP-356535'];
const FRONT='Democratic Front for the Reunification of Korea';
const northElections=north.json.elections.map(e=>{
 const against=e.against||0,shares={[FRONT]:e.for,...(against?{Against:against}:{})};
 const candidates=[{name:FRONT,short:'DFRK',party:'Single approved list',color:'#c3283a',percent:e.for},...(against?[{name:'Against',short:'Against',party:'Votes against the candidates',color:'#8c877d',percent:against}]:[])];
 const states=Object.fromEntries(PROVINCES_NORTH.map(id=>[id,{winner:FRONT,shares,margin:round(e.for-against),turnout:e.turnout,note:'Provincial figures are not published; the national figure is shown.'}]));
 return {year:e.year,date:e.date,title:e.title,note:e.note,seats:e.seats,turnout:e.turnout,uniform:true,source:e.source,sourceName:e.sourceName,candidates,states};
});

mkdirSync(out,{recursive:true});
const write=(file,value)=>writeFileSync(new URL(file,out),gzipSync(JSON.stringify(value),{level:9}));
write('south.bin',{generated:'National Election Commission province tables',sourceName:'National Election Commission',sources:'sources.json',units:gwangju.units,elections:south});
write('north.bin',{generated:'Officially reported national figures',sourceName:'KCNA',sources:'sources.json',elections:northElections});
writeFileSync(new URL('sources.json',out),JSON.stringify({title:'Korean elections: South Korean presidential elections since 1987 and North Korean official returns',
 south:{provider:nec.json.source,retrieved:nec.json.retrieved,file:'scripts/boundary-sources/korea/elections/nec-presidential.json',sha256:nec.sha256,gwangjuGeometry:{file:'dist/data/korea-boundaries.bin',sha256:gwangju.sha256,districts:GWANGJU},method:'Province rows of each NEC count table. Shares are of valid votes; turnout is ballots cast over registered voters. Gwangju and South Jeolla, which voted separately, are shown separately within Jeonnam–Gwangju; Gwangju is drawn from its five districts in dist/data/korea-boundaries.bin. Daejeon (1987), Ulsan (1987, 1992) and Sejong (before 2012) show the division their area voted in.'},
 north:{provider:'KCNA and Central Election Committee returns, as cited per election',retrieved:north.json.retrieved,file:'scripts/boundary-sources/korea/elections/north-korea-official.json',sha256:north.sha256,method:north.json.note,elections:north.json.elections.map(({year,source,sourceName,kcna})=>({year,source,sourceName,...(kcna?{kcna}:{})}))}},null,1)+'\n');
console.log('Korea elections: '+south.length+' South Korean and '+northElections.length+' North Korean elections written.');
