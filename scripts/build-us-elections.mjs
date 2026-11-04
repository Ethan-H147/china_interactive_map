// Builds dist/data/europe/united-states/elections/presidential.bin from the pinned
// Wikipedia articles retained by scripts/fetch-us-elections.mjs.
// Present-day state shapes are used for every year; the data only records which
// states took part, how their electors voted and, where held, the popular vote.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {readTables} from './election-tables.mjs';
import {electionYears,sourceFile} from './fetch-us-elections.mjs';

const root=new URL('../',import.meta.url),out=new URL('dist/data/europe/united-states/elections/',root);
const manifest=JSON.parse(readFileSync(new URL('scripts/us-election-sources.json',root),'utf8'));
const STATES={Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Connecticut:'CT',Delaware:'DE','District of Columbia':'DC',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY'};
const POSTAL=new Set(Object.values(STATES)),ADMITTED={DE:1787,PA:1787,NJ:1787,GA:1788,CT:1788,MA:1788,MD:1788,SC:1788,NH:1788,VA:1788,NY:1788,NC:1789,RI:1790,VT:1791,KY:1792,TN:1796,OH:1803,LA:1812,IN:1816,MS:1817,IL:1818,AL:1819,ME:1820,MO:1821,AR:1836,MI:1837,FL:1845,TX:1845,IA:1846,WI:1848,CA:1850,MN:1858,OR:1859,KS:1861,WV:1863,NV:1864,NE:1867,CO:1876,ND:1889,SD:1889,MT:1889,WA:1889,ID:1890,WY:1890,UT:1896,OK:1907,NM:1912,AZ:1912,AK:1959,HI:1959,DC:1961};

// Electoral votes that the state tables do not attribute: faithless and substitute electors,
// and votes Congress did not count. Each sums to the official national tallies.
const CORRECTIONS={
 1820:{NH:{electors:{'James Monroe':7,'John Quincy Adams':1},note:'One elector voted for John Quincy Adams.'}},
 1864:{LA:{electors:{},note:'Electoral votes were not counted by Congress.'},TN:{electors:{},note:'Electoral votes were not counted by Congress.'}},
 1872:{AR:{electors:{},note:'Electoral votes were rejected by Congress.'},LA:{electors:{},note:'Electoral votes were rejected by Congress.'},
  GA:{electors:{'Horace Greeley':3,'Benjamin Gratz Brown':6,'Charles J. Jenkins':2},note:'Greeley died before the electors met; his three votes here were not counted.',popularColor:true},
  KY:{electors:{'Thomas A. Hendricks':8,'Benjamin Gratz Brown':4},note:'Greeley died before the electors met.',popularColor:true},
  MD:{electors:{'Thomas A. Hendricks':8},note:'Greeley died before the electors met.',popularColor:true},
  MO:{electors:{'Thomas A. Hendricks':6,'Benjamin Gratz Brown':8,'David Davis':1},note:'Greeley died before the electors met.',popularColor:true},
  TN:{electors:{'Thomas A. Hendricks':12},note:'Greeley died before the electors met.',popularColor:true},
  TX:{electors:{'Thomas A. Hendricks':8},note:'Greeley died before the electors met.',popularColor:true}},
 1956:{AL:{electors:{'Adlai Stevenson II':10,'Walter Burgwyn Jones':1},note:'One elector voted for Walter B. Jones.'}},
 1960:{AL:{electors:{'John F. Kennedy':5,'Harry F. Byrd':6},note:'Six unpledged electors voted for Harry F. Byrd.'},MS:{electors:{'Harry F. Byrd':8},note:'Unpledged electors won the state and voted for Harry F. Byrd.'},OK:{electors:{'Richard Nixon':7,'Harry F. Byrd':1},note:'One elector voted for Harry F. Byrd.'}},
 1976:{WA:{electors:{'Gerald Ford':8,'Ronald Reagan':1},note:'One elector voted for Ronald Reagan.'}},
 1988:{WV:{electors:{'Michael Dukakis':5,'Lloyd Bentsen':1},note:'One elector voted for Lloyd Bentsen for president.'}},
 2000:{DC:{electors:{'Al Gore':2},note:'One elector cast a blank ballot in protest.'}},
 2004:{MN:{electors:{'John Kerry':9,'John Edwards':1},note:'One elector voted for John Edwards for president.'}},
 2016:{HI:{electors:{'Hillary Clinton':3,'Bernie Sanders':1},note:'One elector voted for Bernie Sanders.'},TX:{electors:{'Donald Trump':36,'John Kasich':1,'Ron Paul':1},note:'Two electors voted for John Kasich and Ron Paul.'},WA:{electors:{'Hillary Clinton':8,'Colin Luther Powell':3,'Faith Spotted Eagle':1},note:'Four electors voted for Colin Powell and Faith Spotted Eagle.'}}
};
// Context shown with the year; contingent elections and Reconstruction explain the map.
const NOTES={
 1789:'Each elector cast two votes. No popular vote was held in most states; New York chose no electors, and North Carolina and Rhode Island had not yet ratified the Constitution.',
 1792:'Each elector cast two votes; Washington was elected unanimously again.',
 1796:'Each elector cast two votes. Adams became president and Jefferson, the runner-up, vice president.',
 1800:'Each elector cast two votes. Jefferson and Burr tied at 73, and the House of Representatives elected Jefferson on the 36th ballot.',
 1824:'No candidate won an electoral majority. The House of Representatives elected John Quincy Adams.',
 1836:'Virginia\'s electors refused to vote for Richard M. Johnson, so the Senate elected him vice president.',
 1864:'The eleven Confederate states did not take part.',
 1868:'Mississippi, Texas and Virginia had not been readmitted to the Union and did not vote.',
 1872:'Horace Greeley died after the popular vote; his electors divided their votes among other Democrats.',
 1876:'Disputed returns in Florida, Louisiana and South Carolina were settled by an Electoral Commission, awarding all 20 contested votes to Hayes.',
 1888:'Cleveland won the popular vote but lost the electoral vote.',
 1960:'Fifteen electors from Alabama, Mississippi and Oklahoma voted for Harry F. Byrd.',
 2000:'Bush won Florida by 537 votes after the Supreme Court ended the recount in Bush v. Gore, and lost the national popular vote.',
 2016:'Seven electors voted for other candidates, the most since 1872. Trump won the electoral vote while losing the popular vote.'
};

const num=text=>{if(text==null)return null;const t=String(text).replace(/\([^)]*\)/g,'').replace(/[−–]/g,'-').trim();if(!/\d/.test(t)||/^[-–—]+$/.test(t))return null;const n=Number(t.replace(/[^\d.\-]/g,''));return Number.isFinite(n)?n:null;};
const strip=name=>name.replace(/\((?:incumbent|[a-z])\)/gi,'').replace(/\s+/g,' ').trim();
const surname=name=>strip(name).replace(/,? Jr\.?$/,'').split(' ').pop();

function stateKey(raw){
 const text=raw.replace(/[†*‡§]/g,'').replace(/\s*\(.*?\)\s*/g,' ').trim();
 if(/^D\. ?C\.$/.test(text))return {state:'DC'};
 if(STATES[text])return {state:STATES[text]};
 let m=/^([A-Z]{2})-(\d+)$/.exec(text);if(m&&POSTAL.has(m[1]))return {state:m[1],district:m[2]};
 m=/^(.+?)(?:[–-]|'s | CD-? ?)(.+)$/.exec(text);
 if(m&&STATES[m[1].trim()])return {state:STATES[m[1].trim()],district:m[2].replace(/(st|nd|rd|th)$/,'').trim()};
 return null;
}

function infobox(tables){
 const box=tables.find(t=>/infobox/.test(t.class)&&/vevent/.test(t.class)),rows=box?.grid||[];
 const text=rows.map(r=>r[0]).join('\n'),turnout=rows.find(r=>r[0]==='Turnout')?.[1];
 const date=(rows[1]?.[0]||'').replace(/^←\s*\S+\s*/,'').replace(/\s*\d{4}\s*→$/,'').trim();
 const electors=/(\d+) (?:members|electoral votes of)/.exec(text),needed=/(\d+) electoral votes needed/.exec(text);
 return {date:/\d{4}$/.test(date)?date:null,turnout:turnout?num(turnout.split('%')[0]):null,electors:electors?+electors[1]:null,needed:needed?+needed[1]:null};
}

function nationalCandidates(tables){
 const table=tables.find(t=>/wikitable/.test(t.class)&&/Presidential candidate/.test(t.grid[0]?.[0]||'')&&t.grid[1]?.includes('Count'));
 const head=table.grid[1].map(h=>h.toLowerCase()),top=table.grid[0].map(h=>h.toLowerCase());
 const col=(test,from=0)=>head.findIndex((h,i)=>i>=from&&test(h,top[i]));
 const name=0,party=col(h=>h==='party'),home=col(h=>h==='home state'),count=col(h=>h==='count'),pct=col(h=>h==='percentage'),ev=col((h,t)=>/electoral vote/.test(h)&&!/running/.test(t));
 const vp=col(h=>/vice-presidential/.test(h)),vpEv=vp<0?-1:col(h=>/electoral vote/.test(h),vp+1);
 const list=[];
 for(const row of table.grid.slice(2)){
  if(/^(Total|Needed|Source|Notes?)/i.test(row[0])||!row[0])continue;
  const candidateName=strip(row[name]);if(!candidateName||/^\(/.test(candidateName)||/^Other/i.test(candidateName)&&num(row[ev])===0&&!num(row[count]))continue;
  let entry=list.find(c=>c.name===candidateName&&c.party===(row[party]||'').replace(/\s*\(.*\)$/,''));
  if(!entry){entry={name:candidateName,party:(row[party]||'').replace(/\s*\(.*\)$/,''),home:row[home]||null,popular:num(row[count]),percent:num(row[pct]),electoral:num(row[ev])||0,runningMates:[]};list.push(entry);}
  else if(num(row[count])&&row[count]!==list.find(c=>c===entry).popularText){/* a second running-mate row repeats the same vote */}
  entry.popularText??=row[count];
  if(vp>=0&&row[vp]&&!/^[-–—]$/.test(row[vp]))entry.runningMates.push({name:strip(row[vp]),home:row[vp+1]||null,electoral:num(row[vpEv])||0});
 }
 for(const c of list)delete c.popularText;
 // 1804: the Federalist popular vote is listed under "Unpledged electors" while Pinckney has the electors.
 const slate=list.find(c=>/^Unpledged electors$/i.test(c.name)&&!c.electoral),nominee=slate&&list.find(c=>c!==slate&&c.party===slate.party&&c.electoral&&c.popular==null);
 if(nominee){Object.assign(nominee,{popular:slate.popular,percent:slate.percent,note:'Popular vote cast for '+slate.party+' electors'});list.splice(list.indexOf(slate),1);}
 return list;
}

// Matches a state-table column group ("Abraham Lincoln Republican", "Trump/Vance Republican",
// "Unpledged electors Federalist") to a national candidate by surname, then by party.
function matchCandidate(label,candidates){
 const text=label.replace(/\s*\(.*?\)\s*/g,' ');
 const byName=candidates.filter(c=>new RegExp('\\b'+surname(c.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(text));
 if(byName.length===1)return byName[0];
 if(byName.length>1){const first=byName.find(c=>text.includes(strip(c.name).split(' ')[0]));if(first)return first;}
 // Unpledged slates (1960 Mississippi and Alabama) voted for the party's minor elector recipient.
 const unpledged=/unpledged/i.test(text);
 const byParty=candidates.filter(c=>c.party&&text.includes(c.party)&&(!unpledged||c.electoral>0)).sort((a,b)=>unpledged?a.electoral-b.electoral:b.electoral-a.electoral);
 return byParty[0]||null;
}

function headerRows(grid){let n=0;while(n<grid.length&&!stateKey(grid[n][0]||''))n++;return grid.slice(0,n);}

// Popular-vote style tables: column groups per candidate with #, % and electoral-vote columns.
function readGroupTable(table,candidates){
 const heads=headerRows(table.grid);if(heads.length<1)return null;
 const top=heads[Math.max(0,heads.length-2)],sub=heads[heads.length-1],columns=[];
 for(let i=1;i<sub.length;i++){
  const group=(top[i]||'').trim(),label=(sub[i]||'').toLowerCase().trim();
  const kind=/^(#|votes?(?: cast)?|no\.|count)$/.test(label)?'votes':label==='%'?'percent':/^(e|e\.?v\.?|electoral votes?|electors)$/.test(label)?'electoral':null;
  if(!kind)continue;
  if(group===sub[i]||/^(electoral votes?|e\.?v\.?|electors)$/i.test(group)||!group){if(kind==='electoral'&&!columns.some(c=>c.group==='state'))columns.push({i,group:'state',kind});continue;}
  // The article's own margin (winner over runner-up, "Other" fusion tickets included).
  if(/^margin$/i.test(group)&&kind==='percent'){columns.push({i,group:'margin',kind});continue;}
  if(/\b(margin|totals?|citation|ref|not cast|swing)\b/i.test(group))continue;
  const other=/^others?$/i.test(group),candidate=other?null:matchCandidate(group,candidates);
  if(!candidate&&!other)continue;
  columns.push({i,group:other?'other':candidate.name,kind});
 }
 if(!columns.some(c=>c.group!=='state'))return null;
 const rows=[];
 for(const row of table.grid.slice(heads.length)){
  const key=stateKey(row[0]||'');if(!key)continue;
  const result={...key,electoral:null,votes:{},electors:{},noPopular:false};
  for(const c of columns){const raw=row[c.i]||'',value=num(raw);
   if(/no popular|no ballots|legislature|\*/i.test(raw)&&c.kind==='votes')result.noPopular=true;
   if(c.group==='state'){result.electoral=value;continue;}
   if(c.group==='margin'){if(value!=null)result.margin=Math.abs(value);continue;}
   if(value==null)continue;
   if(c.kind==='votes')result.votes[c.group]=(result.votes[c.group]||0)+value;
   if(c.kind==='electoral'&&value)result.electors[c.group]=(result.electors[c.group]||0)+value;
  }
  const total=num(row[row.length-1])&&/total/i.test(top[top.length-1]||sub[sub.length-1]||'')?null:null;void total;
  rows.push(result);
 }
 return rows;
}

// Electoral-vote tables headed by candidate initials (GW, JAd, CCP); only "For President" columns.
function readInitialTable(table,candidates){
 const heads=headerRows(table.grid);if(!heads.length)return null;
 const sub=heads[heads.length-1],top=heads[0],columns=[];
 for(let i=1;i<sub.length;i++){
  const code=sub[i]||'';if(!/^[A-Z][A-Za-z]{0,3}$/.test(code)||code==='B'||code==='EV'||code==='E')continue;
  if(/vice/i.test(top[i]||''))continue;
  const candidate=candidates.find(c=>{const words=strip(c.name).replace(/,? Jr\.?$/,'').split(' '),last=words[words.length-1],initials=words.map(w=>w[0]).join('');return code===initials||code===words[0][0]+last[0]||code.length>2&&code[0]===words[0][0]&&last.startsWith(code.slice(1));});
  if(candidate)columns.push({i,group:candidate.name});
 }
 const evColumn=sub.findIndex((h,i)=>i>0&&/^(electors|e|electoral votes?)$/i.test(h));
 if(columns.length<1)return null;
 const rows=[];
 for(const row of table.grid.slice(heads.length)){
  const key=stateKey((row[0]||'').replace(/\s*\(.*\)$/,''));if(!key)continue;
  const electors={};for(const c of columns){const v=num(row[c.i]);if(v)electors[c.group]=(electors[c.group]||0)+v;}
  rows.push({...key,electoral:num(row[evColumn]),electors});
 }
 return rows;
}

function stateTables(tables){return tables.filter(t=>/wikitable/.test(t.class)&&t.grid.length>8&&t.grid.slice(0,3).some(r=>/^State/i.test(r[0]||''))&&!/forecast|faithless/i.test(t.heading));}

function build(year){
 const html=gunzipSync(readFileSync(sourceFile(year))).toString(),tables=readTables(html),info=infobox(tables),candidates=nationalCandidates(tables);
 const group=[],initial=[];
 for(const t of stateTables(tables)){const g=readGroupTable(t,candidates);if(g?.length&&Object.values(g).some(r=>Object.keys(r.votes).length||Object.keys(r.electors).length))group.push(g);else{const i=readInitialTable(t,candidates);if(i?.length)initial.push(i);}}
 // Combine rows into states; district rows are kept and fill in a state without a statewide row.
 const states={};
 const entry=postal=>states[postal]??={electoral:null,votes:{},electors:{},districts:[],noPopular:false};
 for(const rows of group)for(const r of rows){
  const s=entry(r.state);
  if(r.district){s.districts.push({district:r.district,votes:r.votes,electors:r.electors,electoral:r.electoral});continue;}
  if(r.electoral!=null)s.electoral??=r.electoral;
  for(const [k,v] of Object.entries(r.votes))s.votes[k]??=v;
  for(const [k,v] of Object.entries(r.electors))s.electors[k]??=v;
  if(r.margin!=null)s.margin??=r.margin;
  if(r.noPopular&&!Object.keys(r.votes).length)s.noPopular=true;
 }
 // Initial-letter tables carry the authoritative presidential electoral vote where present.
 for(const rows of initial)for(const r of rows){if(r.district)continue;const s=entry(r.state);if(r.electoral!=null)s.electoral=r.electoral;if(Object.keys(r.electors).length)s.electors=r.electors;}
 for(const [postal,s] of Object.entries(states)){
  if(!Object.keys(s.votes).length&&s.districts.length){for(const d of s.districts)for(const [k,v] of Object.entries(d.votes))s.votes[k]=(s.votes[k]||0)+v;}
  // At-large rows of Maine and Nebraska carry only their statewide electors; add the districts'.
  const districtElectors=s.districts.reduce((sum,d)=>sum+Object.values(d.electors).reduce((a,b)=>a+b,0),0);
  // A statewide row holding only the two at-large electors is completed by its districts.
  const statewide=Object.values(s.electors).reduce((a,b)=>a+b,0);
  if(districtElectors&&statewide<=2){for(const d of s.districts)for(const [k,v] of Object.entries(d.electors))s.electors[k]=(s.electors[k]||0)+v;if(s.electoral!=null&&s.electoral<statewide+districtElectors)s.electoral=statewide+districtElectors;}
  if(s.electoral==null){const sum=Object.values(s.electors).reduce((a,b)=>a+b,0);if(sum)s.electoral=sum;}
 }
 return {info,candidates,states};
}

const elections=[];
for(const year of electionYears){
 const {info,candidates:all,states}=build(year),results={};
 // Minor candidates without electors are folded into "other" in each state.
 const candidates=all.filter(c=>c.electoral>0||(c.percent||0)>=0.5&&!/^(Other|Others)$/i.test(c.name));
 const names=new Set(candidates.map(c=>c.name));
 for(const s of Object.values(states))for(const target of [s,...s.districts])for(const [k,v] of Object.entries(target.votes))if(k!=='other'&&!names.has(k)){target.votes.other=(target.votes.other||0)+v;delete target.votes[k];}
 for(const [postal,fix] of Object.entries(CORRECTIONS[year]||{})){
  for(const name of Object.keys(fix.electors))if(!names.has(name))throw Error(year+' '+postal+': unknown candidate '+name);
  if(!states[postal])throw Error(year+' '+postal+': no state row to correct');
  Object.assign(states[postal],{electors:fix.electors,note:fix.note,popularColor:!!fix.popularColor});
 }
 for(const [postal,s] of Object.entries(states)){
  const votes=Object.fromEntries(Object.entries(s.votes).filter(([k,v])=>v>0&&(names.has(k)||k==='other')));
  const electors=Object.fromEntries(Object.entries(s.electors).filter(([k,v])=>v>0&&names.has(k)));
  const total=Object.values(votes).reduce((a,b)=>a+b,0),cast=Object.values(electors).reduce((a,b)=>a+b,0)/(year<=1800?2:1);
  if(!s.note&&cast&&s.electoral>cast)s.note=s.electoral-cast===1?'One elector did not vote.':(s.electoral-cast)+' electors did not vote.';
  const ranked=Object.entries(votes).filter(([k])=>k!=='other').sort((a,b)=>b[1]-a[1]);
  const evRanked=Object.entries(electors).sort((a,b)=>b[1]-a[1]),tie=evRanked.length>1&&evRanked[0][1]===evRanked[1][1];
  const evWinner=tie&&ranked[0]&&electors[ranked[0][0]]?ranked[0][0]:evRanked[0]?.[0]||null;
  const winner=(s.popularColor?ranked[0]?.[0]:evWinner)||ranked[0]?.[0]||null;
  if(!winner&&!total)continue;
  results['US-'+postal]={electoral:s.electoral,electors,votes,total:total||null,winner,popularWinner:ranked[0]?.[0]||null,margin:s.margin!=null&&total?s.margin:ranked.length>1&&total?(ranked[0][1]-ranked[1][1])/total*100:ranked.length===1&&total?ranked[0][1]/total*100:null,...(s.districts.length?{districts:s.districts.map(d=>({district:d.district,electors:Object.fromEntries(Object.entries(d.electors).filter(([k])=>names.has(k))),votes:Object.fromEntries(Object.entries(d.votes).filter(([k])=>names.has(k)||k==='other'))}))}:{}),...(!total?{method:'Legislature or no popular vote'}:{}),...(s.note?{note:s.note}:{})};
 }
 const admitted=Object.entries(ADMITTED).filter(([,y])=>y<=year).map(([p])=>'US-'+p);
 elections.push({year,...info,...(year<=1800?{dualVote:true}:{}),...(NOTES[year]?{note:NOTES[year]}:{}),source:manifest.files[year]?.url,candidates,states:results,notVoting:admitted.filter(id=>!results[id]&&!(id==='US-DC'&&year<1964))});
}

mkdirSync(out,{recursive:true});
const json=JSON.stringify({generated:'Wikipedia election articles, pinned revisions',license:'CC BY-SA 4.0',sources:'sources.json',admitted:Object.fromEntries(Object.entries(ADMITTED).map(([p,y])=>['US-'+p,y])),elections});
writeFileSync(new URL('presidential.bin',out),gzipSync(json,{level:9}));
writeFileSync(new URL('sources.json',out),JSON.stringify({title:'US presidential elections, 1788–89 to 2024',method:'State and national results are read from the Results tables of each election article at the pinned revision. Present-day state shapes are drawn for every year; states not yet admitted are not shown as voting.',license:manifest.license,provider:manifest.provider,retrieved:manifest.retrieved,articles:manifest.files},null,1)+'\n');
console.log('US elections: '+elections.length+' elections, '+(json.length/1024|0)+' KB JSON.');
