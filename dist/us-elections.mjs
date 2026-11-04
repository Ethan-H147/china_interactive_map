// US presidential elections for the shared election view (elections.mjs): state-level results
// from 1788–89, shaded by the candidate who won each state's electors.

const PARTY_COLORS=[
 [/^(Republican|National Union)/,'#c43d3a'],[/^Democratic-Republican/,'#3a8f62'],[/Southern Democratic/,'#2e8a8c'],[/States.? Rights/,'#d29a2a'],
 [/^(Democratic|Northern Democratic|Liberal Republican)/,'#2f6db5'],[/^Federalist/,'#c47a2c'],[/^Whig/,'#cf9f2c'],[/^National Republican/,'#b5577a'],
 [/Anti-Masonic/,'#8462b0'],[/Nullifier/,'#5f9e96'],[/^American Independent/,'#d0912b'],[/^American/,'#9b6a43'],[/Constitutional Union/,'#d5813a'],
 [/^Populist/,'#5c9b3c'],[/^Progressive/,'#3f9a6a'],[/^Independent/,'#6d7c90'],[/Free Soil/,'#7a9a3c'],[/Socialist/,'#b04a6a'],[/Green/,'#4f9a4f'],
 [/Libertarian/,'#c9a227'],[/Reform/,'#8a6bb0']
];
// Years in which candidates of one party label opposed each other.
const CANDIDATE_COLORS={1824:{'Andrew Jackson':'#2f6db5','John Quincy Adams':'#b5577a','William H. Crawford':'#3a8f62','Henry Clay':'#cf9f2c'}};

export const usElections={
 label:'Presidential election',store:'atlas-election-year',units:['state','states'],
 datasets:[{id:'US',file:'elections/presidential.bin'}],
 partyColors:PARTY_COLORS,candidateColors:CANDIDATE_COLORS,
 missing(record,e,data){
  const admitted=data.admitted?.[record.id];
  return record.id==='US-DC'?'The District of Columbia has had electors since 1964.':admitted&&admitted>e.year?(ORIGINAL.has(record.id)?'Had not yet ratified the Constitution. Ratified in ':'Not yet a state. Admitted in ')+admitted+'.':'No electoral votes.';
 },
 // "Historic borders": the state and territory boundaries in force on each election day
 // (scripts/build-us-historic-borders.mjs).
 historic:{
  file:'history/borders.bin',sourceName:'Newberry Library, Atlas of Historical County Boundaries',source:'https://publications.newberry.org/ahcb/',
  outside:'Not part of the United States at the time.',
  describe(unit,kind,e,data){
   if(unit.type==='Disputed'||OTHER[unit.key])return describeShared(unit);
   if(kind==='no-votes')return usElections.missing({id:unit.state},e,data);
   return unit.type==='Territory'?'A territory, with no electoral votes.':'Unorganized territory, with no electoral votes.';
  }
 }
};
const ORIGINAL=new Set(['US-DE','US-PA','US-NJ','US-GA','US-CT','US-MA','US-MD','US-SC','US-NH','US-VA','US-NY','US-NC','US-RI']);
// Areas the source maps that were not territories of the United States alone.
const OTHER={
 tx_republic:{text:'An independent republic until annexation in 1845.'},
 vt_republic:{text:'A self-governing republic until it became a state in 1791.'},
 or_country:{text:'Claimed by both the United States and Britain.'},
 ub_area:{text:'The boundary with British North America here was not settled until 1818.'}
};
// Texts shared with the historical snapshot (us-history.mjs).
export const describeShared=unit=>unit.type==='Disputed'?'Claimed by both '+unit.claimants.map(the).join(' and ')+'.':OTHER[unit.key]?.text||unit.note||null;
const the=name=>/Territory$|Country$|Cession$|^Republic|^District/.test(name)?'the '+name:name;
