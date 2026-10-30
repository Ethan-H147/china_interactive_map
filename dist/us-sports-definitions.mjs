const mainland=[[-125,24],[-66,50]],season='2026';
const pack=(id,label,leagues,bounds=mainland)=>({id:'misc-'+id,label,plural:id==='soccer'?'Soccer clubs':label+' teams',singular:'team',title:label+' quiz',storageId:id,file:'data/quiz/us-'+id+'.json',sourcesFile:'data/quiz/us-'+id+'-sources.json',season,bounds,crests:true,groupLocations:true,findInstruction:"Click the team's home stadium on the map.",nameInstruction:'Name the teams. Short names and common abbreviations are accepted.',identifyInstruction:'Name a team that plays at the highlighted stadium.',coverageNote:'Dots mark current home stadiums, including temporary and shared grounds.',levels:leagues.map(([key,label,leagueName])=>({id:'misc-'+id+'-'+season+'-'+key,label,leagueName:leagueName||label}))});
export const usSportsQuizzes=[
 pack('college-football','College football',[['power-four','Power Four'],['fbs','All FBS','Other FBS programs']],[[-159,18],[-66,50]]),
 pack('baseball','Baseball',[['mlb','MLB']]),
 pack('soccer','Soccer clubs',[['tier1','MLS'],['tier2','MLS + USL Championship','USL Championship'],['tier3','All 3 leagues','USL League One']])
];
export const usSportsQuizForScope=scope=>usSportsQuizzes.find(pack=>pack.id===scope||pack.levels.some(level=>level.id===scope));